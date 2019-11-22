import React, { Component } from 'react';
import { Input, Menu, Segment } from 'semantic-ui-react';

import VaultCrew from './vaultcrew';
import DropdownOpts from './dropdownopts';

enum SkillSort {
	Base = 1,
	Proficiency,
	Combined
}

type ProfileCrewMobileProps = {
	playerData: any;
	isMobile: boolean;
};

type ProfileCrewMobileState = {
	column: any;
	direction: 'descending' | 'ascending' | null;
	searchFilter: string;
	data: any[];
	activeItem: string;
	includeFrozen: boolean;
	excludeFF: boolean;
	sortKind: SkillSort;
};

class ProfileCrewMobile extends Component<ProfileCrewMobileProps, ProfileCrewMobileState> {
	constructor(props: ProfileCrewMobileProps) {
		super(props);

		this.state = {
			column: null,
			direction: null,
			searchFilter: '',
			activeItem: '',
			data: this.props.playerData.player.character.crew,
			includeFrozen: false,
			excludeFF: false,
			sortKind: SkillSort.Base
		};
	}

	componentDidMount() {
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
			});
	}

	_handleItemClick(name: string) {
		if (this.state.activeItem === name) {
			this.setState({ activeItem: '' });
			this._handleSort('level', false, SkillSort.Base);
		} else {
			this.setState({ activeItem: name });
			this._handleSort(name, true, SkillSort.Base);
		}
	}

	_handleSort(clickedColumn: string, isSkill: boolean, newSortKind: SkillSort) {
		const { column, direction, sortKind } = this.state;
		let { data } = this.state;

		if (column !== clickedColumn || sortKind !== newSortKind) {
			const compare = (a, b) => (a > b ? 1 : b > a ? -1 : 0);

			let getVal = (crew: any) => (crew.base_skills[clickedColumn] ? crew.base_skills[clickedColumn].core : 0);
			if (newSortKind === SkillSort.Proficiency) {
				getVal = (crew: any) =>
					crew.base_skills[clickedColumn]
						? crew.base_skills[clickedColumn].range_max - crew.base_skills[clickedColumn].range_min
						: 0;
			} else if (newSortKind === SkillSort.Combined) {
				getVal = (crew: any) =>
					crew.base_skills[clickedColumn]
						? crew.base_skills[clickedColumn].core +
						  (crew.base_skills[clickedColumn].range_max - crew.base_skills[clickedColumn].range_min) / 2
						: 0;
			}

			let sortedData;
			if (isSkill) {
				sortedData = data.sort((a, b) => getVal(a) - getVal(b));
			} else {
				sortedData = data.sort((a, b) => compare(a[clickedColumn], b[clickedColumn]));
			}

			this.setState({
				column: clickedColumn,
				direction: 'descending',
				sortKind: newSortKind,
				data: sortedData.reverse()
			});
		} else {
			this.setState({
				direction: direction === 'ascending' ? 'descending' : 'ascending',
				sortKind: newSortKind,
				data: data.reverse()
			});
		}
	}

	_onChangeFilter(value: string) {
		this.setState({ searchFilter: value.toLowerCase() });
	}

	_onChange(option: string) {
		if (option === 'Default Sort') {
			this._handleSort('bigbook_tier', false, SkillSort.Base);
		} else if (option === 'Crew Level') {
			this._handleSort('level', false, SkillSort.Base);
		} else if (option === 'Crew Rarity') {
			this._handleSort('max_rarity', false, SkillSort.Base);
		} else if (option === 'Alphabetical') {
			this._handleSort('name', false, SkillSort.Base);
		}

		if (this.state.activeItem !== '') {
			if (option === 'Base Skill') {
				this._handleSort(this.state.activeItem, true, SkillSort.Base);
			} else if (option === 'Proficiency Skill') {
				this._handleSort(this.state.activeItem, true, SkillSort.Proficiency);
			} else if (option === 'Combined Skill') {
				this._handleSort(this.state.activeItem, true, SkillSort.Combined);
			}
		}
	}

	_onSettingChange(setting: string, value: boolean) {
		if (setting === 'Include Frozen') {
			this.setState({ includeFrozen: value });
		} else if (setting === 'Exclude FF') {
			this.setState({ excludeFF: value });
		}
	}

	render() {
		const { includeFrozen, excludeFF, activeItem, searchFilter } = this.state;
		let { data } = this.state;

		const { isMobile } = this.props;

		if (!includeFrozen) {
			data = data.filter(crew => crew.immortal === 0);
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

		let opts = [];
		if (activeItem === '') {
			opts = ['Default Sort', 'Crew Level', 'Crew Rarity', 'Alphabetical'];
		} else {
			opts = ['Base Skill', 'Proficiency Skill', 'Combined Skill'];
		}

		const settings = ['Include Frozen', 'Exclude FF'];

		return (
			<div>
				<Menu attached={isMobile ? false : "top"} fixed={isMobile ? "top" : undefined}>
					<Menu.Item
						name="command_skill"
						active={activeItem === 'command_skill'}
						onClick={(e, { name }) => this._handleItemClick(name)}
					>
						<img src="/media/assets/atlas/icon_command_skill.png" />
					</Menu.Item>
					<Menu.Item
						name="diplomacy_skill"
						active={activeItem === 'diplomacy_skill'}
						onClick={(e, { name }) => this._handleItemClick(name)}
					>
						<img src="/media/assets/atlas/icon_diplomacy_skill.png" />
					</Menu.Item>
					<Menu.Item
						name="engineering_skill"
						active={activeItem === 'engineering_skill'}
						onClick={(e, { name }) => this._handleItemClick(name)}
					>
						<img src="/media/assets/atlas/icon_engineering_skill.png" />
					</Menu.Item>
					<Menu.Item
						name="security_skill"
						active={activeItem === 'security_skill'}
						onClick={(e, { name }) => this._handleItemClick(name)}
					>
						<img src="/media/assets/atlas/icon_security_skill.png" />
					</Menu.Item>
					<Menu.Item
						name="medicine_skill"
						active={activeItem === 'medicine_skill'}
						onClick={(e, { name }) => this._handleItemClick(name)}
					>
						<img src="/media/assets/atlas/icon_medicine_skill.png" />
					</Menu.Item>
					<Menu.Item
						name="science_skill"
						active={activeItem === 'science_skill'}
						onClick={(e, { name }) => this._handleItemClick(name)}
					>
						<img src="/media/assets/atlas/icon_science_skill.png" />
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

				<Segment attached={isMobile ? false : "bottom"} style={isMobile ? { paddingTop: '6em', paddingBottom: '2em' } : {}}>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: `repeat(auto-fit, minmax(${(zoomFactor * 22).toFixed(2)}em, 1fr))`,
							gap: '1em'
						}}
					>
						{data.map((crew, idx) => (
							<VaultCrew key={idx} crew={crew} size={zoomFactor} />
						))}
					</div>
				</Segment>
			</div>
		);
	}
}

export default ProfileCrewMobile;
