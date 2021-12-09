import { Column, Entity, Index } from "typeorm";

@Index("event_entities_pkey", ["id"], { unique: true })
@Entity("event_entities", { schema: "public" })
export class EventEntities {
  @Column("text", { primary: true, name: "id" })
  id: string;

  @Column("text", { name: "block_number", nullable: true })
  blockNumber: string | null;

  @Column("timestamp without time zone", { name: "timestamp", nullable: true })
  timestamp: Date | null;

  @Column("text", { name: "caller" })
  caller: string;

  @Column("text", { name: "interaction", nullable: true })
  interaction: string | null;

  @Column("text", { name: "meta" })
  meta: string;

  @Column("text", { name: "interaction_collection", nullable: true })
  interactionCollection: string | null;

  @Column("text", { name: "interaction_n_f_t", nullable: true })
  interactionNFT: string | null;

  @Column("text", { name: "interaction_account", nullable: true })
  interactionAccount: string | null;

  @Column("numeric", { name: "nft_price", nullable: true })
  nftPrice: bigint | null;


}
