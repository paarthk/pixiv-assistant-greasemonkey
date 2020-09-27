import {OnLoad} from './decorators';
import {RootPage} from './root';
import _log from './log';
const log = _log.setCategory('Artwork');

import {getBlob, getIllustInfo, getUgoiraMeta} from 'core/API';
import {extract, getFileName} from 'util/path';
import {IllustrationInfo, IllustrationType, UgoiraMeta} from 'core/api/models';
import {GenerateElement} from 'util/page';
import React from 'react';
import $ from 'cash-dom';
import {injectTrayButton} from './inject';
import {browser} from 'webextension-polyfill-ts';
import {BGCommand} from 'core/message';
import {saveAs} from 'file-saver';
import * as whammy from 'whammy';
import jszip from 'jszip';
import {execSequentially} from 'util/promise';
import {spawnCanvas} from 'util/document';
import {explodeImagePathPages} from 'util/path';
import {PageContext} from './context';
import {fields, strEnum, TypeNames, variant, variantList, VariantOf} from 'variant';
import {PageAction} from './pageAction';
import {postBloom} from 'core/bloom';


export const ArtworkAction = strEnum([
    'Download',
    'SendToBloom',
    'SendToBloomSplit',
]);
export type ArtworkAction = keyof typeof ArtworkAction;
export class ArtworkPage extends RootPage {
    public isBusy = false;

    get workID() {
        return ArtworkPage.getArtworkId(this.url);
    }

    @OnLoad
    async testLog() {
        log.trace('Artwork Page loaded');

        log.debug('Discovered own ID as', this.workID);
        if (this.workID) {
            const info = await getIllustInfo(this.workID);
            log.debug('Got illustration info', info);

            // add item to dom
            injectTrayButton('DL', () => {
                log.trace('Clicked download button');
                this.simpleDownload();
            });
        } else {
            log.error('Could not parse ')
        }
    }
    
    protected async getContext() {
        if (this.workID) {
            const resp = await getIllustInfo(this.workID);
            return PageContext.Artwork({
                illustInfo: resp.body,
            })
        } else {
            return super.getContext();
        }

    }
    public async getPageActions(): Promise<PageAction[]> {
        const info = await getIllustInfo(this.workID!);
        
        const baseOptions: PageAction[] = [
            {
                type: ArtworkAction.Download,
                label: 'Download',
                icon: 'download',
            },
            {
                type: ArtworkAction.SendToBloom,
                label: 'Send to Bloom',
                icon: 'share',
            },
        ];

        if (info.body.pageCount > 1) {
            return [
                ...baseOptions,
                {
                    type: ArtworkAction.SendToBloomSplit,
                    label: 'Send to Bloom (split pages)',
                    icon: 'share',
                }
            ]
        } else {
            return baseOptions;
        }
    }
    public handlePageAction(action: PageAction) {
        switch (action.type) {
            case ArtworkAction.Download:
                this.simpleDownload();
                break;
            case ArtworkAction.SendToBloom:
                this.simpleSendBloom();
                break;
            case ArtworkAction.SendToBloomSplit:
                getIllustInfo(this.workID!).then(info => {
                    if (info.body.pageCount > 1) {
                        this.simpleSendBloomSplit();
                    } else {
                        this.simpleSendBloom();
                    }
                })
        }
    }

    public static getArtworkId(url: string) {
        const idStr = extract(url, /artworks\/([0-9]*)/);
        if (idStr != undefined) {
            return parseInt(idStr);
        }
    }

    public async simpleDownload() {
        if (this.workID) {
            const info = await getIllustInfo(this.workID);
            browser.runtime.sendMessage(BGCommand.setBadge({text: '...'}));
            const ret = await this.download(info.body);
            browser.runtime.sendMessage(BGCommand.setBadge({text: 'done!'}));
            setTimeout(() => {
                browser.runtime.sendMessage(BGCommand.setBadge({text: ''}))
            }, 2500);
            return ret;
        }
    }
    public async simpleSendBloom() {
        if (this.workID) {
            const info = await getIllustInfo(this.workID);
            switch(info.body.illustType) {
                case IllustrationType.Picture:
                    if (info.body.pageCount > 1) {
                        const zip = await downloadManga(info.body);
                        return postBloom(`${this.workID}.zip`, zip);
                    } else {
                        const url = info.body.urls.original;
                        return postBloom(getFileName(url), await getBlob(url));
                    }
                case IllustrationType.Manga:
                    const zip = await downloadManga(info.body);
                    return postBloom(`${this.workID}.zip`, zip);
                case IllustrationType.Animation:
                    const metaResponse = await getUgoiraMeta(parseInt(info.body.illustId));
                    const vid = await this.downloadAnimation(info.body, metaResponse.body)
                    return postBloom(`${this.workID}.webm`, vid);
            }
        }
    }

