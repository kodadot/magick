// Auto-generated , DO NOT EDIT
import {Entity, FunctionPropertyNames} from "@subql/types";
import assert from 'assert';




export class RemarkEntity implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public value: string;

    public caller: string;

    public blockNumber: string;

    public interaction?: string;

    public timestamp?: Date;

    public extra?: string;

    public specVersion?: string;

    public processed?: number;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save RemarkEntity entity without an ID");
        await store.set('RemarkEntity', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove RemarkEntity entity without an ID");
        await store.remove('RemarkEntity', id.toString());
    }

    static async get(id:string): Promise<RemarkEntity | undefined>{
        assert((id !== null && id !== undefined), "Cannot get RemarkEntity entity without an ID");
        const record = await store.get('RemarkEntity', id.toString());
        if (record){
            return RemarkEntity.create(record);
        }else{
            return;
        }
    }



    static create(record: Partial<Omit<RemarkEntity, FunctionPropertyNames<RemarkEntity>>> & Entity): RemarkEntity {
        assert(typeof record.id === 'string', "id must be provided");
        let entity = new RemarkEntity(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
