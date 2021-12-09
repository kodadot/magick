import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { NFTEntities } from "./NFTEntities";

@Index("emotes_pkey", ["id"], { unique: true })
@Index("emotes_nft_id", ["nftId"], {})
@Entity("emotes", { schema: "public" })
export class Emotes {
  @Column("text", { primary: true, name: "id" })
  id: string;

  @Column("text", { name: "nft_id" })
  nftId: string;

  @Column("text", { name: "caller" })
  caller: string;

  @Column("text", { name: "value" })
  value: string;

  @Column("timestamp without time zone", { name: "timestamp", nullable: true })
  timestamp: Date | null;




}
