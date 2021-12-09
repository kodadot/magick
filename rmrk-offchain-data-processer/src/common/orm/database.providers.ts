import { createConnection } from 'typeorm';
import { join } from 'path';
import { RepositoryConsts } from './repositoryConsts';
import { AppConfig } from './../setting/appConfig';

export const databaseProviders = [
 
  {
    provide: RepositoryConsts.DATABASE_CONNECTION_RMRK,
    useFactory: async () => {
      let connectionOption: any = {
        ...AppConfig.typeOrmOption4RMRKDB,
        entities: [
          join(__dirname, '..', 'entity', 'RMRKModule', '*.{js,ts}'),]
      };
      return await createConnection(connectionOption);
    },
  },
];
