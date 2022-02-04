# Magick 
### SubQuery Indexer for RMRK NFT Standard
---

The SubQuery Indexer is suitable for any Substrate chain which wants to parse strings into the NFTs.
This readme will go through the steps to set up the SubQuery Indexer and provide some valuable hacks for ease of development.
A SubQuery package defines which data The SubQuery will index from the Substrate blockchain and how it will store it. 

> ⚠️ caveat ⚠️: This indexer is can only index RMRK 1.0.0 standard NFTs. If you plan to hack 2.0.0, we would love to welcome you with a PR.

### Prerequisites 🎒

```md
node >= 14
yarn 🧶
docker 🐳
[just](https://github.com/casey/just) 🤖
```

### Hyper start 🚀

First, we need to install dependencies.
```bash
just quickstart
```

then in the terminal run:
```
just up
```

## I want to change something in this project

The core of this indexer is the following files:

- Which events/extrinsics to index + configuration - `project.yaml`
- Entities which we want to save in DB - `schema.graphql`
- How map events/extrinsics to the GraphQL - `src/mappings/` directory

For more information on how to write the SubQuery, 
check out our doc section on [Define the SubQuery](https://doc.subquery.network/define_a_subquery.html) 

### I want to add/remove fields that are indexed

Open `schema.graphql` and modify the entities how much you want. [Supported types can be found here](https://doc.subquery.network/create/graphql/#entities)

The example entity looks like this:

```graphql
type CollectionEntity @entity {
  id: ID!
  issuer: String!
  currentOwner: String!
  metadata: String
  nfts: [NFTEntity] @derivedFrom(field: "collection")
  blockNumber: BigInt @index
  burned: Boolean!
  createdAt: Date!
}
```

Each entity needs to have an `id: ID!` field. An exclamation mark (`!`) says that the field is required, and without it, the entity will not be indexed, and the database will fail on null-pointer.

You can also define relationships between entities. For example, if you want to index one-to-many relation, it can be defined like `nfts: [NFTEntity] @derivedFrom(field: "collection")`. `@derivedFrom(field: "collection")` indicates that collection can be queried backwards from `NFTEntity`. 

```graphql
type NFTEntity @entity {
  id: ID!
  collection: CollectionEntity!
}
```

If you changed the schema, we need to regenerate it by running:
````
just types
````

## I want to add a new event/extrinsic to the index

in `project.yaml` add the new event/extrinsic create new record under the handlers to index:
```yaml
    handlers:
      - handler: handleCall
        kind: substrate/CallHandler
        filter:
          module: utility
          method: batchAll
          success: true
```

then in `src/mappings/mappingHandlers.ts` add the new mapping:
```ts
import {
  SubstrateExtrinsic,
} from '@subql/types'

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
  // your implementation should go here
}
```

after you implement what you need, run:
```
just build
```

#### Indexing and Query

To spin up the indexer, run:
```
just up
```

It will start the indexer and the SubQuery server.

#### Writing the first query

To query the data open your browser and head to `http://localhost:3000`.

Finally, you should see a GraphQL playground is showing in the explorer and the schemas that ready to query.

For example, to query first 5 nfts and their collection, you can run:
````graphql
query {
  nFTEntities(first: 5) {
    nodes {
      id
      issuer
      collection {
        id
        metadata
      }
    }
  }
}
````

### Dev hacks (FAQ) 🦇

We use [just](https://github.com/casey/just), and we recommend using it.

**1. How can I turn off the indexer properly?** 

```bash
just down
```

**2. I made a change in mapper. How to re-run the app again?** 

```bash
just bug
```
**3. My DB is a complete mess. How to start again?** 

```bash
just clear
```

**4. How can I check for the new version of the SubQuery Indexer?** 

```bash
just pull
```
