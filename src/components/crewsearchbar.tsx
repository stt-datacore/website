import React, { Component, PureComponent } from 'react';
import { Icon, Input, Button, Dropdown, Checkbox, Popup, Modal, Menu, Grid, Tab } from 'semantic-ui-react';
import { isMobile } from 'react-device-detect';

import * as SearchString from 'search-string';
import * as localForage from 'localforage';
import CONFIG from './CONFIG';

const hidden_trait_ignore_list = [
  'human',
  'nonhuman',
  'male',
  'female',
  'organic',
  'nonorganic',
  'tos',
  'tas',
  'tng',
  'ds9',
  'voy',
  'ent',
  'dis',
  'ensign',
  'lieutenent',
  'lieutenant_commander',
  'commander',
  'first_officer',
  'captain',
  'admimral',
  'bridge_crew',
  'crew_max_rarity_1',
  'crew_max_rarity_2',
  'crew_max_rarity_3',
  'crew_max_rarity_4',
  'crew_max_rarity_5',
];

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
        text: 'Select owned crew',
        key: 'owned',
        filter: crew => crew.owned,
        requiresPlayerData: true
    },
    {
        text: 'Select partially fused crew',
        key: 'fusable',
        filter: crew => crew.owned && !crew.ff,
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

let conditions = [
  {
    key: 'name',
    name: 'Name',
    target: (crew) => crew.name,
    allowMatchAll: false,
    buttons: ['owned', 'fusable']
  },
  {
    key: 'skill',
    name: 'Skill',
    target: (crew) => crew.skills,
    allowMatchAll: true,
    buttons: []
  },
  {
    key: 'trait',
    name: 'Trait',
    target: (crew) => crew.traits_named,
    allowMatchAll: true,
    buttons: []
  },
  {
    key: 'variant',
    name: 'Variant of',
    target: (crew) => [crew.variant],
    allowMatchAll: true,
    buttons: []
  },
  {
    key: 'collection',
    name: 'Collection',
    target: (crew) => crew.collections,
    allowMatchAll: true,
    buttons: ['all', 'incomplete' ]
  },
  {
    key: 'rarity',
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
    buttons: []
  }
];

type SearchPopupProps = {
    //options: any[],
    playerData: object,
    allcrew: any[],
    onSubmit: (string) => void
    onChange (data: any[])
};

type SearchPopupState = {
    activeCondition: object,
    conditionType: string,
    selectedValues: any[]
};

class SearchPopup extends PureComponent<SearchPopupProps, SearchPopupState> {
    constructor(props) {
      super(props);

      this.state = {
        activeCondition: conditions[0],
        conditionType: "any",
        selectedValues: []
      };

      this.panes = Object.values(conditions).map(condition => {
        let {playerData} = this.props;

        const buttons = fillButtons
          .filter(button => (condition.buttons).includes(button.key) && (!button.requiresPlayerData || playerData))
          .map(button => <Grid.Column><Button name={button.key} onClick={() => this._fill(button.filter)}>{button.text}</Button></Grid.Column>);

          return {
            condition: condition,
            menuItem: condition.name,
            render: () => {
              let { activeCondition, conditionType, selectedValues } = this.state;
              return (
                <Tab.Pane>
                  <Dropdown
                    options={conditionTypeOptions.filter(value => condition.allowMatchAll || value.value != 'all')}
                    value={ conditionType }
                    onChange={(e, {value}) => this.setState({ conditionType : value })}
                  />
                  <Dropdown
                    style={{margin: '10px'}}
                    clearable
                    multiple
                    search
                    selection
                    options={ condition.options }
                    value={ selectedValues }
                    onChange={(e, { value }) => this.setState({ selectedValues: value })}
                  />
                  <Grid centered columns='equal'>
                    <Grid.Column>
                      <Button onClick={() => this._addCondition(activeCondition, conditionType, selectedValues)}>Add</Button>
                    </Grid.Column>
                    {buttons}
                </Grid>
              </Tab.Pane>
            );
          }
        };
      });
    }

    _fill(filter) {
        let { activeCondition } = this.state;
        let selected = activeCondition.options
                                      .filter(option => filter(option.value, this.props.playerData))
                                      .map(option => option.value);
        this.setState({selectedValues : selected});
    }

    _addCondition(activeCondition, conditionType, selectedValues) {
      if (selectedValues.length > 0) {
          let conditionValue = selectedValues.join(',').replace('"', '\\"');
          this.props.onSubmit(activeCondition.key + '-' + conditionType + ':"' + conditionValue + '"');
      }
      this.setState(
        {
          conditionType: 'any',
          selectedValues: []
        }
      )
    }

    render() {
      return (<Tab
                panes={this.panes}
                onTabChange={(e, { activeIndex }) => {
                  this.setState({ activeCondition: conditions[activeIndex],
                                  conditionType : 'any',
                                  selectedValues: []
                                });
                }}/>)
    };
};

type SearchBarProps = {
    data: any[];
    playerData: any;
    searchFilter: string;
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
    const { data, playerData } = this.props;
    const proper = value => value.replace(/\b\w/i, char => char.toUpperCase());

    conditions.find(condition => condition.key == 'name').options =
        data.map((crew, index) => {
          return {
            key: index,
            value: crew.name,
            text: crew.name,
            image: `${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`
          };
        });

    conditions.find(condition => condition.key == 'skill').options =
      Object.values(CONFIG.SKILLS).map((skill, index) => {return {
        key: index,
        value: skill[0],
        text: proper(skill),
        image: '/media/emoji/' + skill[1] + '.png'
      };
    });

    let traits = [];
    data.forEach(crew => crew.traits_named
                                .filter(trait => !traits.includes(trait))
                                .forEach(trait => traits.push(trait)));

    conditions.find(condition => condition.key == 'trait').options =
      traits.map((trait, index) => {return {
        key: index,
        value: trait,
        text: proper(trait)
      };
    });

    // TODO: move this to json file
    const variants = crew => {
      let traits = crew.traits_hidden.filter(trait => !hidden_trait_ignore_list.includes(trait));
      return traits.length > 0 ? traits : [crew.short_name.toLowerCase()];
    };

    const variantName = crew => {
      // Disentangle the Qs
      if (crew.variants[0] == 'q_jdl')
        return 'Q';
      else if (crew.variants[0].match(/\bQ\b/i))
        return proper(crew.variants[0].replace('_', ' '));
      else
        return crew.short_name;
    };

    let newData = data.map(crew => Object.assign(crew, {variants: variants(crew)}));
    this.setState({data: newData});
    conditions.find(condition => condition.key == 'variant').options =
        data
          .filter(crew => crew.variants.length == 1)
          .filter((crew, index, self) => index == self.findIndex(crew2 => crew.variants[0] == crew2.variants[0]))
          .map((crew, index) => {
            return {
              key: index,
              text: crew.short_name,
              value: crew.variants[0],
              image: `${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`
            }
          });

    const collectionResp = await fetch('/structured/collections.json');
    const collections = await collectionResp.json();

    conditions.find(condition => condition.key == 'collection').options =
      collections.map((collection, index) => { return {
        key: index,
        value: collection.name,
        text: collection.name,
        //image: `${process.env.GATSBY_ASSETS_URL}${collection.image}`
      }});

    // Add metadata for owned crew
    if (playerData) {
      let ownedCrew = playerData.character.crew.sort((c1, c2) => c2.rarity - c1.rarity)
      let frozenCrew = playerData.character.stored_immortals;

      this.setState({data: data.map(crew => {
        let playerCopy = ownedCrew.find(c => c.id == crew.id);

        if (frozenCrew.filter(crew.id).length > 0) {
          crew.owned = true;
          crew.ff = true;
        } else if (playerCopy) {
          crew.owned = true;
          crew.ff = playerCopy.rarity == crew.max_rarity;
        }

        return crew;
      })});

      this.props.onChange(this._getFilteredData());
    }

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

	_onChangeFilter(value = false) {
		localForage.setItem<string>(window.location.pathname + 'searchFilter', value);
    this.setState({searchFilter: value});
    this.props.onChange(this._getFilteredData());
	}

  _getFilteredData() {
    let data = this.props.data;

		if (this.state.searchFilter) {
			let filters = [];
			let grouped = this.state.searchFilter.split(/\s+OR\s+/i);
			grouped.forEach(group => {
				filters.push(SearchString.parse(group));
			});
			data = data.filter(row => this._filterRow(row, filters));
		}

		return data;
  }

	_filterRow(crew: any, filters: []): boolean {
		let meetsAnyCondition = filters.length == 0;

    for (let filter of filters) {
      if (filter.conditionArray.length == 0 && crewMatchesSearchFilter(crew, filter))
        meetsAnyCondition = true;

      let matchesFilter = true;

      for (let condition of filter.conditionArray) {
        let [ conditionKey, condType ] = condition.keyword.split('-');
        let targetValue = conditions.find(cond => cond.key == conditionKey).target(crew);
        let conditionValue = condition.value.split(',');

        if (!conditionTypes[condType](targetValue, conditionValue)) {
          matchesFilter = false;
          break;
        }
      }

      meetsAnyCondition = matchesFilter || meetsAnyCondition;
    }

    return meetsAnyCondition;
	}

	render() {
        const { data, playerData } = this.props;
        const { searchFilter, filterPopupOpen, conditionType, loaded } = this.state;
        const addFilter = this._addFilter.bind(this);
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
                                <SearchPopup onSubmit={addFilter} allcrew={data} playerData={playerData} />
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
