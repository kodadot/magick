
import { Connection } from 'typeorm';
import { RepositoryConsts } from './repositoryConsts';

import { CollectionEntities } from './../entity/RMRKModule/CollectionEntities';
import { NFTEntities } from './../entity/RMRKModule/NFTEntities';
import { RemarkEntities } from './../entity/RMRKModule/RemarkEntities';
import { EventEntities } from './../entity/RMRKModule/EventEntities';
import { FailedEntities } from './../entity/RMRKModule/FailedEntities';
import { Emotes } from '../entity/RMRKModule/Emotes';


export const repositoryProviders = [

  //#region RMRK
  {
    provide: RepositoryConsts.RMRK_COLLECTION_REPOSITORY,
    useFactory: (connection: Connection) => {
      return connection.getRepository(CollectionEntities);
    },
    inject: [RepositoryConsts.DATABASE_CONNECTION_RMRK],
  }, {
    provide: RepositoryConsts.RMRK_EMOTE_REPOSITORY,
    useFactory: (connection: Connection) => {
      return connection.getRepository(Emotes);
    },
    inject: [RepositoryConsts.DATABASE_CONNECTION_RMRK],
  },
  {
    provide: RepositoryConsts.RMRK_EVENT_REPOSITORY,
    useFactory: (connection: Connection) => {
      return connection.getRepository(EventEntities);
    },
    inject: [RepositoryConsts.DATABASE_CONNECTION_RMRK],
  }, {
    provide: RepositoryConsts.RMRK_FAILED_REPOSITORY,
    useFactory: (connection: Connection) => {
      return connection.getRepository(FailedEntities);
    },
    inject: [RepositoryConsts.DATABASE_CONNECTION_RMRK],
  },
  {
    provide: RepositoryConsts.RMRK_NFT_REPOSITORY,
    useFactory: (connection: Connection) => {
      return connection.getRepository(NFTEntities);
    },
    inject: [RepositoryConsts.DATABASE_CONNECTION_RMRK],
  },
  {
    provide: RepositoryConsts.RMRK_REMARK_REPOSITORY,
    useFactory: (connection: Connection) => {
      return connection.getRepository(RemarkEntities);
    },
    inject: [RepositoryConsts.DATABASE_CONNECTION_RMRK],
  },

  //#endregion
];
