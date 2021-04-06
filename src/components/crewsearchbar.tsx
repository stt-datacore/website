import React, { Component, PureComponent } from 'react';
import { Icon, Input, Button, Dropdown, Checkbox, Popup, Modal, Menu, Grid, Tab } from 'semantic-ui-react';
import { isMobile } from 'react-device-detect';

import * as SearchString from 'search-string';
import * as localForage from 'localforage';


const conditionTypes = {
    'any': (input: [], filter: []) => filter.some(item => input.includes(item)), 
    'none': (input: [], filter: []) => !filter.some(item => input.includes(item)),
    'all': (input: [], filter: []) => filter.every(item => input.includes(item)) 
};


const conditionTypeOptions = [
    { key: 0, value: 'any', text: 'Any of' },
    { key: 1, value: 'all', text: 'All of' },
    { key: 2, value: 'none', text: 'None of' }
];

const fillButtons = [
    { 
        text: 'Select all', 
        key: 'all',
        filter: () => true,
        requiresPlayerData: false
    },
    { 
        text: 'Clear', 
        key: 'none',
        filter: () => false,
        requiresPlayerData: false
    },
    { 
        text: 'Select owned crew', 
        key: 'owned',
        filter: (value, playerData) => playerData.some(crew => crew.name == value), 
        requiresPlayerData: true
    },
    { 
        text: 'Select partially fused crew', 
        key: 'ownedNonFF',
        filter: (value, playerData) => playerData.player
                                                .character
                                                .crew
                                                .filter(crew => crew.rarity != crew.max_rarity)
                                                .some(crew => crew.name == value),
        requiresPlayerData: true
    },
    {
        text: 'Select incomplete',
        key: 'incomplete',
        filter: (value , playerData) => playerData.player
                                                 .character.cryo_collections
                                                 .some(collection => collection.name == value && collection.milestone.goal != 0),
        requiresPlayerData: true
    }
];

const skillNames = {
    'command_skill': ['command', 'cmd'],
    'diplomacy_skill': ['diplomacy', 'dip'],
    'engineering_skill': ['engineering', 'eng'],
    'medicine_skill': ['medicine', 'med'],
    'science_skill': ['science', 'sci'],
    'security_skill': ['security', 'sec']
};

let conditions = {
    'name': {
        name: 'Name',
        target: (crew) => [crew.name, crew.short_name],
        allowMatchAll: false,
        buttons: ['all', 'none' ]
    },
    'skill': {
        name: 'Skill',
        target: (crew) => Object.keys(crew.skills).map(skill => skillNames[skill]).flat(),
        allowMatchAll: true,
        buttons: ['all', 'none' ]
    },
    'trait': {
        name: 'Trait',
        target: (crew) => crew.traits_named,
        allowMatchAll: true,
        buttons: ['all', 'none' ]
    },
    'variant': {
        name: 'Variant of',
        target: (crew) => [crew.traits_hidden[3]],
        allowMatchAll: false,
        buttons: ['all', 'none' ]
    },
    'collection': {
        name: 'Collection',
        target: (crew) => crew.collections,
        allowMatchAll: true,
        buttons: ['all', 'incomplete', 'none' ]
    },
    'rarity': {
        name: 'Rarity',
        target: (crew) => crew.rarity,
        options: [
            { key: 1, value: 1, text: 'Common' },
            { key: 2, value: 2, text: 'Uncommon' },
            { key: 3, value: 3, text: 'Rare' },
            { key: 4, value: 4, text: 'Super Rare' },
            { key: 5, value: 5, text: 'Legendary' }
        ],
        allowMatchAll: false,
        buttons: ['all', 'none' ]
    }
};


type SearchPopupProps = {
    //options: any[],
    playerData: object,
    allcrew: any[],
    onSubmit: (string) => void
};

type SearchPopupState = {
    conditionType: string,
    selectedValues: any[]
};

