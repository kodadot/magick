import { Inject, Injectable } from '@nestjs/common';
import { FindConditions, In, Repository } from 'typeorm';
import { RepositoryConsts } from 'src/common/orm/repositoryConsts';
import {
  Event, NFTChild, Resource,
} from './support/types/interfaces'


import { NFTEntities } from 'src/common/entity/RMRKModule/NFTEntities';
import { EventEntities } from 'src/common/entity/RMRKModule/EventEntities';
import { CollectionEntities } from 'src/common/entity/RMRKModule/CollectionEntities';
import { Emotes } from 'src/common/entity/RMRKModule/Emotes';
import { FailedEntities } from 'src/common/entity/RMRKModule/FailedEntities';
import { RemarkEntities } from 'src/common/entity/RMRKModule/RemarkEntities';
import { MyLogger } from 'src/common/log/logger.service';
import { FunctionExt } from 'src/common/utility/functionExt';
import { Collection, eventFrom, getNftId_V01, getNftId_V1, getNftId_V2, NFT, RmrkAcceptInteraction, RmrkAcceptType, RmrkEvent, RmrkInteraction, RmrkResAddInteraction, RmrkSendInteraction, RmrkSpecVersion } from './support/utils/types';
import NFTUtils, { hexToString } from './support/utils/NftUtils';
import { RemarkResult } from './support/utils';
import { canOrElseError, exists, hasMeta, isBurned, isBuyLegalOrElseError, isOwner, isOwnerOrElseError, isPositiveOrElseError, isTransferable, unwrapBuyPrice, validateMeta, validateNFT } from './support/utils/consolidator';
import { emoteId, ensureInteraction } from './support/utils/helper';
import { randomBytes } from 'crypto';

@Injectable()
export class RMRKOffchainProcessorService {
  truncateFlag: boolean = false;
  runFlag: boolean = true;
  interval: number = 1 * 1000;
  processBatchSize = 100;

  constructor(

    @Inject(RepositoryConsts.RMRK_COLLECTION_REPOSITORY)
    private collectionRepository: Repository<CollectionEntities>,

    @Inject(RepositoryConsts.RMRK_EMOTE_REPOSITORY)
    private emoteRepository: Repository<Emotes>,

    @Inject(RepositoryConsts.RMRK_EVENT_REPOSITORY)
    private eventRepository: Repository<EventEntities>,

    @Inject(RepositoryConsts.RMRK_FAILED_REPOSITORY)
    private failedRepository: Repository<FailedEntities>,

    @Inject(RepositoryConsts.RMRK_NFT_REPOSITORY)
    private nftRepository: Repository<NFTEntities>,

    @Inject(RepositoryConsts.RMRK_REMARK_REPOSITORY)
    private remarkRepository: Repository<RemarkEntities>,
  ) {
  }

