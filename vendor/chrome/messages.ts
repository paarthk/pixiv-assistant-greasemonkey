import {potentialData as IConfigValue} from '../../src/core/IConfig'
import {AjaxRequest} from '../../src/core/IAjax'

export interface Protocol {
	getConfig: (msg: ConfigGetMessage) => Promise<ConfigGetResponse>
	setConfig: (msg: ConfigSetMessage) => Promise<void>
	listConfig: () => Promise<string[]>
	ajax: (req:AjaxRequest<any>) => Promise<any>
}

export interface RequestWrapper<T> {
	name: string
	body: T
}
/*
	Config Messages
*/
export interface ConfigGetMessage {
	key: string
}
export interface ConfigGetResponse {
	value: IConfigValue
}
export interface ConfigSetMessage { 
	key: string, 
	value: IConfigValue 
}
export interface ResponseMessage {
	success: boolean
}
export interface SuccessfulResponse<T> extends ResponseMessage {
	data:T
}
export interface FailedResponse extends ResponseMessage {
	errors: any
}
export function isSuccessfulResponse(msg: ResponseMessage): msg is SuccessfulResponse<any> { return msg.success }
export function isFailedResponse(msg: ResponseMessage): msg is FailedResponse { return !msg.success }