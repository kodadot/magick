import { CollectionEntity, Emote, FailedEntity, NFTChild, NFTEntity, RemarkEntity, Resource } from "../types";
import { SubstrateExtrinsic } from "@subql/types";
import { getRemarksFrom, RemarkResult } from './utils';
import { Collection, eventFrom, getNftId, NFT, RmrkAcceptInteraction, RmrkAcceptType, RmrkEvent, RmrkInteraction, RmrkSendInteraction, RmrkSpecVersion } from './utils/types';
import NFTUtils, { hexToString } from './utils/NftUtils';
import { canOrElseError, exists, hasMeta, isBurned, isBuyLegalOrElseError, isOwner, isOwnerOrElseError, isPositiveOrElseError, isTransferable, validateInteraction } from './utils/consolidator'
import { randomBytes } from 'crypto'
import { emoteId, ensureInteraction } from './utils/helper';

async function collection_V1(remark: RemarkResult) {
  let collection = null
  try {
    collection = NFTUtils.unwrap(remark.value) as Collection
    canOrElseError<string>(exists, collection.id, true)
    const entity = await CollectionEntity.get(collection.id)
    canOrElseError<CollectionEntity>(exists, entity)
    const final = CollectionEntity.create(collection)

    final.name = collection.name.trim()
    final.max = Number(collection.max)
    final.issuer = remark.caller
    final.currentOwner = remark.caller
    final.symbol = collection.symbol.trim()
    final.blockNumber = BigInt(remark.blockNumber)
    final.metadata = collection.metadata
    final.events = [eventFrom(RmrkEvent.MINT, remark, '')]

    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save()
  } catch (e) {
    logger.error(`[COLLECTION] ${e.message}, ${JSON.stringify(collection)}`)
    await logFail(JSON.stringify(collection), e.message, RmrkEvent.MINT)
  }

}
async function collection_V2(remark: RemarkResult) {
  collection_V1(remark);
}


async function mintNFT_V1(remark: RemarkResult) {
  let nft = null
  try {
    nft = NFTUtils.unwrap(remark.value) as NFT
    canOrElseError<string>(exists, nft.collection, true)

    const collection = await CollectionEntity.get(nft.collection)
    canOrElseError<CollectionEntity>(exists, collection, true)

    isOwnerOrElseError(collection, remark.caller);

    nft.id = getNftId(nft, remark.blockNumber);
    const newNFT = NFTEntity.create(nft);
    newNFT.issuer = remark.caller;
    newNFT.currentOwner = remark.caller;
    newNFT.blockNumber = BigInt(remark.blockNumber);
    newNFT.name = nft.name;
    newNFT.instance = nft.instance;
    newNFT.transferable = nft.transferable;
    newNFT.collectionId = nft.collection;
    newNFT.sn = nft.sn;
    newNFT.metadata = nft.metadata;
    newNFT.price = BigInt(0);
    newNFT.burned = false;
    newNFT.events = [eventFrom(RmrkEvent.MINTNFT, remark, '')]
    newNFT.createdAt = remark.timestamp
    newNFT.updatedAt = remark.timestamp

    logger.info(`SAVED [MINT_NFT V1 SIMPLE] ${newNFT.id}`)
    await newNFT.save()
  } catch (e) {
    logger.error(`[MINT_NFT V1] ${e.message} ${JSON.stringify(nft)} ${JSON.stringify(remark)}`)
    await logFail(JSON.stringify(nft), e.message, RmrkEvent.MINTNFT)
  }
}