  async startProcess() {

    if (this.truncateFlag) {
      await this.truncatePreviousData();
    }

    MyLogger.verbose('startProcess ' + this.runFlag);
    while (this.runFlag) {
      try {
        let remarkRecords = await this.remarkRepository.find({
          where: {
            processed: 0
          },
          order: {
            blockNumber: 'ASC'
          },
          take: this.processBatchSize,
        });

        if (remarkRecords && remarkRecords.length > 0) {
          MyLogger.verbose('start to process ' + remarkRecords.length + ' remark records');

          await this.handleRemark(remarkRecords);
        }
        else {
          MyLogger.verbose('no remark records to process ');
        }

      } catch (error) {
        MyLogger.error('process with error:' + error);
      }
      finally {
        MyLogger.verbose('sleep for ' + this.interval);
        await FunctionExt.sleep(this.interval);
      }
    }
  }
  async truncatePreviousData() {
    MyLogger.warn('truncate previous data');
    await this.eventRepository.createQueryBuilder().delete()
      .from(EventEntities)
      .where("id is not null ")
      .execute();

    await this.failedRepository.createQueryBuilder().delete()
      .from(FailedEntities)
      .where("id is not null ")
      .execute();

    await this.emoteRepository.createQueryBuilder().delete()
      .from(Emotes)
      .where("id is not null ")
      .execute();

    await this.nftRepository.createQueryBuilder().delete()
      .from(NFTEntities)
      .where("id is not null ")
      .execute();

    await this.collectionRepository.createQueryBuilder().delete()
      .from(CollectionEntities)
      .where("id is not null ")
      .execute();

  }
  async handleRemark(remarkRecords: RemarkEntities[]) {
    for (let index = 0; index < remarkRecords.length; index++) {
      MyLogger.verbose('handleRemark index=' + index);
      const remarkEntity = remarkRecords[index];

      let handleRemarkResult = 0;
      try {
        let remark: RemarkResult = {
          ...remarkEntity,
          extra: JSON.parse(remarkEntity.extra)
        }
        const decoded = hexToString(remark.value);
        const event: RmrkEvent = NFTUtils.getAction(decoded);
        const specVersion: RmrkSpecVersion = NFTUtils.getRmrkSpecVersion(decoded);

        MyLogger.verbose('handleRemark event=' + event + ',specVersion=' + specVersion + ',decoded=' + decoded);

        switch (event) {
          case RmrkEvent.CREATE:
            if (specVersion == RmrkSpecVersion.V2) {
              await this.collection_V2(remark);
            }
            break;
          case RmrkEvent.MINT:
            if (specVersion == RmrkSpecVersion.V1 || specVersion == RmrkSpecVersion.V01) {
              await this.collection_V1(remark, specVersion);
            }
            else {
              await this.mintNFT_V2(remark);
            }
            break;
          case RmrkEvent.MINTNFT:
            await this.mintNFT_V1(remark)
            break;
          case RmrkEvent.SEND:
            if (specVersion == RmrkSpecVersion.V1 || specVersion == RmrkSpecVersion.V01) {
              await this.send_V1(remark);
            }
            else if (specVersion == RmrkSpecVersion.V2) {
              await this.send_V2(remark);
            }
            break;
          case RmrkEvent.BUY:
            await this.buy(remark)
            break;
          case RmrkEvent.CONSUME:
          case RmrkEvent.BURN:
            await this.consume(remark, event);

            break;
          case RmrkEvent.LIST:
            await this.list(remark)
            break;
          case RmrkEvent.CHANGEISSUER:
            await this.changeIssuer(remark)
            break;
          case RmrkEvent.EMOTE:
            await this.emote(remark);
            break;

          //Standard 2.0.0  
          case RmrkEvent.ACCEPT:
            await this.accept(remark);
            break;
          case RmrkEvent.RESADD:
            await this.resAdd(remark);
            break;

          default:
            MyLogger.warn(`[SKIP] ${event}::${remark.value}::${remark.blockNumber}`);
        }
        handleRemarkResult = 1;

      } catch (e) {
        MyLogger.error(`[MALFORMED] ${remarkEntity.blockNumber}::${hexToString(remarkEntity.value)}`)
        handleRemarkResult = -1;
      }

      remarkEntity.processed = handleRemarkResult;
      await this.remarkRepository.save(remarkEntity);
    }
  }

  async saveEventEntities(eventsObj?: object | Event[]): Promise<string> {
    let eventId = '';
    if (eventsObj) {
      let events = eventsObj as Event[];
      for (let index = 0; index < events.length; index++) {
        const event = events[index];
        let id = (event.blockNumber) + '-' + index;
        let entity = new EventEntities();
        entity.id = id;
        entity.blockNumber = event.blockNumber;
        entity.timestamp = event.timestamp;
        entity.caller = event.caller;
        entity.interaction = event.interaction;
        entity.meta = event.meta;
        entity.interactionCollection = event.interactionCollection || '';
        entity.interactionNFT = event.interactionNFT || '';
        entity.interactionAccount = event.interactionAccount || '';
        entity.nftPrice = BigInt(event.nftPrice || 0);
        await this.eventRepository.save(entity);
        if (eventId) {
          eventId += ",";
        }
        eventId += entity.id;
      }
    }
    return eventId;
  }

