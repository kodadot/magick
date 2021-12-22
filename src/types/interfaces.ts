// SPDX-License-Identifier: Apache-2.0

// Auto-generated , DO NOT EDIT

export interface Resource {

    pending: boolean;

    id: string;

    src?: string;

    metadata?: string;

    base?: string;

    slot?: string;

    license?: string;

    thumb?: string;

    parts?: string[];

    theme?: string;

}


export interface NFTChild {

    id: string;

    equipped: string;

    pending: boolean;

}


export interface Event {

    blockNumber?: string;

    timestamp?: Date;

    caller: string;

    interaction?: string;

    meta: string;

    interactionCollection?: string;

    interactionNFT?: string;

    interactionAccount?: string;

    nftPrice?: string;

}