async function mintNFT_V2(remark: RemarkResult) {
  let nft = null
  try {
    nft = NFTUtils.unwrap(remark.value) as NFT;
    let recipient = NFTUtils.unwrap_V2_MINT_RECIPIENT(remark.value);
    canOrElseError<string>(exists, nft.collection, true);

    const collection = await CollectionEntity.get(nft.collection);
    canOrElseError<CollectionEntity>(exists, collection, true);
    isOwnerOrElseError(collection, remark.caller);

    nft.id = getNftId(nft, remark.blockNumber);
    const newNFT = NFTEntity.create(nft);
    newNFT.issuer = remark.caller;
    newNFT.currentOwner = remark.caller;
    newNFT.blockNumber = BigInt(remark.blockNumber);
    newNFT.name = nft.name;
    newNFT.instance = nft.instance;
    newNFT.transferable = nft.transferable;
    newNFT.collectionId = nft.collection;
    newNFT.sn = nft.sn;
    newNFT.metadata = nft.metadata;
    newNFT.price = BigInt(0);
    newNFT.burned = false;
    newNFT.events = [eventFrom(RmrkEvent.MINTNFT, remark, '')];
    newNFT.createdAt = remark.timestamp;
    newNFT.updatedAt = remark.timestamp;

    if (!recipient) {
      logger.info(`SAVED [MINT_NFT V2 SIMPLE] ${newNFT.id}`);
      await newNFT.save();

    }

    else {
      const parentNFT = await NFTEntity.get(recipient);
      if (!parentNFT) {
        newNFT.currentOwner = recipient; // mint nft to the specified account directly        
        logger.info(`SAVED [MINT_NFT V2 TO ACCOUNT] ${newNFT.id}`);
        await newNFT.save();
      }
      else {
        // mint nft to the specified nft as child 
        if (!parentNFT.children) {
          parentNFT.children = [];
        }
        let newNFTChild: NFTChild = { id: newNFT.id, equipped: '', pending: false };
        parentNFT.children.push(newNFTChild);
        await parentNFT.save();

        newNFT.currentOwner = recipient;
        logger.info(`SAVED [MINT_NFT V2 TO NFT] ${newNFT.id}`);
        await newNFT.save();
      }
    }

  } catch (e) {
    logger.error(`[MINT_NFT V2] ${e.message} ${JSON.stringify(nft)} ${JSON.stringify(remark)}`)
    await logFail(JSON.stringify(nft), e.message, RmrkEvent.MINTNFT)
  }
}

async function send(remark: RemarkResult) {
  let interaction: RmrkSendInteraction = null

  try {
    interaction = (NFTUtils.unwrap_SEND(remark.value) as RmrkSendInteraction)
    const currentNFT = await NFTEntity.get(interaction.id);
    validateInteraction(currentNFT, interaction)
    isOwnerOrElseError(currentNFT, remark.caller)
    // isAccountValidOrElseError(interaction.metadata)

    if (interaction.version === RmrkSpecVersion.V1) {
      //Standard 1.0.0: auto ACCEPT     
      currentNFT.currentOwner = interaction.recipient
      currentNFT.price = BigInt(0)
      currentNFT.events.push(eventFrom(RmrkEvent.SEND, remark, interaction.recipient))
      currentNFT.updatedAt = remark.timestamp
      await currentNFT.save()
    }
    else if (interaction.version === RmrkSpecVersion.V2) {
      // Standard 2.0.0: 
      const targetNFT = await NFTEntity.get(interaction.recipient);

      if (!targetNFT) {
        //sending nft to account
        //same logic handle as RmrkSpecVersion.V1
        currentNFT.currentOwner = interaction.recipient
        currentNFT.price = BigInt(0)
        currentNFT.events.push(eventFrom(RmrkEvent.SEND, remark, interaction.recipient))
        currentNFT.updatedAt = remark.timestamp
        await currentNFT.save()

      }
      else {
        // check if same owner for the source NFT and targetNFT
        let sameOwner = isOwner(targetNFT, remark.caller);
        let pending: boolean = true;
        if (sameOwner) {
          // same owner => auto ACCEPT
          pending = false;
        }

        if (!targetNFT.children) {
          targetNFT.children = [];
        }
        let nftChild: NFTChild = {
          id: currentNFT.id,
          pending: pending,
          equipped: ''
        };
        targetNFT.children.push(nftChild);
        await targetNFT.save();

        let currentOwner = currentNFT.currentOwner;
        //remove currentNFT from its parent if it has parent.
        if (currentOwner) {
          const parent = await NFTEntity.get(currentNFT.currentOwner);
          if (!parent) {
            //the parent should be a account, no need to handle children properties
          }
          else {
            if (parent.children) {
              let findIndex = parent.children.findIndex((value, index, array) => {
                return value.id === currentNFT.id
              });
              if (findIndex >= 0) {
                parent.children.splice(findIndex, 1);
                await parent.save();
              }
            }
          }
          //update currentNFT.currentOwner =>  targetNFT.id             
          currentNFT.currentOwner = targetNFT.id;
          await currentNFT.save();

        }
      }
    }

  } catch (e) {
    logger.warn(`[SEND] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.SEND)
  }
}

async function buy(remark: RemarkResult) {
  let interaction = null

  try {
    interaction = ensureInteraction(NFTUtils.unwrap(remark.value) as RmrkInteraction)
    const nft = await NFTEntity.get(interaction.id)
    canOrElseError<NFTEntity>(exists, nft, true)
    canOrElseError<NFTEntity>(isBurned, nft)
    canOrElseError<NFTEntity>(isTransferable, nft, true)
    isPositiveOrElseError(nft.price, true)
    isBuyLegalOrElseError(nft, remark.extra || [])
    nft.currentOwner = remark.caller
    nft.price = BigInt(0)
    nft.events.push(eventFrom(RmrkEvent.BUY, remark, remark.caller))
    nft.updatedAt = remark.timestamp
    await nft.save();

  } catch (e) {
    logger.warn(`[BUY] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.BUY)
  }
  // exists
  // not burned
  // transferable
  // has meta
  // enough money ?
}

