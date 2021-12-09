import { Column, Entity, Index, OneToMany } from "typeorm";
import { NFTEntities } from "./NFTEntities";

@Index("collection_entities_block_number", ["blockNumber"], {})
@Index("collection_entities_events", ["events"], {})
@Index("collection_entities_pkey", ["id"], { unique: true })
@Entity("collection_entities", { schema: "public" })
export class CollectionEntities {
  @Column("text", { name: "version", nullable: true })
  version: string | null;

  @Column("text", { name: "name", nullable: true })
  name: string | null;

  @Column("integer", { name: "max", nullable: true })
  max: number | null;

  @Column("text", { name: "issuer", nullable: true })
  issuer: string | null;

  @Column("text", { name: "symbol", nullable: true })
  symbol: string | null;

  @Column("text", { primary: true, name: "id" })
  id: string;

  @Column("text", { name: "metadata", nullable: true })
  metadata: string | null;

  @Column("text", { name: "current_owner", nullable: true })
  currentOwner: string | null;

  @Column("jsonb", { name: "events", nullable: true })
  events: object | null;

  @Column("numeric", { name: "block_number", nullable: true })
  blockNumber: string | null;

  @Column("timestamp without time zone", {
    name: "timestamp_created_at",
    nullable: true,
  })
  timestampCreatedAt: Date | null;

  @Column("timestamp without time zone", {
    name: "timestamp_updated_at",
    nullable: true,
  })
  timestampUpdatedAt: Date | null;

  @Column("text", { name: "event_id", nullable: true })
  eventId: string | null;




}
