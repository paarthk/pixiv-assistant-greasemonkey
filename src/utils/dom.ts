declare var $: JQueryStatic;
import {Action} from '../actionModel'

import Config from './config'

import {Dictionary} from './dict'

import {DictionaryEditor} from '../dom/dictEditor'
import {generateFontTemplate, fontString} from '../dom/fontSetup'

import {renderComponent} from '../dom/component'
import {Sidebar} from '../dom/sidebar'


let globalCSS = `
	#pixiv-assistant-sidebar {
		position: fixed;
		left: 10px;
	}
	#pixiv-assistant-sidebar.open {
		top: 50%;
		transform: translateY(-50%);
	}
	#pixiv-assistant-sidebar.closed {
		bottom: 10px;
	}
		
	li.pa-sidebar-entry {
	    transition: opacity 0.3s;
	    opacity: 0.8;
	    display: block;
	    margin-top: 10px;
	    background-color: #000;
    	border-radius: 60px;
	    cursor: pointer;
	    color: white;
	}
	li.pa-sidebar-entry:hover {
	    opacity: 1;
	}
	.pa-icon {
		display: inline-block;
		height: 20px;
		width: 20px;
		padding:16px;
		font-size:20px;
	}

	li.pa-sidebar-entry a.pa-tooltip span.pa-icon {
		color: white;
	}

	a.pa-tooltip {outline:none; }
	a.pa-tooltip strong {line-height:30px;}
	a.pa-tooltip:hover {text-decoration:none;}
	a.pa-tooltip span.pa-tooltip-body {
	    z-index:10;
	    display:none; 
	    padding:5px 5px; 
	    margin-left:10px;
	    margin-top:10px;
	    line-height:16px;
	    white-space: nowrap;
	}
	a.pa-tooltip:hover span.pa-tooltip-body {
	    display:inline; 
	    position:absolute; 
	    color:#111;
	    border:1px solid #888; 
	    background:#dfdfdf;
	    opacity: 100%;
	}

	a.pa-tooltip span.pa-tooltip-body
	{
	    border-radius:4px;
	    box-shadow: 5px 5px 8px #CCC;
	}

	.pa-assistant-dictionary-config-editor {
		position: fixed;
		bottom:10px;
		width: 80%;
		height: 30%;
		left:50%;
		transform: translateX(-50%);
		background-color: rgba(0, 0, 0, 0.2);
	}
	.pa-assistant-dictionary-config-editor.hidden {
		display:none;
	}


	#pa-assistant-raw-configuration-editor {
		position: fixed;
		bottom:10px;
		width: 80%;
		height: 30%;
		left:50%;
		transform: translateX(-50%);
		background-color: rgba(0, 0, 0, 0.2);
	}
`;
export function initialize() {
	GM_addStyle(globalCSS);
	GM_addStyle(generateFontTemplate(fontString.icomoon));
}

export function createSidebar(actions:Action[]){
	return renderComponent(new Sidebar(actions));
}

export function createRawConfigEditor() {
	let inputs = Config.Keys.map(key => {
		console.log(Config.get(key)); return $(`
			<div class="config-entry-container">
				<label for="pa-config-key-${key}">${key}"</label>
				<input name="pa-config-key-${key}" value="${Config.get(key)}" />
			</div>
		`)
	});

	let container = $('<div id="pa-assistant-raw-configuration-editor"></div>');
	inputs.forEach(jQInput => {
		container.append(jQInput);
	});
	return container;
}

let dictEditor:DictionaryEditor = undefined;
export function createDictionaryEditor(dict:Dictionary):JQuery {
	let editor = new DictionaryEditor(dict);
	dictEditor = editor;
	return renderComponent(editor);
	// return createDictionaryEditor(dict);
}
export function toggleEditor():void {
	dictEditor.toggleVisibility();
}