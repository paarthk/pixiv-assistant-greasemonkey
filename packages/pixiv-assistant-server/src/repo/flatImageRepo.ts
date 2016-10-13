import {Features, Model, Messages} from '../../common/proto'

import * as log4js from 'log4js'
import * as path from 'path'
import * as fs from 'fs'
import * as sanitize from 'sanitize-filename'

import {ActionCache} from '../utils/actionCache'
import {BaseRepo} from './baseRepo'
import {makederp} from '../utils/makederp'
import * as pathUtils from '../utils/path'
import * as downloadUtils from '../utils/download'
import * as promiseUtils from '../utils/promise'
import * as discoveryUtils from '../utils/discovery'
import * as dataStoreUtils from '../utils/dataStore'

import {FileRegistry} from './registry'

const opn = require('opn');

let logger = log4js.getLogger('ImageRepo');

interface RegistryMetaInfo {
	lastExecution: Date
}

export class ImageRepo extends BaseRepo {
	private static actions = new ActionCache();
	public getCache() {
		return ImageRepo.actions;
	}

	protected registry : FileRegistry;

	public constructor(repoPath:string) {
		super(repoPath);
		this.registry = new FileRegistry(repoPath);
	}
	
	protected get metaInfoPath() :string {
		return path.resolve(this.repoPath, 'metadb.json');
	}

	public initialize() :Promise<void> {
		let count = 0;
		return this.registry.initialize()
			.then(() => {
				dataStoreUtils.load<RegistryMetaInfo>(this.metaInfoPath)
					.catch(() => undefined)
					.then(dbInfo => {
						let predicate :discoveryUtils.FinderFilter = () => true;
						if (dbInfo) {
							logger.info('Finding files since last load on', dbInfo.lastExecution);
							predicate = (path, stats) => stats.mtime > dbInfo.lastExecution;
						} else {
							logger.info('Finding all files in repo to build initial registry');
						}
						return discoveryUtils.findFilesAddedSince(this.repoPath, predicate, 
							path => {
								logger.trace('found file added since last load at',path);
								count++;
								if (count % 1000 == 0) {
									logger.warn('reached',count);
								}
								this.registry.addFromPath(path)
							})
				})
				
			})
			.then(() => {
				logger.info('Initializing file watcher')
				return discoveryUtils.initializeFileWatcher(this.repoPath, path => {
					logger.trace('while watching, found a new file',path)
					this.registry.addFromPath(path)
				})
			})
	}

	public teardown() : Promise<void> {
		logger.info('Shutting down repo');
		return dataStoreUtils.save<RegistryMetaInfo>(this.metaInfoPath, {lastExecution: new Date()})
			.then(() => this.registry.teardown())
	}

	/**
	 * Open to root folder of repository
	 */
	@ImageRepo.actions.register(Features.OpenToRepo)
	public openRepo(){
		return makederp(this.repoPath).then(opn);
	}

	protected genArtistFolderName(artist:Model.Artist):string {
		return sanitize(pathUtils.avoidTrailingDot(`[${artist.id}] - ${artist.name}`));
	}
	protected getArtistFolderById(artistId:number) {
		return fs.readdirSync(this.repoPath).find(name => name.startsWith(`[${artistId}]`));
	}
	protected getEnsuredArtistFolder(artist:Model.Artist) {
		return this.getArtistFolderById(artist.id) || this.genArtistFolderName(artist);
	}
	@ImageRepo.actions.register(Features.OpenToArtist)
	public openArtistFolder(artist:Model.Artist) {
		return makederp(path.resolve(this.repoPath, this.getEnsuredArtistFolder(artist))).then(opn);
	}

	@ImageRepo.actions.register('OpenToImage' /* TODO: add to common proto */)
	public openImageFolder(msg:Messages.ImageRequest) {
		return this.registry.getImagePath(msg.image.id).then(path.basename).then(opn);
	}

	@ImageRepo.actions.register(Features.ImageExists)
	public imageExists(msg:Messages.ImageRequest):Promise<boolean> {
		return this.registry.getImagePath(msg.image.id)
			.then(() => true, () => false);
	}

	@ImageRepo.actions.register(Features.ImagesExist)
	public imagesExist(images: Messages.BulkRequest<Messages.ArtistImageRequest>) {
		return Promise.all(images.items.map(x => this.imageExists(x))).then(results => {
			let imagesFound = [] as Array<Messages.ArtistImageRequest>;
			results.forEach((exists, index) => {
				if (exists) {
					imagesFound.push(images.items[index]);
				}
			})
			return imagesFound;
		})
	}

	protected getDownloadFolder(artist:Model.Artist) {
		// switch on this.config.downloadLocation
		return this.getEnsuredArtistFolder(artist);
	}
	
	@ImageRepo.actions.register(Features.DownloadImage)
	public downloadImage(msg:Messages.ArtistUrlRequest) {
		return downloadUtils.downloadFromPixiv({ url: msg.url, path: path.join(this.repoPath, this.getDownloadFolder(msg.artist), path.basename(msg.url)) });
	}
	@ImageRepo.actions.register(Features.DownloadManga)
	public downloadManga(msg: Messages.BulkRequest<Messages.ArtistUrlRequest>) {
		// TODO: switch on manga download preference.
		logger.info('msg bulk download of', msg.items.length, 'items');
		let tasks = msg.items.map(msg => (() => this.downloadImage(msg)));
		return promiseUtils.promisePool(tasks, 8)
			.then(x => {
				logger.info('Completed download of',x.length,'files');
				return x;
			})
	}

	@ImageRepo.actions.register(Features.DownloadAnimation)
	public downloadAnimation(msg:Messages.ArtistImageRequest & {content:string}) {
		let details = downloadUtils.getDataUrlDetails(msg.content);
		if (details) {
			let location = path.join(this.repoPath, `${msg.image.id}.${details.mime.subtype}`);

			return makederp(path.dirname(location))
				.then(() => downloadUtils.writeBase64(location, details.content))
				.catch(err => console.log(err));
		}
	}
}
