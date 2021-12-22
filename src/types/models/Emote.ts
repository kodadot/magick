// Auto-generated , DO NOT EDIT
import {Entity, FunctionPropertyNames} from "@subql/types";
import assert from 'assert';




export class Emote implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public nftId: string;

    public caller: string;

    public value: string;

    public timestamp?: Date;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save Emote entity without an ID");
        await store.set('Emote', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove Emote entity without an ID");
        await store.remove('Emote', id.toString());
    }

    static async get(id:string): Promise<Emote | undefined>{
        assert((id !== null && id !== undefined), "Cannot get Emote entity without an ID");
        const record = await store.get('Emote', id.toString());
        if (record){
            return Emote.create(record);
        }else{
            return;
        }
    }


    static async getByNftId(nftId: string): Promise<Emote[] | undefined>{
      
      const records = await store.getByField('Emote', 'nftId', nftId);
      return records.map(record => Emote.create(record));
      
    }


    static create(record: Partial<Omit<Emote, FunctionPropertyNames<Emote>>> & Entity): Emote {
        assert(typeof record.id === 'string', "id must be provided");
        let entity = new Emote(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
