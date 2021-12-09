import { CollectionEntity, Emote, EventEntity, FailedEntity, NFTChild, NFTEntity, RemarkEntity, Resource } from "../types";
import { SubstrateExtrinsic } from "@subql/types";
import { getRemarksFrom, RemarkResult } from './utils';
import { Collection, eventFrom, getNftId, getNftId_V01, NFT, RmrkAcceptInteraction, RmrkAcceptType, RmrkEvent, RmrkInteraction, RmrkSendInteraction, RmrkSpecVersion } from './utils/types';
import NFTUtils, { hexToString } from './utils/NftUtils';
import { canOrElseError, exists, hasMeta, isBurned, isBuyLegalOrElseError, isOwner, isOwnerOrElseError, isPositiveOrElseError, isTransferable, validateNFT, validateMeta, unwrapBuyPrice } from './utils/consolidator'
import { randomBytes } from 'crypto'
import { emoteId, ensureInteraction } from './utils/helper';
import {
  Event,
} from './../types/interfaces'

async function saveEventEntities(events?: Event[]): Promise<string> {
  let eventId = '';
  if (events) {
    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      let id = (event.blockNumber) + '-' + index;
      let entity = new EventEntity(id);
      entity.blockNumber = event.blockNumber;
      entity.timestamp = event.timestamp;
      entity.caller = event.caller;
      entity.interaction = event.interaction;
      entity.meta = event.meta;
      entity.interactionCollection = event.interactionCollection || '';
      entity.interactionNFT = event.interactionNFT || '';
      entity.interactionAccount = event.interactionAccount || '';
      entity.nftPrice = BigInt(event.nftPrice || 0);
      await entity.save();
      if (eventId) {
        eventId += ",";
      }
      eventId += entity.id;
    }
  }
  return eventId;
}

async function collection_V1(remark: RemarkResult) {
  let collection = null
  try {
    collection = NFTUtils.unwrap(remark.value) as Collection
    canOrElseError<string>(exists, collection.id, true)
    const entity = await CollectionEntity.get(collection.id)
    canOrElseError<CollectionEntity>(exists, entity)
    const final = CollectionEntity.create(collection)

    if (!collection.symbol) {
      collection.symbol = '';
    }

    if (!collection.name) {
      collection.name = collection.symbol;
    }

    final.name = collection.name.trim()
    final.max = Number(collection.max)
    final.issuer = remark.caller
    final.currentOwner = remark.caller
    final.symbol = collection.symbol.trim()
    final.blockNumber = BigInt(remark.blockNumber)
    final.metadata = collection.metadata
    final.events = [eventFrom(RmrkEvent.MINT, remark, '', collection.id, '', final.currentOwner, BigInt(0))];
    final.timestampCreatedAt = remark.timestamp;
    final.timestampUpdatedAt = remark.timestamp;

    final.eventId = await saveEventEntities(final.events);

    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save()
  } catch (e) {
    logger.error(`[COLLECTION] ${e.message}, ${JSON.stringify(collection)}`)
    await logFail(JSON.stringify(collection), e.message, RmrkEvent.MINT, remark)
  }

}
async function collection_V2(remark: RemarkResult) {
  collection_V1(remark);
}