  async collection_V1(remark: RemarkResult, version: RmrkSpecVersion) {
    let collection = null
    try {
      collection = NFTUtils.unwrap(remark.value) as Collection
      canOrElseError<string>(exists, collection.id, true)
      const entity = await this.collectionRepository.findOne(collection.id)
      canOrElseError<CollectionEntities>(exists, entity);

      const newCollection = new CollectionEntities();
      newCollection.id = collection.id;

      if (!collection.symbol) {
        collection.symbol = '';
      }
      if (!collection.name) {
        collection.name = collection.symbol;
      }

      newCollection.version = version;
      newCollection.name = collection.name.trim()
      newCollection.max = Number(collection.max)
      newCollection.issuer = remark.caller
      newCollection.currentOwner = remark.caller
      newCollection.symbol = collection.symbol.trim()
      newCollection.blockNumber = remark.blockNumber
      newCollection.metadata = collection.metadata
      newCollection.timestampCreatedAt = remark.timestamp;
      newCollection.timestampUpdatedAt = remark.timestamp;

      let event = eventFrom(RmrkEvent.MINT, remark, '', collection.id, '', newCollection.currentOwner, BigInt(0).toString());
      newCollection.eventId = await this.saveEventEntities(event);

      MyLogger.verbose(`SAVED [COLLECTION] ${newCollection.id}`)
      await this.collectionRepository.save(newCollection)
    } catch (e) {
      MyLogger.error(`[COLLECTION] ${e.message}, ${JSON.stringify(collection)}`)
      await this.logFail(JSON.stringify(collection), e.message, RmrkEvent.MINT, remark)
    }

  }
  async collection_V2(remark: RemarkResult) {
    this.collection_V1(remark, RmrkSpecVersion.V2);
  }


  // collection does not exist , error logic to mintNFT.
  // The mint should be called before minNFT.
  // But there are some records that call minNFT directly.
  // So we need to  create the missing collection automatically.
  async checkCollection(collection: CollectionEntities, nft: NFT, specVersion: RmrkSpecVersion, remark: RemarkResult): Promise<CollectionEntities> {
    if (collection && collection.id) {
      return collection;
    }
    else {

      if (nft && nft.collection) {
        const newCollection = new CollectionEntities();
        newCollection.id = nft.collection;
        newCollection.symbol = nft.collection;
        newCollection.name = nft.collection;
        newCollection.version = specVersion;
        newCollection.max = 9999;
        newCollection.issuer = remark.caller;
        newCollection.currentOwner = remark.caller;
        newCollection.blockNumber = remark.blockNumber;
        newCollection.metadata = '';
        newCollection.timestampCreatedAt = remark.timestamp;
        newCollection.timestampUpdatedAt = remark.timestamp;

        let event = eventFrom(RmrkEvent.MINT, remark, '', newCollection.id, '', newCollection.currentOwner, BigInt(0).toString());
        newCollection.eventId = await this.saveEventEntities(event);

        MyLogger.verbose(`SAVED [COLLECTION] ${newCollection.id}`)
        await this.collectionRepository.save(newCollection);

        return newCollection;
      }

    }
    canOrElseError<CollectionEntities>(exists, collection, true);
  }


