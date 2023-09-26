import React, { PureComponent } from 'react';
import { Dropdown } from 'semantic-ui-react';

type DropdownOptsProps = {
	opts: string[];
	settings: string[];
	onChange: (option: string) => void;
	onSettingChange: (setting: string, value: boolean) => void;
};

type DropdownOptsState = {
	selected: string;
	selectedSettings?: string[];
};

class DropdownOpts extends PureComponent<DropdownOptsProps, DropdownOptsState> {
	constructor(props) {
		super(props);

		this.state = { selected: props.opts[0], selectedSettings: [] };
	}

	_onSelectionChanged(selected: string) {
		if (selected !== this.state.selected) {
			this.setState({ selected });
        }
        
        this.props.onChange(selected);
	}

	componentDidUpdate(prevProps: DropdownOptsProps) {
        if (prevProps.opts.length !== this.props.opts.length) {
            this.setState({ selected: this.props.opts[0] });
        }
	}

	_onSettingChanged(selected: string) {
		if ((this.state.selectedSettings?.indexOf(selected) ?? -1) >= 0) {
			this.setState({ selectedSettings: this.state.selectedSettings?.filter(opt => opt !== selected) });
			this.props.onSettingChange(selected, false);
		} else {
			this.setState({ selectedSettings: this.state.selectedSettings?.concat([selected]) });
			this.props.onSettingChange(selected, true);
		}
	}

	render() {
		const { opts, settings } = this.props;
		const { selected, selectedSettings } = this.state;

		return (
            <div style={{fontSize: '140%'}}>
			<Dropdown item text={selected}>
				<Dropdown.Menu>
					{opts.map(opt => (
						<Dropdown.Item
							icon={opt === selected ? 'caret right' : ''}
							text={opt}
							key={opt}
							onClick={(e, { text }) => this._onSelectionChanged(text?.toString() ?? "")}
						/>
					))}
					<Dropdown.Divider />
					{settings.map(opt => (
						<Dropdown.Item
							icon={(selectedSettings?.indexOf(opt) ?? -1) >= 0 ? 'check' : ''}
							text={opt}
							key={opt}
							onClick={(e, { text }) => this._onSettingChanged(text?.toString() ?? "")}
						/>
					))}
				</Dropdown.Menu>
			</Dropdown>
            </div>
		);
	}
}

export default DropdownOpts;
