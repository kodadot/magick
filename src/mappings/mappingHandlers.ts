import {CollectionEntity, FailedEntity, NFTEntity, RemarkEntity} from "../types";
import { SubstrateExtrinsic } from "@subql/types";
import { getRemarksFrom, RemarkResult } from './utils';
import { Collection, eventFrom, getNftId, NFT, RmrkEvent, RmrkInteraction } from './utils/types';
import NFTUtils, { hexToString } from './utils/NftUtils';
import { canOrElseError, exists, hasMeta, isBurned, isOwner, isOwnerOrElseError, isTransferable, validateInteraction } from './utils/consolidator'
import { randomBytes } from 'crypto'

async function mint(remark: RemarkResult) {
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
    final.symbol = collection.symbol.trim()
    final.blockNumber = BigInt(remark.blockNumber)
    final.metadata = collection.metadata

    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save()
  } catch (e) {
    logger.error(`[COLLECTION] ${e.message}, ${JSON.stringify(collection)}`)
    await logFail(JSON.stringify(collection), e.message, RmrkEvent.MINT)
  }

}

async function mintNFT(remark: RemarkResult) {
  let nft = null
  try {
    nft = NFTUtils.unwrap(remark.value) as NFT
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
    await logFail(JSON.stringify(nft), e.message, RmrkEvent.MINTNFT)
  }
}

async function send(remark: RemarkResult) {
  let interaction = null

  try {
    interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
    const nft = await NFTEntity.get(interaction.id)
    validateInteraction(nft, interaction)
    isOwnerOrElseError(nft, remark.caller)

    nft.currentOwner = interaction.metadata
    nft.price = BigInt(0)
    nft.events.push(eventFrom(RmrkEvent.SEND, remark.blockNumber, remark.caller, new Date(), interaction.metadata))
    await nft.save()

  } catch (e) {
    logger.warn(`[SEND] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.SEND)
  }
  // exists
  // not burned
  // transferable
  // has meta
  // is owner
}

async function buy(remark: RemarkResult) {
  let interaction = null
  
  try {
    interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
    const nft = await NFTEntity.get(interaction.id)
    canOrElseError<NFTEntity>(exists, nft, true)
    canOrElseError<NFTEntity>(isBurned, nft)
    canOrElseError<NFTEntity>(isTransferable, nft, true)
    nft.currentOwner = remark.caller
    nft.price = BigInt(0)
    nft.events.push(eventFrom(RmrkEvent.BUY, remark.blockNumber, remark.caller, new Date(), remark.caller))
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

async function consume(remark: RemarkResult ) {
  let interaction = null

  try {
    interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
    const nft = await NFTEntity.get(interaction.id)
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
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.CONSUME)
  }
  // exists
  // not burned
  // transferable
  // has meta
  // is owner
}

async function list(remark: RemarkResult ) {
  let interaction = null

  try {
    interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
    const nft = await NFTEntity.get(interaction.id)
    validateInteraction(nft, interaction)
    isOwnerOrElseError(nft, remark.caller)
    nft.price = BigInt(interaction.metadata)
    nft.events.push(eventFrom(RmrkEvent.LIST, remark.blockNumber, remark.caller, new Date(), interaction.metadata))
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

async function changeIssuer(remark: RemarkResult ) {
  let interaction = null
  
  try {
    interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
    canOrElseError<RmrkInteraction>(hasMeta, interaction, true)
    const collection = await CollectionEntity.get(interaction.id)
    canOrElseError<CollectionEntity>(exists, collection, true)
    isOwnerOrElseError(collection, remark.caller)
  } catch (e) {
    logger.warn(`[CHANGEISSUER] ${e.message} ${JSON.stringify(interaction)}`)
    await logFail(JSON.stringify(interaction), e.message, RmrkEvent.CHANGEISSUER)
  }
  

}

async function emote(remark: RemarkResult ) {
  let interaction = null

  try {
    interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
    canOrElseError<RmrkInteraction>(hasMeta, interaction, true)
    const nft = await NFTEntity.get(interaction.id)
    canOrElseError<NFTEntity>(exists, nft, true)

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
          logger.info(`[BUY] ${remark.blockNumber}::${hexToString(remark.value)}`)
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
      logger.error(`[MALFORMED] ${remark.blockNumber}::${hexToString(remark.value)}`)
    }
      
  }
}