//Standard 1.0.0 CONSUME
//Standard 2.0.0 BURN as alias
async function consume(remark: RemarkResult, eventAlias: RmrkEvent) {
  let interaction = null

  try {
    interaction = ensureInteraction(NFTUtils.unwrap(remark.value) as RmrkInteraction)
    const nft = await NFTEntity.get(interaction.id)
    canOrElseError<NFTEntity>(exists, nft, true)
    canOrElseError<NFTEntity>(isBurned, nft)
    isOwnerOrElseError(nft, remark.caller)
    nft.price = BigInt(0)
    nft.burned = true;
    nft.events.push(eventFrom(eventAlias, remark, ''))
    nft.updatedAt = remark.timestamp
    await nft.save();

  } catch (e) {
    logger.warn(`[${eventAlias}] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), e.message, eventAlias)
  }
}

async function list(remark: RemarkResult) {
  let interaction = null

  try {
    interaction = ensureInteraction(NFTUtils.unwrap(remark.value) as RmrkInteraction)
    const nft = await NFTEntity.get(interaction.id)
    validateInteraction(nft, interaction)
    isOwnerOrElseError(nft, remark.caller)
    const price = BigInt(interaction.metadata)
    isPositiveOrElseError(price)
    nft.price = price
    nft.events.push(eventFrom(RmrkEvent.LIST, remark, interaction.metadata))
    nft.updatedAt = remark.timestamp
    await nft.save();

  } catch (e) {

    logger.warn(`[LIST] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.LIST)
  }
  // exists
  // not burned
  // transferable
  // has meta
  // is owner
}

async function changeIssuer(remark: RemarkResult) {
  let interaction = null

  try {
    interaction = ensureInteraction(NFTUtils.unwrap(remark.value) as RmrkInteraction)
    canOrElseError<RmrkInteraction>(hasMeta, interaction, true)
    const collection = await CollectionEntity.get(interaction.id)
    canOrElseError<CollectionEntity>(exists, collection, true)
    isOwnerOrElseError(collection, remark.caller)
    collection.currentOwner = interaction.metadata
    collection.events.push(eventFrom(RmrkEvent.CHANGEISSUER, remark, interaction.metadata))
    await collection.save();
  } catch (e) {
    logger.warn(`[CHANGEISSUER] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.CHANGEISSUER)
  }


}

async function emote(remark: RemarkResult) {
  let interaction = null

  try {
    interaction = ensureInteraction(NFTUtils.unwrap(remark.value) as RmrkInteraction)
    canOrElseError<RmrkInteraction>(hasMeta, interaction, true)
    const nft = await NFTEntity.get(interaction.id)
    canOrElseError<NFTEntity>(exists, nft, true)
    canOrElseError<NFTEntity>(isBurned, nft)
    const id = emoteId(interaction, remark.caller)
    let emote = await Emote.get(id)

    if (exists(emote)) {
      await Emote.remove(emote.id)
      return;
    }

    emote = Emote.create({
      id,
      nftId: interaction.id,
      caller: remark.caller,
      value: interaction.metadata
    })

    await emote.save();

  } catch (e) {
    logger.warn(`[EMOTE] ${e.message}`)
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.EMOTE)
  }

  // exists
  // not burned
  // transferable
  // has meta
}

async function logFail(message: string, reason: string, interaction: RmrkEvent) {
  try {
    const fail = {
      id: randomBytes(20).toString('hex'),
      value: message,
      reason,
      interaction
    }

    const entity = FailedEntity.create(fail)
    await entity.save()

  } catch (e) {
    logger.warn(`[FAIL IN FAIL] ${interaction}::${message}`)
  }
}


export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
  const records = getRemarksFrom(extrinsic)
    .map((r, i) => {
      try {
        return { ...r, id: `${r.blockNumber}-${i}`, interaction: NFTUtils.getAction(hexToString(r.value)) }
      } catch (e) {
        return { ...r, id: `${r.blockNumber}-${i}`, interaction: hexToString(r.value) }
      }
    })
    .map(RemarkEntity.create);

  for (const record of records) {
    try {
      await record.save()
    } catch (e) {
      logger.warn(`[ERR] Can't save RMRK at block ${record.blockNumber} because \n${e}`)
    }

  }
}