  async mintNFT_V1(remark: RemarkResult) {
    let nft = null;
    const specVersion: RmrkSpecVersion = NFTUtils.getRmrkSpecVersion(remark.value)

    try {

      nft = NFTUtils.unwrap(remark.value) as NFT;
      canOrElseError<string>(exists, nft.collection, true);

      let collection = await this.collectionRepository.findOne(nft.collection);
      collection = await this.checkCollection(collection, nft, RmrkSpecVersion.V1, remark);

      isOwnerOrElseError(collection, remark.caller);

      if (specVersion === RmrkSpecVersion.V01) {
        nft.id = getNftId_V01(nft);
      } else if (specVersion === RmrkSpecVersion.V1) {
        nft.id = getNftId_V1(nft, remark.blockNumber);
      }
      const newNFT = new NFTEntities();
      newNFT.id = nft.id;
      newNFT.issuer = remark.caller;
      newNFT.currentOwner = remark.caller;
      newNFT.blockNumber = remark.blockNumber;
      newNFT.name = nft.name;
      newNFT.instance = nft.instance;
      newNFT.transferable = nft.transferable;
      newNFT.collectionId = nft.collection;
      newNFT.sn = nft.sn;
      newNFT.metadata = nft.metadata;
      newNFT.price = BigInt(0).toString();
      newNFT.burned = false;
      newNFT.timestampCreatedAt = remark.timestamp;
      newNFT.timestampUpdatedAt = remark.timestamp;

      let event = eventFrom(RmrkEvent.MINTNFT, remark, '', collection.id, newNFT.id, newNFT.currentOwner, (newNFT.price));
      newNFT.eventId = await this.saveEventEntities(event);

      MyLogger.verbose(`SAVED [MINT_NFT ${specVersion} SIMPLE] ${newNFT.id}`)
      await this.nftRepository.save(newNFT);
    } catch (e) {
      MyLogger.error(`[MINT_NFT ${specVersion} ] ${e.message} ${JSON.stringify(nft)} ${JSON.stringify(remark)}`)
      await this.logFail(JSON.stringify(nft), e.message, RmrkEvent.MINTNFT, remark)
    }
  }

  async mintNFT_V2(remark: RemarkResult) {
    let nft = null
    try {
      nft = NFTUtils.unwrap(remark.value) as NFT;
      let recipient = NFTUtils.unwrap_V2_MINT_RECIPIENT(remark.value);
      canOrElseError<string>(exists, nft.collection, true);

      let collection = await this.collectionRepository.findOne(nft.collection);
      collection = await this.checkCollection(collection, nft, RmrkSpecVersion.V1, remark);

      isOwnerOrElseError(collection, remark.caller);

      nft.id = getNftId_V2(nft, remark.blockNumber);
      const newNFT = new NFTEntities();
      newNFT.id = nft.id;
      newNFT.issuer = remark.caller;
      newNFT.currentOwner = remark.caller;
      newNFT.blockNumber = remark.blockNumber;
      newNFT.name = nft.name;
      newNFT.instance = nft.instance;
      newNFT.transferable = nft.transferable;
      newNFT.collectionId = nft.collection;
      newNFT.sn = nft.sn;
      newNFT.metadata = nft.metadata;
      newNFT.price = BigInt(0).toString();
      newNFT.burned = false;
      newNFT.timestampCreatedAt = remark.timestamp;
      newNFT.timestampUpdatedAt = remark.timestamp;

      let event = eventFrom(RmrkEvent.MINTNFT, remark, '', collection.id, newNFT.id, newNFT.currentOwner, newNFT.price);
      newNFT.eventId = await this.saveEventEntities(event);

      if (!recipient) {

        MyLogger.verbose(`SAVED [MINT_NFT V2 SIMPLE] ${newNFT.id}`);
        await this.nftRepository.save(newNFT);

      }

      else {
        newNFT.currentOwner = recipient;

        const parentNFT = await this.nftRepository.findOne(recipient);
        if (!parentNFT) {
          // mint nft to the specified account directly        
          MyLogger.verbose(`SAVED [MINT_NFT V2 TO ACCOUNT] ${newNFT.id}`);
          await this.nftRepository.save(newNFT);
        }
        else {
          // mint nft to the specified nft as child 

          if (!parentNFT.children) {
            parentNFT.children = [];
          }
          let newNFTChild: NFTChild = { id: newNFT.id, equipped: '', pending: false };
          let children = (parentNFT.children as any[]);
          children.push(newNFTChild);
          parentNFT.children = children;

          parentNFT.timestampUpdatedAt = remark.timestamp;
          await this.nftRepository.save(parentNFT);

          MyLogger.verbose(`SAVED [MINT_NFT V2 TO NFT] ${newNFT.id}`);
          await this.nftRepository.save(newNFT);
        }
      }

    } catch (e) {
      MyLogger.error(`[MINT_NFT V2] ${e.message} ${JSON.stringify(nft)} ${JSON.stringify(remark)}`)
      await this.logFail(JSON.stringify(nft), e.message, RmrkEvent.MINTNFT, remark)
    }
  }

