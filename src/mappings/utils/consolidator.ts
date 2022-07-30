import { RmrkInteraction } from './types'
import { CollectionEntity, NFTEntity } from '../../types'
import { ExtraCall } from './extract'
// import { decodeAddress } from '@polkadot/util-crypto'
type Entity = CollectionEntity | NFTEntity;

export function real<T>(entity: T | undefined): boolean {
  return !!entity;
}

export function burned({ burned }: NFTEntity): boolean {
  return burned;
}

export function transferable({ transferable }: NFTEntity) {
  return !!transferable
}

export function withMeta(interaction: RmrkInteraction): interaction is RmrkInteraction  {
  return !!interaction.metadata
}

export function isOwner(entity: Entity, caller: string) {
  return entity.currentOwner === caller
}

export function isIssuer(entity: Entity, caller: string) {
  return entity.issuer === caller
}


export function isOwnerOrElseError(entity: Entity, caller: string) {
  if (!isOwner(entity, caller)) {
    throw new ReferenceError(`[CONSOLIDATE Bad Owner] Entity: ${entity.issuer} Caller: ${caller}`)
  }
}

export function plsBe<T>(callback: (arg: T) => boolean, entity: T): void {
  return needTo(callback, entity, true);
}

export function plsNotBe<T>(callback: (arg: T) => boolean, entity: T): void {
  return needTo(callback, entity, false);
}

export function needTo<T>(callback: (arg: T) => boolean, entity: T, positive = true): void {
  if (positive ? !callback(entity) : callback(entity)) {
    throw new ReferenceError(`[PROBLEM] Entity needs ${positive ? '' : 'not'}to be ${callback.name}`);
  }
}

export function isInteractive(nft: NFTEntity): void {
  plsBe(real, nft)
  plsNotBe(burned, nft)
  plsBe(transferable, nft)
}

export function validateInteraction(nft: NFTEntity, interaction: RmrkInteraction) {
  plsBe(withMeta, interaction)
  isInteractive(nft)
}

export function isPositiveOrElseError(entity: BigInt | number, excludeZero?: boolean) {
  if (entity < Number(excludeZero)) {
    throw new ReferenceError(`[CONSOLIDATE isPositiveOrElseError] Entity: ${entity}`)
  }
}


const isBalanceTransfer = ({section, method}: ExtraCall) => section === 'balances' && method === 'transfer'
const canBuy = (nft: NFTEntity) => (call: ExtraCall) => isBalanceTransfer(call) && isOwner(nft, call.args[0]) && BigInt(call.args[1]) >= BigInt(nft.price)

export function isBuyLegalOrElseError(entity: NFTEntity, extraCalls: ExtraCall[]) {
  const result = extraCalls.some(canBuy(entity))
  if (!result) {
    throw new ReferenceError(`[CONSOLIDATE ILLEGAL BUY] Entity: ${entity.id} CALLS: ${JSON.stringify(extraCalls)}`)
  }
}

// TODO: Does not work :)
// export function isAccountValidOrElseError(caller: string) {
//   try {
//     decodeAddress(caller)
//   } catch (e) {
//     throw new ReferenceError(`[CONSOLIDATE Invalid account] ${caller}`)
//   }
// }