async function accept(remark: RemarkResult) {

  let interaction: RmrkAcceptInteraction = null
  try {
    interaction = NFTUtils.unwrap_ACCEPT(remark.value) as RmrkAcceptInteraction
    const nft = await NFTEntity.get(interaction.id1)
    canOrElseError<NFTEntity>(exists, nft, true)
    canOrElseError<NFTEntity>(isBurned, nft)

    let entity = interaction.entity;
    if (entity === RmrkAcceptType.RES) {
      let resId = interaction.id2;
      if (nft.resources) {
        for (let index = 0; index < nft.resources.length; index++) {
          const res = nft.resources[index];
          if (res.id === resId) {
            res.pending = false;
          }
        }
      }
    }
    else if (entity === RmrkAcceptType.NFT) {
      let nftChildId = interaction.id2;
      if (nft.children) {
        for (let index = 0; index < nft.children.length; index++) {
          const child = nft.children[index];
          if (child.id === nftChildId) {
            child.pending = false;
          }
        }
      }
    }

    nft.events.push(eventFrom(RmrkEvent.ACCEPT, remark, ''));
    nft.updatedAt = remark.timestamp;

    await nft.save();

  } catch (e) {
    logger.warn(`[ACCEPT] ${e.message} ${JSON.stringify(interaction)}`);
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.ACCEPT);
  }

}
async function resAdd(remark: RemarkResult) {

  let interaction = null
  try {
    interaction = ensureInteraction(NFTUtils.unwrap(remark.value) as RmrkInteraction)
    const nft = await NFTEntity.get(interaction.id)
    canOrElseError<NFTEntity>(exists, nft, true)
    canOrElseError<NFTEntity>(isBurned, nft)

    let metadataJson = NFTUtils.decodeRmrk(interaction.metadata);
    let json = JSON.parse(metadataJson);
    if (!json) {
      throw new TypeError(`RMRK: Unable to parse metadata as JSON object: ${interaction.metadata}`)
    }

    let resId = json.id || '';
    let resSrc = json.src || '';
    let resMetadata = json.metadata || '';

    if (!resId) {
      throw new TypeError(`RMRK: invalid resource id`)
    }

    if (!nft.priority || nft.priority.length == 0) {
      nft.priority = [];
    }
    nft.priority.push(resId);

    let newResource: Resource = {
      id: resId,
      src: resSrc,
      metadata: resMetadata,
      pending: true   // enter a pending state and MUST be accepted with a ACCEPT 
    };
    if (isOwner(nft, remark.caller)) {
      //If the issuer is also the owner of this NFT, this interaction also counts as a ACCEPT automatically.
      //auto ACCEPT
      newResource.pending = false;
    }

    nft.resources.push(newResource);
    nft.events.push(eventFrom(RmrkEvent.RESADD, remark, ''));
    nft.updatedAt = remark.timestamp;

    await nft.save();

  } catch (e) {
    logger.warn(`[RESADD] ${e.message} ${JSON.stringify(interaction)}`);
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.RESADD);
  }

}

export async function handleRemark(extrinsic: SubstrateExtrinsic): Promise<void> {
  const records = getRemarksFrom(extrinsic)

  for (const remark of records) {
    try {
      const decoded = hexToString(remark.value)
      const event: RmrkEvent = NFTUtils.getAction(decoded)
      const specVersion: RmrkSpecVersion = NFTUtils.getSpecVersion(decoded)

      switch (event) {
        case RmrkEvent.CREATE:
          if (specVersion == RmrkSpecVersion.V2) {
            await collection_V2(remark);
          }
          break;
        case RmrkEvent.MINT:
          if (specVersion == RmrkSpecVersion.V1) {
            await collection_V1(remark);
          }
          else {
            await mintNFT_V2(remark);
          }
          break;
        case RmrkEvent.MINTNFT:
          await mintNFT_V1(remark)
          break;
        case RmrkEvent.SEND:
          await send(remark)
          break;
        case RmrkEvent.BUY:
          await buy(remark)
          break;
        case RmrkEvent.CONSUME:
        case RmrkEvent.BURN:
          await consume(remark, event);

          break;
        case RmrkEvent.LIST:
          await list(remark)
          break;
        case RmrkEvent.CHANGEISSUER:
          await changeIssuer(remark)
          break;
        case RmrkEvent.EMOTE:
          await emote(remark);
          break;

        //Standard 2.0.0  
        case RmrkEvent.ACCEPT:
          await accept(remark);
          break;
        case RmrkEvent.RESADD:
          await resAdd(remark);
          break;

        default:
          logger.warn(`[SKIP] ${event}::${remark.value}::${remark.blockNumber}`)
        // throw new EvalError(`Unable to evaluate following string, ${event}::${remark.value}`)
      }
    } catch (e) {
      logger.error(`[MALFORMED] ${remark.blockNumber}::${hexToString(remark.value)}`)
    }

  }
}