async function mintNFT_V1(remark: RemarkResult) {
  let nft = null;
  const specVersion: RmrkSpecVersion = NFTUtils.getRmrkSpecVersion(remark.value)

  try {

    nft = NFTUtils.unwrap(remark.value) as NFT;
    canOrElseError<string>(exists, nft.collection, true);

    //TODO  collection does not exist , error logic to mintNFT. consider to create collection.
    const collection = await CollectionEntity.get(nft.collection);
    canOrElseError<CollectionEntity>(exists, collection, true);

    isOwnerOrElseError(collection, remark.caller);

    if (specVersion === RmrkSpecVersion.V01) {
      nft.id = getNftId_V01(nft);
    } else if (specVersion === RmrkSpecVersion.V1) {
      nft.id = getNftId(nft, remark.blockNumber);
    }
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
    newNFT.events = [eventFrom(RmrkEvent.MINTNFT, remark, '', collection.id, newNFT.id, newNFT.currentOwner, newNFT.price)];
    newNFT.timestampCreatedAt = remark.timestamp;
    newNFT.timestampUpdatedAt = remark.timestamp;

    newNFT.eventId = await saveEventEntities(newNFT.events);

    logger.info(`SAVED [MINT_NFT ${specVersion} SIMPLE] ${newNFT.id}`)
    await newNFT.save()
  } catch (e) {
    logger.error(`[MINT_NFT ${specVersion} ] ${e.message} ${JSON.stringify(nft)} ${JSON.stringify(remark)}`)
    await logFail(JSON.stringify(nft), e.message, RmrkEvent.MINTNFT, remark)
  }
}

async function mintNFT_V2(remark: RemarkResult) {
  let nft = null
  try {
    nft = NFTUtils.unwrap(remark.value) as NFT;
    let recipient = NFTUtils.unwrap_V2_MINT_RECIPIENT(remark.value);
    canOrElseError<string>(exists, nft.collection, true);

    //TODO  collection does not exist , error logic to mintNFT. consider to create collection.
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
    newNFT.events = [eventFrom(RmrkEvent.MINTNFT, remark, '', collection.id, newNFT.id, newNFT.currentOwner, newNFT.price)];
    newNFT.timestampCreatedAt = remark.timestamp;
    newNFT.timestampUpdatedAt = remark.timestamp;

    newNFT.eventId = await saveEventEntities(newNFT.events);

    if (!recipient) {

      logger.info(`SAVED [MINT_NFT V2 SIMPLE] ${newNFT.id}`);
      await newNFT.save();

    }

    else {
      newNFT.currentOwner = recipient;

      const parentNFT = await NFTEntity.get(recipient);
      if (!parentNFT) {
        // mint nft to the specified account directly        
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
        parentNFT.timestampUpdatedAt = remark.timestamp;
        await parentNFT.save();

        logger.info(`SAVED [MINT_NFT V2 TO NFT] ${newNFT.id}`);
        await newNFT.save();
      }
    }

  } catch (e) {
    logger.error(`[MINT_NFT V2] ${e.message} ${JSON.stringify(nft)} ${JSON.stringify(remark)}`)
    await logFail(JSON.stringify(nft), e.message, RmrkEvent.MINTNFT, remark)
  }
}