  async send_V1(remark: RemarkResult) {
    let interaction: RmrkSendInteraction = null

    try {
      interaction = (NFTUtils.unwrap_SEND(remark.value) as RmrkSendInteraction);
      const specVersion: RmrkSpecVersion = NFTUtils.getRmrkSpecVersion(remark.value);

      const currentNFT = await this.nftRepository.findOne(interaction.id);
      validateNFT(currentNFT)
      isOwnerOrElseError(currentNFT, remark.caller)

      if (specVersion === RmrkSpecVersion.V1 || specVersion === RmrkSpecVersion.V01) {
        //Standard 1.0.0: auto ACCEPT     
        // currentNFT.price = BigInt(0);
        let event = eventFrom(RmrkEvent.SEND, remark, interaction.recipient, currentNFT.collectionId, currentNFT.id, currentNFT.currentOwner, currentNFT.price);
        currentNFT.currentOwner = interaction.recipient;
        currentNFT.timestampUpdatedAt = remark.timestamp;

        currentNFT.eventId = await this.saveEventEntities(event);

        await this.nftRepository.save(currentNFT)
      }


    } catch (e) {
      MyLogger.warn(`[SEND V1] ${e.message} ${JSON.stringify(interaction)}`)
      await this.logFail(JSON.stringify(interaction), e.message, RmrkEvent.SEND, remark)
    }
  }
  async send_V2(remark: RemarkResult) {
    let interaction: RmrkSendInteraction = null

    try {
      interaction = (NFTUtils.unwrap_SEND(remark.value) as RmrkSendInteraction)
      const specVersion: RmrkSpecVersion = NFTUtils.getRmrkSpecVersion(remark.value);

      const currentNFT = await this.nftRepository.findOne(interaction.id);
      validateNFT(currentNFT)
      isOwnerOrElseError(currentNFT, remark.caller)

      if (specVersion === RmrkSpecVersion.V2) {
        // Standard 2.0.0: 
        const targetNFT = await this.nftRepository.findOne(interaction.recipient);

        if (!targetNFT) {
          //sending nft to account
          //same logic handle as RmrkSpecVersion.V1
          // currentNFT.price = BigInt(0);
          let event = eventFrom(RmrkEvent.SEND, remark, interaction.recipient, currentNFT.collectionId, currentNFT.id, currentNFT.currentOwner, currentNFT.price);
          currentNFT.currentOwner = interaction.recipient;
          currentNFT.timestampUpdatedAt = remark.timestamp;

          currentNFT.eventId = await this.saveEventEntities(event);

          await this.nftRepository.save(currentNFT);

        }
        else {
          // check if same owner for the source NFT and targetNFT
          let sameOwner = isOwner(targetNFT, remark.caller);
          let pending: boolean = true;
          if (sameOwner) {
            // same owner => auto ACCEPT
            pending = false;
          }


          let nftChild: NFTChild = {
            id: currentNFT.id,
            pending: pending,
            equipped: ''
          };
          if (!targetNFT.children) {
            targetNFT.children = [];
          }
          let children = (targetNFT.children as any[]);
          children.push(nftChild);
          targetNFT.children = children;
          targetNFT.timestampUpdatedAt = remark.timestamp;
          await this.nftRepository.save(targetNFT);


          let currentOwner = currentNFT.currentOwner;
          //remove currentNFT from its parent if it has parent.
          if (currentOwner) {
            const parent = await this.nftRepository.findOne(currentNFT.currentOwner);
            if (!parent) {
              //the parent should be a account, no need to handle children properties
            }
            else {
              if (parent.children) {
                let chilren = parent.children as any[];
                let findIndex = chilren.findIndex((value, index, array) => {
                  return value.id === currentNFT.id
                });
                if (findIndex >= 0) {
                  chilren.splice(findIndex, 1);
                  parent.children = chilren;
                  parent.timestampUpdatedAt = remark.timestamp;
                  await this.nftRepository.save(parent);
                }
              }
            }
            //update currentNFT.currentOwner =>  targetNFT.id             
            let event = eventFrom(RmrkEvent.SEND, remark, interaction.recipient, currentNFT.collectionId, currentNFT.id, currentNFT.currentOwner, currentNFT.price);
            currentNFT.currentOwner = targetNFT.id;
            currentNFT.timestampUpdatedAt = remark.timestamp;

            currentNFT.eventId = await this.saveEventEntities(event);

            await this.nftRepository.save(currentNFT);

          }
        }
      }

    } catch (e) {
      MyLogger.warn(`[SEND V2] ${e.message} ${JSON.stringify(interaction)}`)
      await this.logFail(JSON.stringify(interaction), e.message, RmrkEvent.SEND, remark)
    }
  }

