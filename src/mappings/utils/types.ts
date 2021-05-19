import { CollectionEntity, NFTEntity } from '../../types'

export enum RmrkEvent {
  MINT = 'MINT',
  MINTNFT = 'MINTNFT',
  LIST = 'LIST',
  BUY = 'BUY',
  CONSUME = 'CONSUME',
  CHANGEISSUER = 'CHANGEISSUER',
  SEND = 'SEND',
  EMOTE = 'EMOTE',
}

export const getNftId = (nft: any, blocknumber?: string | number): string => {
  return `${blocknumber ? blocknumber + '-' : '' }${nft.collection}-${nft.instance || nft.name}-${nft.sn}`
}

export interface RmrkInteraction {
  id: string;
  metadata?: string;
}

export interface RMRK {
  event: RmrkEvent;
  view: RmrkType;
}

export type RmrkType = CollectionEntity | NFTEntity | RmrkInteraction