async function send_V1(remark: RemarkResult) {
  let interaction: RmrkSendInteraction = null

  try {
    interaction = (NFTUtils.unwrap_SEND(remark.value) as RmrkSendInteraction);
    const specVersion: RmrkSpecVersion = NFTUtils.getRmrkSpecVersion(remark.value);

    const currentNFT = await NFTEntity.get(interaction.id);
    validateNFT(currentNFT)
    isOwnerOrElseError(currentNFT, remark.caller)

    if (specVersion === RmrkSpecVersion.V1 || specVersion === RmrkSpecVersion.V01) {
      //Standard 1.0.0: auto ACCEPT     
      // currentNFT.price = BigInt(0);
      currentNFT.events.push(eventFrom(RmrkEvent.SEND, remark, interaction.recipient, currentNFT.collectionId, currentNFT.id, currentNFT.currentOwner, currentNFT.price));
      currentNFT.currentOwner = interaction.recipient;
      currentNFT.timestampUpdatedAt = remark.timestamp;

      currentNFT.eventId = await saveEventEntities(currentNFT.events);

      await currentNFT.save()
    }


  } catch (e) {
    logger.warn(`[SEND V1] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.SEND, remark)
  }
}
async function send_V2(remark: RemarkResult) {
  let interaction: RmrkSendInteraction = null

  try {
    interaction = (NFTUtils.unwrap_SEND(remark.value) as RmrkSendInteraction)
    const specVersion: RmrkSpecVersion = NFTUtils.getRmrkSpecVersion(remark.value);

    const currentNFT = await NFTEntity.get(interaction.id);
    validateNFT(currentNFT)
    isOwnerOrElseError(currentNFT, remark.caller)

    if (specVersion === RmrkSpecVersion.V2) {
      // Standard 2.0.0: 
      const targetNFT = await NFTEntity.get(interaction.recipient);

      if (!targetNFT) {
        //sending nft to account
        //same logic handle as RmrkSpecVersion.V1
        // currentNFT.price = BigInt(0);
        currentNFT.events.push(eventFrom(RmrkEvent.SEND, remark, interaction.recipient, currentNFT.collectionId, currentNFT.id, currentNFT.currentOwner, currentNFT.price));
        currentNFT.currentOwner = interaction.recipient;
        currentNFT.timestampUpdatedAt = remark.timestamp;

        currentNFT.eventId = await saveEventEntities(currentNFT.events);

        await currentNFT.save();

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
        targetNFT.timestampUpdatedAt = remark.timestamp;
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
                parent.timestampUpdatedAt = remark.timestamp;
                await parent.save();
              }
            }
          }
          //update currentNFT.currentOwner =>  targetNFT.id             
          currentNFT.events.push(eventFrom(RmrkEvent.SEND, remark, interaction.recipient, currentNFT.collectionId, currentNFT.id, currentNFT.currentOwner, currentNFT.price));
          currentNFT.currentOwner = targetNFT.id;
          currentNFT.timestampUpdatedAt = remark.timestamp;

          currentNFT.eventId = await saveEventEntities(currentNFT.events);

          await currentNFT.save();

        }
      }
    }

  } catch (e) {
    logger.warn(`[SEND V2] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.SEND, remark)
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
    nft.price = BigInt(unwrapBuyPrice(nft, remark.extra || []));  // Utility.batch_all => price for BUY
    nft.events.push(eventFrom(RmrkEvent.BUY, remark, remark.caller, nft.collectionId, nft.id, nft.currentOwner, nft.price))
    nft.currentOwner = remark.caller
    nft.timestampUpdatedAt = remark.timestamp

    nft.eventId = await saveEventEntities(nft.events);


    await nft.save();

  } catch (e) {
    logger.warn(`[BUY] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.BUY, remark)
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
  let interaction = null;

  try {
    interaction = ensureInteraction(NFTUtils.unwrap(remark.value) as RmrkInteraction);
    const nft = await NFTEntity.get(interaction.id);
    canOrElseError<NFTEntity>(exists, nft, true);
    canOrElseError<NFTEntity>(isBurned, nft);
    isOwnerOrElseError(nft, remark.caller);
    nft.price = BigInt(0);
    nft.burned = true;
    nft.events.push(eventFrom(eventAlias, remark, interaction.metadata, nft.collectionId, nft.id, nft.currentOwner, nft.price));
    nft.timestampUpdatedAt = remark.timestamp;

    nft.eventId = await saveEventEntities(nft.events);


    await nft.save();

  } catch (e) {
    logger.warn(`[${eventAlias}] ${e.message} ${JSON.stringify(interaction)}`);
    await logFail(JSON.stringify(interaction), e.message, eventAlias, remark);
  }
}

async function list(remark: RemarkResult) {
  let interaction = null;

  try {
    interaction = ensureInteraction(NFTUtils.unwrap(remark.value) as RmrkInteraction);
    const nft = await NFTEntity.get(interaction.id);
    validateNFT(nft);
    validateMeta(interaction);
    isOwnerOrElseError(nft, remark.caller);
    const price = BigInt(interaction.metadata);
    isPositiveOrElseError(price);
    nft.price = price;
    nft.events.push(eventFrom(RmrkEvent.LIST, remark, interaction.metadata, nft.collectionId, nft.id, nft.currentOwner, nft.price));
    nft.timestampUpdatedAt = remark.timestamp;

    nft.eventId = await saveEventEntities(nft.events);

    await nft.save();

  } catch (e) {

    logger.warn(`[LIST] ${e.message} ${JSON.stringify(interaction)}`);
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.LIST, remark);
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
    isOwnerOrElseError(collection, remark.caller);
    collection.events.push(eventFrom(RmrkEvent.CHANGEISSUER, remark, interaction.metadata, collection.id, '', collection.currentOwner, BigInt(0)))
    collection.currentOwner = interaction.metadata;
    collection.eventId = await saveEventEntities(collection.events);

    await collection.save();
  } catch (e) {
    logger.warn(`[CHANGEISSUER] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.CHANGEISSUER, remark)
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
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.EMOTE, remark)
  }

  // exists
  // not burned
  // transferable
  // has meta
}

