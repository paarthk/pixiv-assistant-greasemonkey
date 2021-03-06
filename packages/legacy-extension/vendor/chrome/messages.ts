import {potentialData as IConfigValue} from 'src/core/IConfig';
import {AjaxRequest} from 'src/core/IAjax';

export interface ConfigProtocol {
    getConfig: (msg: ConfigGetMessage) => Promise<ConfigGetResponse>;
    setConfig: (msg: ConfigSetMessage) => Promise<void>;
    listConfig: () => Promise<string[]>;
}

export interface Protocol extends ConfigProtocol {
    ajax: (req: AjaxRequest<any>) => Promise<any>;
    newTab: (msg: UrlRequest) => Promise<void>;
    isPageBookmarked: (msg: UrlRequest) => Promise<boolean>;
    download: (msg: DownloadRequest) => Promise<boolean>;
}

export interface RequestWrapper<T> {
    target: string;
    name: string;
    body: T;
}
/*
	Config Messages
*/
export interface ConfigGetMessage {
    key: string;
}
export interface ConfigGetResponse {
    value: IConfigValue;
}
export interface ConfigSetMessage {
    key: string;
    value: IConfigValue;
}
export interface ResponseMessage {
    success: boolean;
}
export interface SuccessfulResponse<T> extends ResponseMessage {
    data: T;
}
export interface FailedResponse extends ResponseMessage {
    errors: any;
}
export function isSuccessfulResponse(
    msg: ResponseMessage,
): msg is SuccessfulResponse<any> {
    return msg.success;
}
export function isFailedResponse(msg: ResponseMessage): msg is FailedResponse {
    return !msg.success;
}

export interface UrlRequest {
    url: string;
}
export interface DownloadRequest extends UrlRequest {
    filename: string;
}
