import { Module } from '@nestjs/common';
import { StatusMonitorModule } from 'nestjs-status-monitor';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/orm/database.module';
import { repositoryProviders } from './common/orm/repository.providers';
import { RMRKOffchainProcessorService } from './rmrk-processor/rmrk-offchain-processor.service';
@Module({
  imports: [DatabaseModule,
    StatusMonitorModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [...repositoryProviders, AppService, RMRKOffchainProcessorService],
})
export class AppModule { }
