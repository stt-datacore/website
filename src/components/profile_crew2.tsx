import React, { Component } from 'react';
import { Input, Menu, Segment } from 'semantic-ui-react';

import VaultCrew from './vaultcrew';
import DropdownOpts from './dropdownopts';

import { bonusCrewForCurrentEvent } from './../utils/playerutils';
import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';

enum SkillSort {
	Base = '.core',
	Proficiency = '.proficiency',
	Combined = '.combined'
}

type HandleSortOptions = {
	activeItem?: string;
	column?: string;
	direction?: string;
	sortKind?: SkillSort;
};

type ProfileCrewMobileProps = {
	playerData: any;
	isMobile: boolean;
};

type ProfileCrewMobileState = {
	column: any;
	defaultColumn: 'bigbook_tier',
	direction: 'descending' | 'ascending' | null;
	searchFilter: string;
	data: any[];
	activeItem: string;
	includeFrozen: boolean;
	excludeFF: boolean;
	onlyEvent: boolean;
	sortKind: SkillSort;
	itemsReady: boolean;
};

class ProfileCrewMobile extends Component<ProfileCrewMobileProps, ProfileCrewMobileState> {
	constructor(props: ProfileCrewMobileProps) {
		super(props);

		this.state = {
			column: 'bigbook_tier',
			defaultColumn: 'bigbook_tier',
			direction: 'descending',
			searchFilter: '',
			activeItem: '',
			data: this.props.playerData.player.character.crew,
			includeFrozen: false,
			excludeFF: false,
			onlyEvent: false,
			sortKind: SkillSort.Base,
			itemsReady: false
		};
	}

	componentDidMount() {
		let self = this;
		fetch('/structured/items.json')
			.then(response => response.json())
			.then(items => {
				this.props.playerData.player.character.crew.forEach(crew => {
					crew.equipment_slots.forEach(es => {
						let itemEntry = items.find(i => i.symbol === es.symbol);
						if (itemEntry) {
							es.imageUrl = itemEntry.imageUrl;
						}
					});
				});
				this.setState({ itemsReady: true });
			});

		const data = this.state.data;
		data.forEach((crew) => {
			Object.keys(crew).forEach((p) => {
				if(p.substr(-6) === '_skill') {
					crew[p].proficiency = crew[p].max - crew[p].min;
					crew[p].combined = crew[p].core === 0 ? 0 : crew[p].core + Math.trunc((crew[p].max + crew[p].min) / 2);
				}
			});
		});
		this.setState({ data });
		this._handleSortNew({})
	}

	_handleSortNew(config: HandleSortOptions) {
		const { activeItem, column, defaultColumn, direction, sortKind } = this.state;
		const { data } = this.state;
		let newActiveItem, newColumn, newDirection, newSortKind;

		const sortConfig: IConfigSortData = {
			field: column,
			direction: 'descending',
			keepSortOptions: true
		};

		if(
			((!config.activeItem && !config.sortKind) || config.activeItem === activeItem)
			&& (!config.column || ['name', 'short_name', 'bigbook_tier'].indexOf(config.column) !== -1)
		) {
			sortConfig.direction = 'ascending';
			sortConfig.secondary = {
				field: 'max_rarity',
				direction: 'descending'
			};
		}
		if(config.column && config.column === 'level') {
			sortConfig.direction = 'descending';
			sortConfig.secondary = {
				field: 'max_rarity',
				direction: 'ascending'
			};
		}
		if(config.column && config.column === 'max_rarity') {
			sortConfig.direction = 'descending';
			sortConfig.secondary = {
				field: 'rarity',
				direction: 'ascending'
			};
		}

		if(config.activeItem) {
			newActiveItem = activeItem === config.activeItem ? defaultColumn : config.activeItem;
			newColumn = newActiveItem;
			sortConfig.field = newColumn + (newColumn.substr(-6) === '_skill' ? (newSortKind || sortKind) : '');
		}
		if(config.sortKind) {
			newSortKind = config.sortKind;
			sortConfig.field = (newColumn || column) + newSortKind;
		}
		if(config.column) {
			newColumn = column === config.column ? defaultColumn : config.column;
			sortConfig.field = newColumn + (newColumn.substr(-6) === '_skill' ? (newSortKind || sortKind) : '');
		}

		const sorted: IResultSortDataBy = sortDataBy(data, sortConfig);
		this.setState({
			activeItem: newActiveItem || activeItem,
			column: newColumn || column,
			data: sorted.result,
			direction: newDirection || direction,
			sortKind: newSortKind || sortKind
		});
	}

	_onChangeFilter(value: string) {
		this.setState({ searchFilter: value.toLowerCase() });
	}

