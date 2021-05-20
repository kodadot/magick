import { RmrkInteraction } from './types'
import { CollectionEntity, NFTEntity } from '../../types'
type Entity = CollectionEntity | NFTEntity

export function exists<T>(entity: T | undefined): boolean {
  return !!entity
}

export function isBurned(nft: NFTEntity) {
  return nft.burned
}

export function isTransferable(nft: NFTEntity) {
  return !!nft.transferable
}

export function hasMeta(nft: RmrkInteraction): nft is RmrkInteraction  {
  return !!nft.metadata
}

export function isOwner(entity: Entity, caller: string) {
  return entity.issuer === caller
}


export function isOwnerOrElseError(entity: Entity, caller: string) {
  if (!isOwner(entity, caller)) {
    throw new ReferenceError(`[NO Transfer] \nCaller ${isOwnerOrElseError.caller}`)
  }
}

export function canOrElseError<T>(callback: (arg: T) => boolean, entity: T, negation?: boolean) {
  if (negation ? !callback(entity) : callback(entity)) {
    throw new ReferenceError(`[NO canOrElseError] \n Callback ${callback.name}`)
  }
}

export function validateInteraction(nft: NFTEntity, interaction: RmrkInteraction) {
  try {
    canOrElseError<RmrkInteraction>(hasMeta, interaction, true)
    canOrElseError<NFTEntity>(exists, nft, true)
    canOrElseError<NFTEntity>(isBurned, nft)
    canOrElseError<NFTEntity>(isTransferable, nft, true)
  } catch (e) {
    throw e
  }
}