import {RemarkEntity} from "../types";
import { SubstrateExtrinsic } from "@subql/types";
import { getRemarksFrom } from './utils';
// import { encodeAddress } from "@polkadot/util-crypto";

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


