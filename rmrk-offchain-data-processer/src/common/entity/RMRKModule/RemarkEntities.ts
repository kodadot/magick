import { Column, Entity, Index } from "typeorm";

@Index("remark_entities_pkey", ["id"], { unique: true })
@Entity("remark_entities", { schema: "public" })
export class RemarkEntities {
  @Column("text", { primary: true, name: "id" })
  id: string;

  @Column("text", { name: "value" })
  value: string;

  @Column("text", { name: "caller" })
  caller: string;

  @Column("text", { name: "block_number" })
  blockNumber: string;

  @Column("text", { name: "interaction", nullable: true })
  interaction: string | null;

  @Column("timestamp without time zone", { name: "timestamp", nullable: true })
  timestamp: Date | null;
 
  @Column("text", { name: "extra", nullable: true })
  extra: string | null;

  @Column("text", { name: "spec_version", nullable: true })
  specVersion: string | null;

  @Column("integer", { name: "processed", nullable: true })
  processed: number | null;

}
