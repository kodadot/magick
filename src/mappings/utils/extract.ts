import { Call as TCall } from "@polkadot/types/interfaces";
import { EventRecord } from '@polkadot/types/interfaces';
import { Moment } from '@polkadot/types/interfaces';
import { Compact } from '@polkadot/types';
import { SubstrateExtrinsic } from "@subql/types";
const PREFIXES = ['0x726d726b', '0x524d524b']
import { encodeAddress } from "@polkadot/util-crypto";

export interface RemarkResult {
  value: string;
  caller: string;
  blockNumber: string;
  timestamp: Date;
}

export interface RemarkResultEntity extends RemarkResult {
  id: string;
}

export const isSystemRemark = (call: TCall, prefixes: string[] = PREFIXES): boolean =>
  call.section === "system" &&
  call.method === "remark" &&
  (prefixes.length < 1 ||
    prefixes.some((word) => call.args.toString().startsWith(word)));

export const isUtilityBatch = (call: TCall) =>
  call.section === "utility" &&
  (call.method === "batch" || call.method === "batchAll");

  export const isBatchInterrupted = (
    records: EventRecord[],
    extrinsicIndex?: number
  ): boolean => {
    const events = records.filter(
      ({ phase, event }) =>
        phase.isApplyExtrinsic &&
        // phase.asApplyExtrinsic.eq(extrinsicIndex) &&
        (event.method.toString() === "BatchInterrupted" ||
          event.method.toString() === "ExtrinsicFailed")
    );
  
    return Boolean(events.length);
  };

export const getRemarksFrom = (extrinsic: SubstrateExtrinsic): RemarkResult[] => {
  if (!extrinsic.success) {
    return []
  }

  const signer = extrinsic.extrinsic.signer.toString();
  const blockNumber = extrinsic.block.block.header.number.toString()
  const timestamp = extrinsic.block.timestamp;

  if (isSystemRemark(extrinsic.extrinsic.method as TCall)) {
    return [{
      value: extrinsic.extrinsic.args.toString(),
      caller: signer,
      blockNumber,
      timestamp
    }]
  }

  if (isUtilityBatch(extrinsic.extrinsic.method as TCall)) {
    if (isBatchInterrupted(extrinsic.events)) {
      return [];
    }

    return processBatch(extrinsic.extrinsic.method.args[0] as unknown as TCall[], signer, blockNumber, timestamp)
  }

  return [];
}


export const processBatch = (calls: TCall[], caller: string, blockNumber: string, timestamp: Date): RemarkResult[] => {
  return calls
  .filter(call => isSystemRemark(call))
  .map(call => ({ value: call.args.toString(), caller, blockNumber, timestamp }))
}
