import {CollectionEntity, FailedEntity, NFTEntity, RemarkEntity} from "../types";
import { SubstrateExtrinsic } from "@subql/types";
import { getRemarksFrom, RemarkResult } from './utils';
import { Collection, eventFrom, getNftId, NFT, RmrkEvent, RmrkInteraction } from './utils/types';
import NFTUtils, { hexToString } from './utils/NftUtils';
import { canOrElseError, exists, hasMeta, isBurned, isOwner, isOwnerOrElseError, isTransferable, validateInteraction } from './utils/consolidator'
import { randomBytes } from 'crypto'

async function mint(remark: RemarkResult) {
  const collection = NFTUtils.unwrap(remark.value) as Collection
  
  try {
    canOrElseError<string>(exists, collection.id, true)
    const entity = await CollectionEntity.get(collection.id)
    canOrElseError<CollectionEntity>(exists, entity)
    const final = CollectionEntity.create(collection)
    
    final.name = collection.name.trim()
    final.max = Number(collection.max)
    final.issuer = remark.caller
    final.symbol = collection.symbol.trim()
    final.blockNumber = BigInt(remark.blockNumber)
    final.metadata = collection.metadata

    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save()
  } catch (e) {
    logger.error(`[COLLECTION] ${e.message}, ${JSON.stringify(collection)}`)
    await logFail(JSON.stringify(collection), `[COLLECTION] ${e.message}`)
  }

}

async function mintNFT(remark: RemarkResult) {
  const nft = NFTUtils.unwrap(remark.value) as NFT
  
  try {
    canOrElseError<string>(exists, nft.collection, true)
    const collection = await CollectionEntity.get(nft.collection)
    canOrElseError<CollectionEntity>(exists, collection, true)
    isOwnerOrElseError(collection, remark.caller)
    const final = NFTEntity.create(nft)
    
    final.id = getNftId(nft, remark.blockNumber)
    final.issuer = remark.caller
    final.currentOwner = remark.caller
    final.blockNumber = BigInt(remark.blockNumber)
    final.name = nft.name
    final.instance = nft.instance
    final.transferable = nft.transferable
    final.collection = nft.collection
    final.sn = nft.sn
    final.metadata = nft.metadata
    final.price = BigInt(0) 
    final.events = [eventFrom(RmrkEvent.MINTNFT, remark.blockNumber, remark.caller, new Date(), '')]
    // final.emotesId = []
    
    logger.info(`SAVED [MINT] ${final.id}`)
    await final.save()
  } catch (e) {
    logger.error(`[MINT] ${e.message} ${JSON.stringify(nft)}`)
    await logFail(JSON.stringify(nft), `[MINT] ${e.message}`)
  }
}

async function send(remark: RemarkResult) {
  const interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
  const nft = await NFTEntity.get(interaction.id)

  try {
    validateInteraction(nft, interaction)
    isOwnerOrElseError(nft, remark.caller)

    nft.currentOwner = interaction.metadata
    nft.events.push(eventFrom(RmrkEvent.SEND, remark.blockNumber, remark.caller, new Date(), interaction.metadata))
    await nft.save()

  } catch (e) {
    logger.warn(`[SEND] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), `[SEND] ${e.message}`)
  }
  // exists
  // not burned
  // transferable
  // has meta
  // is owner
}

async function buy(remark: RemarkResult) {
  const interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
  const nft = await NFTEntity.get(interaction.id)
  try {
    validateInteraction(nft, interaction)
    nft.currentOwner = interaction.metadata
    nft.price = BigInt(0)
    nft.events.push(eventFrom(RmrkEvent.BUY, remark.blockNumber, remark.caller, new Date(), interaction.metadata))

  } catch (e) {
    logger.warn(`[BUY] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), `[BUY] ${e.message}`)
  }
  // exists
  // not burned
  // transferable
  // has meta
  // enough money ?
}

