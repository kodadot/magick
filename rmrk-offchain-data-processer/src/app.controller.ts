import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { AppService } from './app.service';
import { MyLogger } from './common/log/logger.service';
import { RMRKOffchainProcessorService } from './rmrk-processor/rmrk-offchain-processor.service';



@Controller('/')
export class AppController {
  constructor(private readonly appService: AppService, private readonly processorService: RMRKOffchainProcessorService) {
    processorService.startProcess();
  }

}
