import {CollectionEntity, NFTEntity, RemarkEntity} from "../types";
import { SubstrateExtrinsic } from "@subql/types";
import { getRemarksFrom, RemarkResult } from './utils';
// import { Collection, eventFrom, getNftId, NFT, RmrkEvent, RmrkInteraction } from './utils/types';
// import NFTUtils from './utils/NftUtils';
// import { canOrElseError, exists, hasMeta, isOwnerOrElseError, validateInteraction } from './utils/consolidator'
// // import { encodeAddress } from "@polkadot/util-crypto";

// async function mint(remark: RemarkResult) {
//   const collection = NFTUtils.unwrap(remark.value) as Collection
  
//   try {
//     canOrElseError<string>(exists, collection.id, true)
//     const entity = await CollectionEntity.get(collection.id)
//     canOrElseError<CollectionEntity>(exists, entity)
//     const final = CollectionEntity.create(collection)
    
//     final.name = collection.name.trim()
//     final.max = Number(collection.max)
//     final.issuer = remark.caller
//     final.symbol = collection.symbol.trim()
//     final.blockNumber = BigInt(remark.blockNumber)
//     final.metadata = collection.metadata

//     await final.save()
//   } catch (e) {
//     console.warn(`[MINT] ${e.message}`)
//   }

// }

// async function mintNFT(remark: RemarkResult) {
//   const nft = NFTUtils.unwrap(remark.value) as NFT
  
//   try {
//     canOrElseError<string>(exists, nft.collection, true)
//     const collection = await CollectionEntity.get(nft.collection)
//     canOrElseError<CollectionEntity>(exists, collection, true)
//     isOwnerOrElseError(collection, remark.caller)
//     const final = NFTEntity.create(nft)
    
//     final.id = getNftId(nft, remark.blockNumber)
//     final.issuer = remark.caller
//     final.currentOwner = remark.caller
//     final.blockNumber = BigInt(remark.blockNumber)
//     final.name = nft.name
//     final.instance = nft.instance
//     final.transferable = nft.transferable
//     final.collection = nft.collection
//     final.sn = nft.sn
//     final.metadata = nft.metadata
//     final.price = BigInt(0) 
//     final.events = [eventFrom(RmrkEvent.MINTNFT, final.blockNumber, remark.caller, new Date(), '')]
//     final.emotes = []
    

//     await final.save()
//   } catch (e) {
//     console.warn(`[MINT] ${e.message}`)
//   }
// }

// async function send(remark: RemarkResult) {
//   const interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
//   const nft = await NFTEntity.get(interaction.id)

//   try {
//     validateInteraction(nft, interaction)
//     isOwnerOrElseError(nft, remark.caller)

//   } catch (e) {
//     console.warn(`[SEND] ${e.message}`)
//   }
//   // exists
//   // not burned
//   // transferable
//   // has meta
//   // is owner
// }

// async function buy(remark: RemarkResult) {
//   const interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
//   const nft = await NFTEntity.get(interaction.id)
//   try {
//     validateInteraction(nft, interaction)

//   } catch (e) {
//     console.warn(`[BUY] ${e.message}`)
//   }
//   // exists
//   // not burned
//   // transferable
//   // has meta
//   // enough money ?
// }

// async function consume(remark: RemarkResult ) {
//   const interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
//   const nft = await NFTEntity.get(interaction.id)

//   try {
//     validateInteraction(nft, interaction)
//     isOwnerOrElseError(nft, remark.caller)
//     nft.price = BigInt(interaction.metadata)
//     nft.burned = true;

//     // add burn event
//     await nft.save();

//   } catch (e) {
//     console.warn(`[SEND] ${e.message}`)
//   }
//   // exists
//   // not burned
//   // transferable
//   // has meta
//   // is owner
// }

// async function list(remark: RemarkResult ) {
//   const interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
//   const nft = await NFTEntity.get(interaction.id)

//   try {
//     validateInteraction(nft, interaction)
//     isOwnerOrElseError(nft, remark.caller)
//     nft.price = BigInt(interaction.metadata)
//     // add LIST event
//     await nft.save();

//   } catch (e) {

//     console.warn(`[LIST] ${e.message}`)
//   }
//   // exists
//   // not burned
//   // transferable
//   // has meta
//   // is owner
// }

// async function changeIssuer(remark: RemarkResult ) {
//   const interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
  
//   try {
//     canOrElseError<RmrkInteraction>(hasMeta, interaction, true)
//     const collection = await CollectionEntity.get(interaction.id)
//     canOrElseError<CollectionEntity>(exists, collection, true)
//     isOwnerOrElseError(collection, remark.caller)
//   } catch (e) {
//     console.warn(`[EMOTE] ${e.message}`)
//   }
  

// }

// async function emote(remark: RemarkResult ) {
//   const interaction = NFTUtils.unwrap(remark.value) as RmrkInteraction
//   const nft = await NFTEntity.get(interaction.id)

//   try {
//     canOrElseError<RmrkInteraction>(hasMeta, interaction, true)
//     canOrElseError<NFTEntity>(exists, nft, true)
//     const alreadyEmoted = nft.emotes.some(({ caller, value }) => caller === remark.caller && value === interaction.metadata)

//     if (alreadyEmoted) {}

//   } catch (e) {
//     console.warn(`[EMOTE] ${e.message}`)
//   }

//   // exists
//   // not burned
//   // transferable
//   // has meta
// }


export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const records = getRemarksFrom(extrinsic)
    .map((r, i) => ({...r, id: `${r.blockNumber}-${i}` }))
    .map(RemarkEntity.create);

    for (const record of records) {
        try {
            await record.save()
        } catch (e) {
            console.warn(`[ERR] Can't save RMRK at block ${record.blockNumber} because \n${e}`)
        }
        
    }
}



// // export async function handleRemark(extrinsic: SubstrateExtrinsic): Promise<void> {
// //   const records = getRemarksFrom(extrinsic)

// //   for (const remark of records) {
// //     try {
// //       const event: RmrkEvent = NFTUtils.getAction(remark.value)
// //       switch (event) {
// //         case RmrkEvent.MINT:
// //           await mint(remark)
// //         case RmrkEvent.MINTNFT:
// //           await mintNFT(remark)
// //         case RmrkEvent.SEND:
// //           await send(remark)
// //         case RmrkEvent.BUY:
// //           await buy(remark)
// //         case RmrkEvent.CONSUME:
// //           await consume(remark)
// //         case RmrkEvent.LIST:
// //           await list(remark)
// //         case RmrkEvent.CHANGEISSUER:
// //           await changeIssuer(remark)
// //         case RmrkEvent.EMOTE:
// //           await emote(remark)
// //         default:
// //           throw new EvalError(`Unable to evaluate following string, ${remark.value}`)
// //       }
// //     } catch (e) {
// //       throw e
// //     }
      
// //   }
// // }