  async buy(remark: RemarkResult) {
    let interaction = null;

    try {
      interaction = ensureInteraction(NFTUtils.unwrap(remark.value) as RmrkInteraction);
      const nft = await this.nftRepository.findOne(interaction.id);
      // exists
      // not burned
      // transferable
      // has meta
      // enough money ?
      canOrElseError<NFTEntities>(exists, nft, true);
      canOrElseError<NFTEntities>(isBurned, nft);
      canOrElseError<NFTEntities>(isTransferable, nft, true);
      isPositiveOrElseError(BigInt(nft.price), true);
      isBuyLegalOrElseError(nft, remark.extra || []);
      nft.price = BigInt(unwrapBuyPrice(nft, remark.extra || [])).toString();  // Utility.batch_all => price for BUY
      let event = eventFrom(RmrkEvent.BUY, remark, remark.caller, nft.collectionId, nft.id, nft.currentOwner, nft.price);
      nft.currentOwner = remark.caller;
      nft.timestampUpdatedAt = remark.timestamp;

      nft.eventId = await this.saveEventEntities(event);


      await this.nftRepository.save(nft);

    } catch (e) {
      MyLogger.warn(`[BUY] ${e.message} ${JSON.stringify(interaction)}`)
      await this.logFail(JSON.stringify(interaction), e.message, RmrkEvent.BUY, remark)
    }

  }

  //Standard 1.0.0 CONSUME
  //Standard 2.0.0 BURN as alias
  async consume(remark: RemarkResult, eventAlias: RmrkEvent) {
    let interaction = null;

    try {
      interaction = ensureInteraction(NFTUtils.unwrap(remark.value) as RmrkInteraction);
      const nft = await this.nftRepository.findOne(interaction.id)
      canOrElseError<NFTEntities>(exists, nft, true);
      canOrElseError<NFTEntities>(isBurned, nft);
      isOwnerOrElseError(nft, remark.caller);
      nft.price = BigInt(0).toString();
      nft.burned = true;
      let event = eventFrom(eventAlias, remark, interaction.metadata, nft.collectionId, nft.id, nft.currentOwner, nft.price);
      nft.timestampUpdatedAt = remark.timestamp;

      nft.eventId = await this.saveEventEntities(event);

      await this.nftRepository.save(nft);

    } catch (e) {
      MyLogger.warn(`[${eventAlias}] ${e.message} ${JSON.stringify(interaction)}`);
      await this.logFail(JSON.stringify(interaction), e.message, eventAlias, remark);
    }
  }