async function logFail(message: string, reason: string, interaction: RmrkEvent, remark: RemarkResult) {
  try {
    const fail = {
      id: randomBytes(20).toString('hex'),
      value: message,
      reason,
      interaction,
      remark: JSON.stringify(remark)
    }

    const entity = FailedEntity.create(fail)
    await entity.save()

  } catch (e) {
    logger.warn(`[FAIL IN FAIL] ${interaction}::${message}`)
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

    nft.events.push(eventFrom(RmrkEvent.ACCEPT, remark, interaction.id2, nft.collectionId, nft.id, nft.currentOwner, nft.price));
    nft.timestampUpdatedAt = remark.timestamp;

    nft.eventId = await saveEventEntities(nft.events);

    await nft.save();

  } catch (e) {
    logger.warn(`[ACCEPT] ${e.message} ${JSON.stringify(interaction)}`);
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.ACCEPT, remark);
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
    nft.events.push(eventFrom(RmrkEvent.RESADD, remark, interaction.metadata, nft.collectionId, nft.id, nft.currentOwner, nft.price));
    nft.timestampUpdatedAt = remark.timestamp;

    nft.eventId = await saveEventEntities(nft.events);

    await nft.save();

  } catch (e) {
    logger.warn(`[RESADD] ${e.message} ${JSON.stringify(interaction)}`);
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.RESADD, remark);
  }

}

export async function handleRemark(extrinsic: SubstrateExtrinsic): Promise<void> {
  const records = getRemarksFrom(extrinsic);

  //save remark entity
  let remarkEntities = records.map((r, i) => ({
    ...r,
    id: `${r.blockNumber}-${i}`,
    interaction: NFTUtils.getAction(hexToString(r.value)),
    extra: JSON.stringify(r.extra),
    specVersion: NFTUtils.getRmrkSpecVersion(hexToString(r.value)),
    processed: 0
  }))
    .map(RemarkEntity.create);
  for (const remarkEntity of remarkEntities) {
    try {
      await remarkEntity.save();
      logger.info(`[Saved RMRK Remark] ${remarkEntity.id}`);
    } catch (e) {
      logger.warn(`[ERR] Can't save RMRK Remark at block ${remarkEntity.blockNumber} because \n${e}`);
    }
  }

  //handle interaction
  for (const remark of records) {
    try {
      const decoded = hexToString(remark.value);
      const event: RmrkEvent = NFTUtils.getAction(decoded);
      const specVersion: RmrkSpecVersion = NFTUtils.getRmrkSpecVersion(decoded);

      switch (event) {
        case RmrkEvent.CREATE:
          if (specVersion == RmrkSpecVersion.V2) {
            await collection_V2(remark);
          }
          break;
        case RmrkEvent.MINT:
          if (specVersion == RmrkSpecVersion.V1 || specVersion == RmrkSpecVersion.V01) {
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
          if (specVersion == RmrkSpecVersion.V1 || specVersion == RmrkSpecVersion.V01) {
            await send_V1(remark);
          }
          else if (specVersion == RmrkSpecVersion.V2) {
            await send_V2(remark);
          }
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




