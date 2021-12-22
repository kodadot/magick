// Auto-generated , DO NOT EDIT
import {Entity, FunctionPropertyNames} from "@subql/types";
import assert from 'assert';

import {
    Event,
} from '../interfaces'




export class CollectionEntity implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public version?: string;

    public name?: string;

    public max?: number;

    public issuer?: string;

    public symbol?: string;

    public id: string;

    public metadata?: string;

    public currentOwner?: string;

    public events?: Event[];

    public blockNumber?: bigint;

    public timestampCreatedAt?: Date;

    public timestampUpdatedAt?: Date;

    public eventId?: string;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save CollectionEntity entity without an ID");
        await store.set('CollectionEntity', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove CollectionEntity entity without an ID");
        await store.remove('CollectionEntity', id.toString());
    }

    static async get(id:string): Promise<CollectionEntity | undefined>{
        assert((id !== null && id !== undefined), "Cannot get CollectionEntity entity without an ID");
        const record = await store.get('CollectionEntity', id.toString());
        if (record){
            return CollectionEntity.create(record);
        }else{
            return;
        }
    }


    static async getByBlockNumber(blockNumber: bigint): Promise<CollectionEntity[] | undefined>{
      
      const records = await store.getByField('CollectionEntity', 'blockNumber', blockNumber);
      return records.map(record => CollectionEntity.create(record));
      
    }


    static create(record: Partial<Omit<CollectionEntity, FunctionPropertyNames<CollectionEntity>>> & Entity): CollectionEntity {
        assert(typeof record.id === 'string', "id must be provided");
        let entity = new CollectionEntity(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