  async list(remark: RemarkResult) {
    let interaction = null;

    try {
      interaction = ensureInteraction(NFTUtils.unwrap(remark.value) as RmrkInteraction);
      const nft = await this.nftRepository.findOne(interaction.id);
      validateNFT(nft);
      validateMeta(interaction);
      isOwnerOrElseError(nft, remark.caller);
      const price = BigInt(interaction.metadata);
      isPositiveOrElseError(price);
      nft.price = price.toString();
      let event = eventFrom(RmrkEvent.LIST, remark, interaction.metadata, nft.collectionId, nft.id, nft.currentOwner, nft.price);
      nft.timestampUpdatedAt = remark.timestamp;

      nft.eventId = await this.saveEventEntities(event);

      await this.nftRepository.save(nft);


    } catch (e) {

      MyLogger.warn(`[LIST] ${e.message} ${JSON.stringify(interaction)}`);
      await this.logFail(JSON.stringify(interaction), e.message, RmrkEvent.LIST, remark);
    }
    // exists
    // not burned
    // transferable
    // has meta
    // is owner
  }

  async changeIssuer(remark: RemarkResult) {
    let interaction = null

    try {
      interaction = ensureInteraction(NFTUtils.unwrap(remark.value) as RmrkInteraction)
      canOrElseError<RmrkInteraction>(hasMeta, interaction, true)
      const collection = await this.collectionRepository.findOne(interaction.id)
      canOrElseError<CollectionEntities>(exists, collection, true)
      isOwnerOrElseError(collection, remark.caller);
      let event = (eventFrom(RmrkEvent.CHANGEISSUER, remark, interaction.metadata, collection.id, '', collection.currentOwner, BigInt(0).toString()))
      collection.currentOwner = interaction.metadata;
      collection.eventId = await this.saveEventEntities(event);

      await this.collectionRepository.save(collection);
    } catch (e) {
      MyLogger.warn(`[CHANGEISSUER] ${e.message} ${JSON.stringify(interaction)}`)
      await this.logFail(JSON.stringify(interaction), e.message, RmrkEvent.CHANGEISSUER, remark)
    }


  }

  async emote(remark: RemarkResult) {
    let interaction = null

    try {
      interaction = ensureInteraction(NFTUtils.unwrap(remark.value) as RmrkInteraction)
      canOrElseError<RmrkInteraction>(hasMeta, interaction, true)
      const nft = await this.nftRepository.findOne(interaction.id)
      canOrElseError<NFTEntities>(exists, nft, true)
      canOrElseError<NFTEntities>(isBurned, nft)
      const id = emoteId(interaction, remark.caller)
      let emote: Emotes = await this.emoteRepository.findOne(id)

      if (exists(emote)) {
        await this.emoteRepository.remove(emote)
        return;
      }

      emote = ({
        id,
        nftId: interaction.id,
        caller: remark.caller,
        value: interaction.metadata,
        timestamp: remark.timestamp,

      })

      await this.emoteRepository.save(emote);

    } catch (e) {
      MyLogger.warn(`[EMOTE] ${e.message}`)
      await this.logFail(JSON.stringify(interaction), e.message, RmrkEvent.EMOTE, remark)
    }

    // exists
    // not burned
    // transferable
    // has meta
  }

  async logFail(message: string, reason: string, interaction: RmrkEvent, remark: RemarkResult) {
    try {
      let now = new Date();
      let fail: FailedEntities = {
        id: now.getTime() + '-' + randomBytes(5).toString('hex'),
        value: message,
        reason,
        interaction,
        remark: JSON.stringify(remark),
        timestamp: now,

      };

      await this.failedRepository.save(fail);

    } catch (e) {
      MyLogger.warn(`[FAIL IN FAIL] ${interaction}::${message}`)
    }
  }