class SearchPopup extends PureComponent<SearchPopupProps, SearchPopupState> {
    constructor(props) {
        super(props);
    
        this.currentTab = 0;
        this.state = {
            conditionType: "any",
            selectedValues: []
            
        };
        this.panes = Object.keys(conditions).map(key => {
            let condition = conditions[key];
            let {conditionType, selectedValues } = this.state;
            let {playerData} = this.props;
            
            const buttons = fillButtons
                .filter(button => (condition.buttons).includes(button.key) && (!button.requiresPlayerData || playerData))
                .map(button => <Grid.Column><Button name={button.key} onClick={() => this._fill(button.filter)}>{button.text}</Button></Grid.Column>);
                
            return {
                menuItem: condition.name,
                render: () => {
                    return (
                        <Tab.Pane>
                            <Grid columns={5}>
                                <Grid.Column columns={1}>
                                    <Dropdown
                                        options={conditionTypeOptions.filter(value => condition.allowMatchAll || value.value != 'all')}
                                        value={conditionType}
                                        onClick={(e, {value}) => this._updateCondition({conditionType : value})}
                                    />
                                </Grid.Column>
                                <Grid.Column width={4}>
                                    <Dropdown 
                                        style={{ paddingLeft: '2em'}} 
                                        clearable
                                        multiple
                                        search
                                        selection
                                        options={ condition.options }
                                        placeholder=''
                                        value={selectedValues}
                                        onChange={(e, { value }) => this._updateCondition({selectedValues : value })}
                                    />
                                </Grid.Column>
                            </Grid>
                            <Grid centered padded coloumns='equal'>
                                <Grid.Column>
                                    <Button onClick={() => this._addCondition(activeCondition, conditionType, selectedValues)} >Add</Button>
                                </Grid.Column>
                                {buttons}
                            </Grid>
                        </Tab.Pane>
                    );
                }
            };
        });
        
        this.conditions = Object.keys(conditions).map(k => {
            return { key : k, conditionType: 'any', selectedValues: [] };
        });

    }
    
    _updateCondition(data = {}) {
        let index = this.currentTab;
        
        if (data.conditionType) 
            thia.conditions[index] = data.conditionType;
        
        if (data.selectedValues) 
            this.conditions[index] = data.selectedValues;
        
        this.setState(this.conditions[index]);
    }
    
    _fill(options, filter) {
        let selected = options.filter(option => filter(option.value, this.props.playerData));
        this.setState({selectedValues : selected});
    }
    
    _addCondition(activeCondition, conditionType, selectedValues) {
        if (selectedValues.length > 0) {
            let conditionValue = selectedValues.join(',').replace('"', '\\"');
            this.props.onSubmit(activeCondition + '-' + conditionType + ':"' +  + '"');
        }
    }
    
    render() {
        return (<Tab 
                    panes={this.panes} 
                    onTabChange={(e, { tabIndex }) => { 
                        this.currentTab = tabIndex; 
                        this._updateCondition();
                    }}
                />)
    };
};

type SearchBarProps = {
    data: any[];
    searchFilter: string;
    filterRow: (crew: any, filter: any) => boolean;
    onChange: (value: string) => void;
}

type SearchBarState = {
    searchFilter: string;
    filterPopupOpen: boolean,
    loaded: boolean
}

export class CrewSearchBar extends Component<SearchBarProps, SearchBarState> {
	constructor(props) {
        super(props);
        
        this.state = {
            searchFilter: '',
            filterPopupOpen: false,
            loaded: false
        }
    }
    
