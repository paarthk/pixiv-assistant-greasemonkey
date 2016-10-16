import * as React from 'react'
import * as Bootstrap from 'react-bootstrap'

export class DuplicateKeyReporter extends React.Component<{dupes: string[], removeAction:Function}, void> {
	public render() {
		return (this.props.dupes === undefined) ? null :
			<div> 
				Found <strong>{this.props.dupes.length}</strong> duplicate entries. 
				<Bootstrap.Button onClick={() => this.props.removeAction()}>Revert Duplicates</Bootstrap.Button>
			</div>
	}
}