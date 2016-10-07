import * as React from 'react'
import * as Bootstrap from 'react-bootstrap'

interface BooleanSettingProps {
	label :string
	checked :boolean
	onToggle :(value:boolean) => any
}
export class BooleanSetting extends React.Component<BooleanSettingProps, void> {
	private inputElement : HTMLInputElement;
	
	handleExecute() {
		this.props.onToggle(this.inputElement.checked);
	}

	initializeElement(ref:HTMLInputElement){
		if(ref) {
			ref.checked = this.props.checked;
			this.inputElement = ref;
		}
	}

	public render() {
		return <div>
            <Bootstrap.Checkbox inputRef={this.initializeElement.bind(this)} onClick={this.handleExecute.bind(this)}>
				{this.props.label}
            </Bootstrap.Checkbox>
        </div>;
	}
}