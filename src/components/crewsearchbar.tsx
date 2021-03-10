import React, { PureComponent } from 'react';
import { Icon, Input, Button, Dropdown, Checkbox, Popup, Modal } from 'semantic-ui-react';
import { isMobile } from 'react-device-detect';

import * as localForage from 'localforage';

// TODO: Put this in its own json file
const filterTypes = {
    'any': {
        name: "Any of", 
        value: (input: [], filter: []) => filter.some(item => input.includes(item)) 
    },
    'all': {
        name: "All of", 
        value: (input: [], filter: []) => filter.every(item => input.includes(item)) 
    },
    'none':: {
        name: "None of",
        value: (input: [], filter: []) => !filter.some(item => input.includes(item))
    }
};

const allFilters = [
    {
        name: "Collection",
    }
];

const filterTypes = [
    { key: 0, value: 'any', text: 'Any of' },
    { key: 1, value: 'all', text: 'All of' },
    { key: 2, value: 'none', text: 'None of' }
];

const filterOptions = [
    { key: 0, value: 'keyword', text: 'Keyword' },
    { key: 1, value: 'trait', text: 'Trait' },
    { key: 2, value: 'collection', text: 'Collection' },
    { key: 3, value: 'variantof', text: 'Variant of' }
];

type SearchPopupState = {
    conditionType: string,
    subFilterOptions:
    conditionDropdown: Dropdown
};

class SearchPopup extends PureComponent<SearchPopupState> = {
    constructor(props) {
        super(props);
    }
    
    
    render() {
        (
            <Menu options = {filterOptions} value={conditionType} onChange = {(e, {value}) => this.setState({conditionType: value})} />
            <Dropdown 
                style={{ paddingLeft: '2em'}} 
                clearable
				fluid
				multiple
				search
				selection
				options={this.state.peopleList}
				placeholder=''
				value={this.state.currentSelectedItems}
				onChange={(e, { value }) => this._selectionChanged(value)}
            />
        )
    }
};

type SearchBarProps = {
    data: any[];
    searchFilter: string;
    filterRow: (crew: any, filter: any) => boolean;
    onChange: (value: string) => void;
}

type SearchBarState = {
    searchFilter: string;
}

export class SearchBar extends PureComponent<SearchBarProps, SearchBarState> {
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
			localForage.setItem<string>(window.location.pathname + 'searchFilter', urlParams.get('search'));
			this.setState({ searchFilter: urlParams.get('search') });
		} else {
			localForage.getItem<string>(window.location.pathname + 'searchFilter', (err, value) => {
				if (err) {
					console.error(err);
				} else {
					this.setState({ searchFilter: value });
				}
			});
		}
	}
	
	_onChangeFilter(value) {
		localForage.setItem<string>(window.location.pathname + 'searchFilter', value);
        this.setState({filterPopupOpen: false, searchFilter: value, conditionValue: ''});
        this.props.onChange(value);
	}
	
	_updateFilter(value) {
        this.setState({conditionValue: value});
    }
        
	_onCloseFilterPopup(value) {
        const { searchFilter, conditionType, conditionValue } = this.state;
        this._onChangeFilter(searchFilter  + ' ' + (conditionType != 'keyword' ? conditionType + ':' : '') + '"' + conditionValue + '"');
    }
    
    getFilteredData() {
        let data = this.state.data;
        
		if (this.state.searchFilter) {
			let filters = [];
			let grouped = this.state.searchFilter.split(/\s+OR\s+/i);
			grouped.forEach(group => {
				filters.push(SearchString.parse(group));
			});
			data = data.filter(row => this.props.filterRow(row, filters));
		}
		
		return data;
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
                            <SearchPopup />
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
