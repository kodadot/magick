import { Column, Entity, Index } from "typeorm";

@Index("failed_entities_pkey", ["id"], { unique: true })
@Entity("failed_entities", { schema: "public" })
export class FailedEntities {
  @Column("text", { primary: true, name: "id" })
  id: string;

  @Column("text", { name: "value" })
  value: string;

  @Column("text", { name: "reason" })
  reason: string;

  @Column("text", { name: "interaction", nullable: true })
  interaction: string | null;

  @Column("text", { name: "remark", nullable: true })
  remark: string | null;

  @Column("timestamp without time zone", { name: "timestamp", nullable: true })
  timestamp: Date | null;

 
}
