import 'reflect-metadata'
import * as ReflectExt from '../utils/reflect'
import {log} from '../utils/log'

interface ActionDescriptor {
	id: string,
	label: string,
	icon?: string,
	color?: string,
	onLoad?: boolean //TODO: in future blend onload and registeredaction
}

interface HasExecutable {
	execute: () => void
}

export type Action = ActionDescriptor & HasExecutable;

export class BasePage {
	public get actionCache():Action[] {
		return Reflect.getMetadata('custom:page-action-cache', this) || [];
	}
	protected get onLoadFunctions():(()=>void)[] {
		return Reflect.getMetadata('custom:page-on-load-functions', this) || [];
	}

	constructor(
		protected path:string,
		protected jQuery:JQueryStatic
	) {
		// Need to bind these functions to the 'this' object, they were stored at design time
		// when no instance existed
		this.actionCache.forEach(action => action.execute = action.execute.bind(this));
		this.onLoadFunctions.forEach(func => func.call(this));
	}
}

export function RegisteredAction(desc:ActionDescriptor) {
	return (target: BasePage, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
		let newDesc = <any>desc;
		newDesc.execute = descriptor.value;

		ReflectExt.pushToMetadata('custom:page-action-cache', <Action>newDesc, target);
		return descriptor;
	}
}

export function ExecuteOnLoad(target: BasePage, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
	ReflectExt.pushToMetadata('custom:page-on-load-functions', descriptor.value, target);
	return descriptor;
}