     async componentDidMount() {
        const crewResp = await fetch('/structured/crew.json');
        const { data } = this.props;
        const proper = value => value.replace(/\b\w/, char => char.toUpperCase());
        
        conditions['name'].options =
            data.map((crew, index) => {
                return {
                    key: index, 
                    value: crew.name, 
                    text: crew.name, 
                    image: `${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}` 
                };
            });
                
        conditions['skill'].options = Object.values(skillNames).map((skill, index) => { 
            return {
                key: index,
                value: skill[0],
                text: proper(skill[0]),
                image: '/media/emoji/' + skill[1] + '.png'
            }
        });
        
        let traits = [];
        data.forEach(crew => crew.traits_named
                                    .filter(trait => !traits.includes(trait))
                                    .forEach(trait => traits.push(trait)));
                
        conditions['trait'].options =
            traits.map((trait, index) => {return {
                key: index,
                value: trait,
                text: proper(trait)
            }});
                
        // TODO: move this to json file
        const variantName = crew => crew.traits_hidden[crew.traits_hidden.length - 2];
        
        conditions['variant'].options = 
            data
                .filter((crew, index, self) => index == self.findIndex(crew2 => variantName(crew) == variantName(crew2)))
                .map((crew, index) => { 
                    
                    return { 
                        key: index,
                        text: proper(variantName(crew))
                                .replace('_jdl', '')
                                .replace('_', ' '),
                        value: variantName(crew),
                        image: `${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`
                    }
                });
                
        const collectionResp = await fetch('/structured/collections.json');
        const collections = await collectionResp.json();

        conditions['collection'].options =
            collections.map((collection, index) => { return {
                key: index,
                value: collection.name,
                text: collection.name,
                image: `${process.env.GATSBY_ASSETS_URL}${collection.image}`
            }});
        
        let urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('search')) {
			// Push the search string to localstorage for back button to behave as expected
			localForage.setItem<string>(window.location.pathname + 'searchFilter', urlParams.get('search'));
			this.setState({ searchFilter: urlParams.get('search') });
		} else {
			localForage.getItem<string>(window.location.pathname + 'searchFilter', (err, value) => {
				if (err) {
					console.error(err);
				} else if (value != null) {
                    this.setState({ searchFilter: value });
				}
			});
		}

		this.setState({loaded: true});
	}
	
	_addFilter(condition) {
        this._onChangeFilter(this.state.searchFilter + ' ' + condition);
    }
	
	_onChangeFilter(value) {
		localForage.setItem<string>(window.location.pathname + 'searchFilter', value);
        this.setState({searchFilter: value});
        this.props.onChange(getFilteredData());
	}
    
    _getFilteredData() {
        let data = this.state.data;
        
		if (this.state.searchFilter) {
			let filters = [];
			let grouped = this.state.searchFilter.split(/\s+OR\s+/i);
			grouped.forEach(group => {
				filters.push(SearchString.parse(group));
			});
			data = data.filter(row => _filterRow(row, filters));
		}
		
		return data;
    }

	_filterCrew(crew: any, filters: []): boolean {
		const matchesFilter = this.searchTypes[this.state.searchType];
		let meetsAnyCondition = false;

		for (let filter of filters) {
			let meetsAllConditions = true;
			if (filter.conditionArray.length === 0) {
				// text search only
				for (let segment of filter.textSegments) {
					let segmentResult =
						matchesFilter(crew.name, segment.text) ||
						matchesFilter(crew.short_name, segment.text) ||
						crew.nicknames.some(n => matchesFilter(n.cleverThing, segment.text)) ||
						crew.traits_named.some(t => matchesFilter(t, segment.text)) ||
						crew.traits_hidden.some(t => matchesFilter(t, segment.text));
					meetsAllConditions = meetsAllConditions && (segment.negated ? !segmentResult : segmentResult);
				}
			} else {
				let rarities = [];
				for (let condition of filter.conditionArray) {
					let keywordParts = condition.keyword.split('-');
                    let conditionHandler = conditions[keywordParts[0]];
                    let conditionTypeHandler = conditionTypes[keywordParts[1]];
                    let conditionValues = conditionValue.split(',');
                    
                    meetsAllConditions = meetsAllConditions && conditionTypeHandler(conditionHandler.target, conditionValues);
				}


				for (let segment of filter.textSegments) {
					let segmentResult =
						matchesFilter(crew.name, segment.text) ||
						crew.traits_named.some(t => matchesFilter(t, segment.text)) ||
						crew.traits_hidden.some(t => matchesFilter(t, segment.text));
					meetsAllConditions = meetsAllConditions && (segment.negated ? !segmentResult : segmentResult);
				}
			}
			if (meetsAllConditions) {
				meetsAnyCondition = true;
				break;
			}
		}

		return meetsAnyCondition;
	}
	
	render() {
        const { data, playerData } = this.props;
        const { searchFilter, filterPopupOpen, conditionType, loaded } = this.state;
        
        if (!loaded)
            return null;
        
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
                            hoverable 
                            position='bottom right' 
                            trigger={<Button icon onMouseEnter={() => this.setState({filterPopupOpen: true})}><Icon name='add' /></Button>} 
                            open={filterPopupOpen}
                            onMouseLeave={() => this.setState({filterPopupOpen: false})}>
                                <SearchPopup onSubmit={this._addFilter} allcrew={data} playerData={playerData} />
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
