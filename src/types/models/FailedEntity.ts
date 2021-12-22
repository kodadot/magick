// Auto-generated , DO NOT EDIT
import {Entity, FunctionPropertyNames} from "@subql/types";
import assert from 'assert';




export class FailedEntity implements Entity {

    constructor(id: string) {
        this.id = id;
    }


    public id: string;

    public value: string;

    public reason: string;

    public interaction?: string;

    public remark?: string;

    public timestamp?: Date;


    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save FailedEntity entity without an ID");
        await store.set('FailedEntity', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove FailedEntity entity without an ID");
        await store.remove('FailedEntity', id.toString());
    }

    static async get(id:string): Promise<FailedEntity | undefined>{
        assert((id !== null && id !== undefined), "Cannot get FailedEntity entity without an ID");
        const record = await store.get('FailedEntity', id.toString());
        if (record){
            return FailedEntity.create(record);
        }else{
            return;
        }
    }



    static create(record: Partial<Omit<FailedEntity, FunctionPropertyNames<FailedEntity>>> & Entity): FailedEntity {
        assert(typeof record.id === 'string', "id must be provided");
        let entity = new FailedEntity(record.id);
        Object.assign(entity,record);
        return entity;
    }
}