	_onChange(option: string) {
		const sortSettings = {
			'Default Sort': {
				column: 'bigbook_tier'
			},
			'Crew Level': {
				column: 'level'
			},
			'Crew Rarity': {
				column: 'max_rarity'
			},
			'Alphabetical': {
				column: 'short_name'
			},
			'Base Skill': {
				sortKind: SkillSort.Base
			},
			'Proficiency Skill': {
				sortKind: SkillSort.Proficiency
			},
			'Combined Skill': {
				sortKind: SkillSort.Combined
			}
		};
		this._handleSortNew(sortSettings[option]);
	}

	_onSettingChange(setting: string, value: boolean) {
		if (setting === 'Include Frozen') {
			this.setState({ includeFrozen: value });
		} else if (setting === 'Exclude FF') {
			this.setState({ excludeFF: value });
		} else if (setting.startsWith('Only event')) {
			this.setState({ onlyEvent: value });
		}
	}

	render() {
		const { includeFrozen, excludeFF, onlyEvent, activeItem, searchFilter } = this.state;
		let { data, itemsReady } = this.state;

		const { isMobile } = this.props;

		if (!includeFrozen) {
			data = data.filter(crew => crew.immortal <= 0);
		}

		if (excludeFF) {
			data = data.filter(crew => crew.rarity < crew.max_rarity);
		}

		if (searchFilter) {
			data = data.filter(
				crew =>
					crew.name.toLowerCase().indexOf(searchFilter) !== -1 ||
					crew.traits_named.some(t => t.toLowerCase().indexOf(searchFilter) !== -1) ||
					crew.traits_hidden.some(t => t.toLowerCase().indexOf(searchFilter) !== -1)
			);
		}

		const zoomFactor = isMobile ? 0.65 : 0.85;

		let opts = [] as string[];
		if (activeItem === '' || activeItem === this.state.defaultColumn) {
			opts = ['Default Sort', 'Crew Level', 'Crew Rarity', 'Alphabetical'];
		} else {
			opts = ['Base Skill', 'Proficiency Skill', 'Combined Skill'];
		}

		let settings = ['Include Frozen', 'Exclude FF'];
		let eventCrew = bonusCrewForCurrentEvent(this.props.playerData.player.character);
		if (eventCrew) {
			console.log(eventCrew);
			settings.push(`Only event bonus (${eventCrew.eventName})`);

			if (onlyEvent) {
				data = data.filter(crew => eventCrew?.eventCrew[crew.symbol]);
			}
		}

		return (
			<div>
				<Menu attached={isMobile ? false : 'top'} fixed={isMobile ? 'top' : undefined}>
					<Menu.Item
						name="command_skill"
						active={activeItem === 'command_skill'}
						onClick={(e, { name }) => this._handleSortNew({activeItem: name})}
					>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_command_skill.png`} />
					</Menu.Item>
					<Menu.Item
						name="diplomacy_skill"
						active={activeItem === 'diplomacy_skill'}
						onClick={(e, { name }) => this._handleSortNew({activeItem: name})}
					>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_diplomacy_skill.png`} />
					</Menu.Item>
					<Menu.Item
						name="engineering_skill"
						active={activeItem === 'engineering_skill'}
						onClick={(e, { name }) => this._handleSortNew({activeItem: name})}
					>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_engineering_skill.png`} />
					</Menu.Item>
					<Menu.Item
						name="security_skill"
						active={activeItem === 'security_skill'}
						onClick={(e, { name }) => this._handleSortNew({activeItem: name})}
					>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_security_skill.png`} />
					</Menu.Item>
					<Menu.Item
						name="medicine_skill"
						active={activeItem === 'medicine_skill'}
						onClick={(e, { name }) => this._handleSortNew({activeItem: name})}
					>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_medicine_skill.png`} />
					</Menu.Item>
					<Menu.Item
						name="science_skill"
						active={activeItem === 'science_skill'}
						onClick={(e, { name }) => this._handleSortNew({activeItem: name})}
					>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_science_skill.png`} />
					</Menu.Item>

					<DropdownOpts
						opts={opts}
						settings={settings}
						onChange={text => this._onChange(text)}
						onSettingChange={(text, val) => this._onSettingChange(text, val)}
					/>

					<Menu.Menu position="right">
						<Menu.Item>
							<Input
								icon="search"
								placeholder="Search..."
								value={this.state.searchFilter}
								onChange={(e, { value }) => this._onChangeFilter(value)}
							/>
						</Menu.Item>
					</Menu.Menu>
				</Menu>

				<Segment
					attached={isMobile ? false : 'bottom'}
					style={isMobile ? { paddingTop: '6em', paddingBottom: '2em' } : {}}
				>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: `repeat(auto-fit, minmax(${(zoomFactor * 22).toFixed(2)}em, 1fr))`,
							gap: '1em'
						}}
					>
						{data.map((crew, idx) => (
							<VaultCrew key={idx} crew={crew} size={zoomFactor} itemsReady={itemsReady} />
						))}
					</div>
				</Segment>
			</div>
		);
	}
}

export default ProfileCrewMobile;
