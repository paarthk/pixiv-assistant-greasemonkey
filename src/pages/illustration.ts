import * as pathUtils from '../utils/path'
import {BasePage} from './base'
import {RegisteredAction, ExecuteOnLoad} from '../utils/actionDecorators'
import * as services from '../services'

export class IllustrationPage extends BasePage {
	public get artistId():number {
		return pathUtils.getArtistId(this.jQuery('a.user-link').attr('href'));
	}
	public get artistName():string {
		return this.jQuery('a.user-link h1').text();
	}
	public get thumbUrl():string {
		return this.jQuery('.boxbody center img').attr('src');
	}
	public get fullImageUrl():string {
		return this.jQuery('._illust_modal img').attr('data-src');
	}

	@ExecuteOnLoad
	@RegisteredAction({ id: 'pa_open_image_fullsize', label: 'Open Image' })
	public openImage(): void {
		this.jQuery("._layout-thumbnail.ui-modal-trigger").click()
	}

	@RegisteredAction({id:'pa_get_zip_url_button',label:'Zip Url'})
	public getZipUrl():void {
		var url = "";
		try {
			url = (<any>unsafeWindow).pixiv.context.ugokuIllustFullscreenData.src;
		} catch (e) { }
		unsafeWindow.prompt('Copy the url below', url);
	}

	@RegisteredAction({ id: 'pa_button_open_folder', label: 'Open Folder', icon: 'mug', color: 'brown'})
	public openFolder(): void {
		services.openFolder({id: this.artistId, name: this.artistName});
	}

	@RegisteredAction({ id: 'pa_button_download', label: 'Download Image' })
	public download():void {
		services.download({ id: this.artistId, name: this.artistName }, this.fullImageUrl);
	}
}