    public async simpleSendBloomSplit() {
        if (this.workID) {
            const info = await getIllustInfo(this.workID!);
            const urls = explodeImagePathPages(info.body.urls.original, info.body.pageCount);

            log.trace('urls to split on', urls);

            Promise.all(urls.map(async url => postBloom(getFileName(url), await getBlob(url))));
            log.trace('Finished submitting');
        }
    }

    public async download(work: IllustrationInfo) {
        log.trace('DL Entered');

        switch (work.illustType) {
            case IllustrationType.Picture:
                if (work.pageCount > 1) {
                    log.trace('DL MULTIPAGE IMAGE');
                    return this.saveManga(work);
                } else {
                    log.trace('DL IMAGE');
                    return saveImage(work.urls.original);
                }
            case IllustrationType.Manga:
                log.trace('DL MANGA');
                return this.saveManga(work);
            case IllustrationType.Animation:
                log.trace('DL ANIMATION')
                const metaResponse = await getUgoiraMeta(parseInt(work.illustId));
                return this.saveAnimation(work, metaResponse.body);
        }
    }

    protected async saveAnimation(work: IllustrationInfo, meta: UgoiraMeta) {
        const blob = await this.downloadAnimation(work, meta);
        saveAs(blob, `${work.illustId}.webm`);
    }
    protected async downloadAnimation(work: IllustrationInfo, meta: UgoiraMeta): Promise<Blob> {
        this.isBusy = true;
        const blob = await processUgoira(work, meta, log.trace);
        return blob;
    }
    protected async saveManga(work: IllustrationInfo) {
        const zippedFile = await downloadManga(work);
        const objUrl = URL.createObjectURL(zippedFile);
        saveAs(objUrl, `${work.illustId}.zip`);
    }
}

/**
 * Generate a Blob webm.
 * @param work 
 * @param meta 
 * @param updateText 
 */
async function processUgoira(
    work: IllustrationInfo,
    meta: UgoiraMeta,
    updateText: (text: string) => void,
): Promise<Blob> {
    // need to specify 0.9 because of a bug in whammy
    const video = new whammy.Video(undefined, 0.9); 

    log.info('Processing ugoira', work.illustId, meta.originalSrc);

    updateText('Downloading frames');
    const zipBlob = await getBlob(meta.originalSrc);
    const zip$ = await jszip().loadAsync(zipBlob);

    updateText('Loading frames');
    let fileData: {[id: string]: Promise<string>} = {};
    zip$.forEach((path, file) => {
        fileData[path] = file.async('base64');
    });

    let currentFrame = 1;
    await execSequentially(meta.frames, async frame => {
        updateText(`Processing frame ${currentFrame++} of ${meta.frames.length}`);
        const rawFrame = await fileData[frame.file];
        let dataUrl = `data:${meta.mime_type};base64,${rawFrame}`;
        return spawnCanvas(dataUrl, work).then(canvas => video.add(canvas, frame.delay));
    });

    updateText('Finishing encode');
    return video.compile();
}

function saveImage(url: string) {
    log.trace('Downloading image from', url);
    const fileName = url.split('/').pop();
    saveAs(url, fileName);
}

async function downloadManga(work: IllustrationInfo) {
    log.trace('Downloading manga, found', work.pageCount, 'pages');
    
    const zip = new jszip();
    const urls = explodeImagePathPages(work.urls.original, work.pageCount);
    urls.forEach(url => {
        zip.file(getFileName(url), getBlob(url));
    })

    const zippedFile = await zip.generateAsync({type: 'blob'});
    return zippedFile;
}