  async accept(remark: RemarkResult) {

    let interaction: RmrkAcceptInteraction = null
    try {
      interaction = NFTUtils.unwrap_ACCEPT(remark.value) as RmrkAcceptInteraction
      const nft = await this.nftRepository.findOne(interaction.id1)
      canOrElseError<NFTEntities>(exists, nft, true)
      canOrElseError<NFTEntities>(isBurned, nft)

      let entity = interaction.entity;
      if (entity === RmrkAcceptType.RES) {
        let resId = interaction.id2;
        if (nft.resources) {
          let resources = nft.resources as any[];
          for (let index = 0; index < resources.length; index++) {
            const res = resources[index];
            if (res.id === resId) {
              res.pending = false;
            }
          }
          nft.resources = resources;
        }
      }
      else if (entity === RmrkAcceptType.NFT) {
        let nftChildId = interaction.id2;
        if (nft.children) {
          let children = nft.children as any[];
          for (let index = 0; index < children.length; index++) {
            const child = children[index];
            if (child.id === nftChildId) {
              child.pending = false;
            }
          }
          nft.children = children;
        }

      }

      let event = eventFrom(RmrkEvent.ACCEPT, remark, interaction.id2, nft.collectionId, nft.id, nft.currentOwner, nft.price);
      nft.timestampUpdatedAt = remark.timestamp;

      nft.eventId = await this.saveEventEntities(event);

      await this.nftRepository.save(nft);

    } catch (e) {
      MyLogger.warn(`[ACCEPT] ${e.message} ${JSON.stringify(interaction)}`);
      await this.logFail(JSON.stringify(interaction), e.message, RmrkEvent.ACCEPT, remark);
    }

  }
  async resAdd(remark: RemarkResult) {

    let interaction = null
    try {
      interaction = ensureInteraction(NFTUtils.unwrap_RESADD(remark.value) as RmrkResAddInteraction)
      const nft = await this.nftRepository.findOne(interaction.id)
      canOrElseError<NFTEntities>(exists, nft, true)
      canOrElseError<NFTEntities>(isBurned, nft)

      let metadataJson = interaction.metadata;
      let json = JSON.parse(metadataJson);
      if (!json) {
        throw new TypeError(`RMRK: Unable to parse metadata as JSON object: ${interaction.metadata}`)
      }

      let resId = json.id || '';
      let resSrc = json.src || '';
      let resMetadata = metadataJson || '';

      if (!resId) {
        throw new TypeError(`RMRK: invalid resource id`)
      }

      if (!nft.priority) {
        nft.priority = [];
      }
      let priority = (nft.priority as any[]);
      priority.push(resId);
      nft.priority = priority;

      let newResource: Resource = {
        id: resId,
        src: resSrc,
        metadata: resMetadata,
        pending: true   // enter a pending state and MUST be accepted with a ACCEPT 
      };
      if (isOwner(nft, remark.caller)) {
        //If the issuer is also the owner of this NFT, this interaction also counts as a ACCEPT automatically.
        //auto ACCEPT
        newResource.pending = false;
      }
      if (!nft.resources) {
        nft.resources = [];
      }
      let resources = (nft.resources as any[]);
      resources.push(newResource);
      nft.resources = resources;

      let event = (eventFrom(RmrkEvent.RESADD, remark, interaction.metadata, nft.collectionId, nft.id, nft.currentOwner, nft.price));
      nft.timestampUpdatedAt = remark.timestamp;

      nft.eventId = await this.saveEventEntities(event);

      await this.nftRepository.save(nft);

    } catch (e) {
      MyLogger.warn(`[RESADD] ${e.message} ${JSON.stringify(interaction)}`);
      await this.logFail(JSON.stringify(interaction), e.message, RmrkEvent.RESADD, remark);
    }

  }
}
