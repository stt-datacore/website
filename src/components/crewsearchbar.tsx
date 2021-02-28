import React, { PureComponent } from 'react';
import { Icon, Input, Button, Dropdown, Checkbox, Popup, Modal } from 'semantic-ui-react';
import { isMobile } from 'react-device-detect';

import * as localForage from 'localforage';

const filterOptions = [
    { key: 0, value: 'keyword', text: 'Keyword' },
    { key: 1, value: 'trait', text: 'Trait' },
    { key: 2, value: 'collection', text: 'Collection' },
    { key: 3, value: 'variantof', text: 'Variant of' }
];

type CrewSearchBarProps = {
    data: any[];
    searchFilter: string;
    filterRow: (crew: any, filter: any) => boolean;
    onChange: (value: string) => void;
}

type CrewSearchBarState = {
    searchFilter: string;
}

export class CrewSearchBar extends PureComponent<CrewSearchBarProps, CrewSearchBarState> {
	constructor(props) {
        super(props);
        
        this.state = {
            searchFilter: '',
            filterPopupOpen: false,
            conditionType: 'keyword',
            conditionValue : ''
        }
    }
    
    componentDidMount() {
		let urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('search')) {
			// Push the search string to localstorage for back button to behave as expected
			localForage.setItem<string>('searchFilter', urlParams.get('search'));
			this.setState({ searchFilter: urlParams.get('search') });
		} else {
			localForage.getItem<string>('searchFilter', (err, value) => {
				if (err) {
					console.error(err);
				} else {
					this.setState({ searchFilter: value });
				}
			});
		}
	}
	
	_onChangeFilter(value) {
		localForage.setItem<string>('searchFilter', value);
        this.setState({filterPopupOpen: false, searchFilter: value, conditionValue: ''});
	}
	
	_updateFilter(value) {
        this.setState({conditionValue: value});
    }
        
	_onCloseFilterPopup(value) {
        const { searchFilter, conditionType, conditionValue } = this.state;
        this._onChangeFilter(searchFilter  + ' ' + (conditionType != 'keyword' ? conditionType + ':' : '') + '"' + conditionValue + '"');
    }

	render() {
        const { searchFilter, filterPopupOpen, conditionType } = this.state;
        
        return (
            <div>
                <Input
                    style={{ width: isMobile ? '100%' : '50%' }}
                    iconPosition="left"
                    placeholder="Search..."
                    value={searchFilter}
                    onChange={(e, { value }) => this._onChangeFilter(value)}>
                        <input />
                        <Icon name='search' />
                <Popup 
                    wide 
                    flowing 
                    hoverable 
                    position='bottom right' 
                    trigger={<Button icon onClick={() => this.setState({filterPopupOpen: !filterPopupOpen})}><Icon name='add' /></Button>} 
                    open={filterPopupOpen}>
                        <Dropdown options = {filterOptions} value={conditionType} onChange = {(e, {value}) => this.setState({conditionType: value})} />
                        <Input style={{ paddingLeft: '2em'}} onKeyPress={e => e.key == 'Enter' && this._onCloseFilterPopup()} onChange={(e, {value}) => this._updateFilter(value)} />
                        </Popup>
                        <Button icon onClick={() => this._onChangeFilter('')} >
                            <Icon name='delete' />
                        </Button>
                </Input>
                
                {this.props.searchExt}
                <Popup
                    wide
                    trigger={<Button icon style={{ marginLeft: '1em' }}><Icon name="help" /></Button>}
                    header={'Advanced search'}
                    content={this.props.explanation}
                    position="bottom left"
                />
            </div>
        )
    }
}
