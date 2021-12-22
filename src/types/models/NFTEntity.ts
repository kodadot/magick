// Auto-generated , DO NOT EDIT
import {Entity, FunctionPropertyNames} from "@subql/types";
import assert from 'assert';

import {
    Event,

    Resource,

    NFTChild,
} from '../interfaces'




export class NFTEntity implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public name?: string;

    public instance?: string;

    public transferable?: number;

    public collectionId: string;

    public issuer?: string;

    public sn?: string;

    public id: string;

    public metadata?: string;

    public currentOwner?: string;

    public price?: bigint;

    public burned?: boolean;

    public blockNumber?: bigint;

    public events?: Event[];

    public timestampCreatedAt?: Date;

    public timestampUpdatedAt?: Date;

    public priority?: string[];

    public resources?: Resource[];

    public children?: NFTChild[];

    public eventId?: string;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save NFTEntity entity without an ID");
        await store.set('NFTEntity', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove NFTEntity entity without an ID");
        await store.remove('NFTEntity', id.toString());
    }

    static async get(id:string): Promise<NFTEntity | undefined>{
        assert((id !== null && id !== undefined), "Cannot get NFTEntity entity without an ID");
        const record = await store.get('NFTEntity', id.toString());
        if (record){
            return NFTEntity.create(record);
        }else{
            return;
        }
    }


    static async getByName(name: string): Promise<NFTEntity[] | undefined>{
      
      const records = await store.getByField('NFTEntity', 'name', name);
      return records.map(record => NFTEntity.create(record));
      
    }

    static async getByCollectionId(collectionId: string): Promise<NFTEntity[] | undefined>{
      
      const records = await store.getByField('NFTEntity', 'collectionId', collectionId);
      return records.map(record => NFTEntity.create(record));
      
    }

    static async getByIssuer(issuer: string): Promise<NFTEntity[] | undefined>{
      
      const records = await store.getByField('NFTEntity', 'issuer', issuer);
      return records.map(record => NFTEntity.create(record));
      
    }

    static async getByBlockNumber(blockNumber: bigint): Promise<NFTEntity[] | undefined>{
      
      const records = await store.getByField('NFTEntity', 'blockNumber', blockNumber);
      return records.map(record => NFTEntity.create(record));
      
    }


    static create(record: Partial<Omit<NFTEntity, FunctionPropertyNames<NFTEntity>>> & Entity): NFTEntity {
        assert(typeof record.id === 'string', "id must be provided");
        let entity = new NFTEntity(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