async function consume(remark: RemarkResult ) {
  const interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
  const nft = await NFTEntity.get(interaction.id)

  try {
    canOrElseError<NFTEntity>(exists, nft, true)
    canOrElseError<NFTEntity>(isBurned, nft)
    canOrElseError<NFTEntity>(isTransferable, nft, true)
    isOwnerOrElseError(nft, remark.caller)
    nft.price = BigInt(0)
    nft.burned = true;
    nft.events.push(eventFrom(RmrkEvent.CONSUME, remark.blockNumber, remark.caller, new Date(), ''))

    // add burn event
    await nft.save();

  } catch (e) {
    logger.warn(`[CONSUME] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), `[CONSUME] ${e.message}`)
  }
  // exists
  // not burned
  // transferable
  // has meta
  // is owner
}

async function list(remark: RemarkResult ) {
  const interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
  const nft = await NFTEntity.get(interaction.id)

  try {
    validateInteraction(nft, interaction)
    isOwnerOrElseError(nft, remark.caller)
    nft.price = BigInt(interaction.metadata)
    // add LIST event
    await nft.save();

  } catch (e) {

    logger.warn(`[LIST] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), `[LIST] ${e.message}`)
  }
  // exists
  // not burned
  // transferable
  // has meta
  // is owner
}

async function changeIssuer(remark: RemarkResult ) {
  const interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
  
  try {
    canOrElseError<RmrkInteraction>(hasMeta, interaction, true)
    const collection = await CollectionEntity.get(interaction.id)
    canOrElseError<CollectionEntity>(exists, collection, true)
    isOwnerOrElseError(collection, remark.caller)
  } catch (e) {
    logger.warn(`[CHANGEISSUER] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), `[CHANGEISSUER] ${e.message}`)
  }
  

}

async function emote(remark: RemarkResult ) {
  const interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction

  try {
    canOrElseError<RmrkInteraction>(hasMeta, interaction, true)
    const nft = await NFTEntity.get(interaction.id)
    canOrElseError<NFTEntity>(exists, nft, true)

  } catch (e) {
    logger.warn(`[EMOTE] ${e.message}`)
    await logFail(JSON.stringify(interaction), `[EMOTE] ${e.message}`)
  }

  // exists
  // not burned
  // transferable
  // has meta
}

async function logFail(message: string, reason: string) {
  try {
    const fail = {
      id: randomBytes(20).toString('hex'),
      value: message,
      reason,
    }

    const entity = FailedEntity.create(fail)
    await entity.save()

  } catch (e) {
    logger.warn(`[FAIL IN FAIL] H O W?`)
  }
}


export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const records = getRemarksFrom(extrinsic)
    .map((r, i) => ({...r, id: `${r.blockNumber}-${i}`, interaction: NFTUtils.getAction(hexToString(r.value))}))
    .map(RemarkEntity.create);

    for (const record of records) {
        try {
            await record.save()
        } catch (e) {
            logger.warn(`[ERR] Can't save RMRK at block ${record.blockNumber} because \n${e}`)
        }
        
    }
}



export async function handleRemark(extrinsic: SubstrateExtrinsic): Promise<void> {
  const records = getRemarksFrom(extrinsic)

  for (const remark of records) {
    try {
      const decoded = hexToString(remark.value)
      const event: RmrkEvent = NFTUtils.getAction(decoded)

      switch (event) {
        case RmrkEvent.MINT:
          await mint(remark)
          break;
        case RmrkEvent.MINTNFT:
          await mintNFT(remark)
          break;
        case RmrkEvent.SEND:
          await send(remark)
          break;
        case RmrkEvent.BUY:
          await buy(remark)
          break;
        case RmrkEvent.CONSUME:
          await consume(remark)
          break;
        case RmrkEvent.LIST:
          await list(remark)
          break;
        case RmrkEvent.CHANGEISSUER:
          await changeIssuer(remark)
          break;
        case RmrkEvent.EMOTE:
          await emote(remark)
          break;
        default:
          logger.warn(`[SKIP] ${event}::${remark.value}::${remark.blockNumber}`)
          // throw new EvalError(`Unable to evaluate following string, ${event}::${remark.value}`)
      }
    } catch (e) {
      throw e
    }
      
  }
}
