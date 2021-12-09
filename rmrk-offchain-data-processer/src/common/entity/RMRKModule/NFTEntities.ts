import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Emotes } from "./Emotes";
import { CollectionEntities } from "./CollectionEntities";

@Index("n_f_t_entities_block_number", ["blockNumber"], {})
@Index("n_f_t_entities_children", ["children"], {})
@Index("n_f_t_entities_collection_id", ["collectionId"], {})
@Index("n_f_t_entities_events", ["events"], {})
@Index("n_f_t_entities_pkey", ["id"], { unique: true })
@Index("n_f_t_entities_issuer", ["issuer"], {})
@Index("n_f_t_entities_name", ["name"], {})
@Index("n_f_t_entities_resources", ["resources"], {})
@Entity("n_f_t_entities", { schema: "public" })
export class NFTEntities {
  @Column("text", { name: "name", nullable: true })
  name: string | null;

  @Column("text", { name: "instance", nullable: true })
  instance: string | null;

  @Column("integer", { name: "transferable", nullable: true })
  transferable: number | null;

  @Column("text", { name: "collection_id" })
  collectionId: string;

  @Column("text", { name: "issuer", nullable: true })
  issuer: string | null;

  @Column("text", { name: "sn", nullable: true })
  sn: string | null;

  @Column("text", { primary: true, name: "id" })
  id: string;

  @Column("text", { name: "metadata", nullable: true })
  metadata: string | null;

  @Column("text", { name: "current_owner", nullable: true })
  currentOwner: string | null;

  @Column("numeric", { name: "price", nullable: true })
  price: string | null;

  @Column("boolean", { name: "burned", nullable: true })
  burned: boolean | null;

  @Column("numeric", { name: "block_number", nullable: true })
  blockNumber: string | null;

  @Column("jsonb", { name: "events", nullable: true })
  events: object | null;

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

  @Column("jsonb", { name: "priority", nullable: true })
  priority: object | null;

  @Column("jsonb", { name: "resources", nullable: true })
  resources: object | null;

  @Column("jsonb", { name: "children", nullable: true })
  children: object | null;

  @Column("text", { name: "event_id", nullable: true })
  eventId: string | null;





}
