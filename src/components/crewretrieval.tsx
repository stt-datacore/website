import React, { Component } from 'react';
import { Table, Icon, Rating, Pagination, Dropdown, Form, Button, Checkbox, Header, Modal, Grid } from 'semantic-ui-react';
import { navigate } from 'gatsby';

import { getCoolStats } from '../utils/misc';
import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';
import { formatTierLabel } from '../utils/crewutils';

type CrewRetrievalProps = {
	playerData: any;
};

type CrewRetrievalState = {
	column: any;
	direction: 'descending' | 'ascending' | null;
	searchFilter: string;
	data: any[];
	ownedPolestars: any[];
	disabledPolestars: any[];
	allCrew: any[];
	activeCrew: any;
	pagination_rows: number;
	pagination_page: number;
	ownedFilter?: string;
	minRarity: any;
	collection: any;
	modalFilterIsOpen: boolean;
	recalculateCombos: boolean;
};

const ownedFilterOptions = [
    { key: '0', value: 'Show all crew', text: 'Show all crew' },
    { key: '1', value: 'Only show unowned crew', text: 'Only show unowned crew' },
    { key: '2', value: 'Only show owned crew', text: 'Only show owned crew (not FF)' },
    { key: '3', value: 'Show all owned crew', text: 'Show all owned crew'}
];

const ownedFilters = {
    'Show all crew': data => crew => true,
    'Only show unowned crew': data => crew => !data.some((c) => crew.symbol === c.symbol),
    'Only show owned crew': data => crew => data.some((c) => crew.symbol === c.symbol && c.rarity < c.max_rarity),
    'Show all owned crew': data => crew => data.some(c => crew.symbol === c.symbol)
};

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

const rarityOptions = [
	{ key: null, value: null, text: 'Any' },
	{ key: '1', value: '1', text: '1' },
	{ key: '2', value: '2', text: '2' },
	{ key: '3', value: '3', text: '3' },
	{ key: '4', value: '4', text: '4' },
	{ key: '5', value: '5', text: '5' }
];

const collectionsOptions = [
	{ key: null, value: null, text: 'Any' }
];

const filterTraits = (polestar, trait) => {
	if (polestar.filter.type === 'trait') {
		return polestar.filter.trait === trait;
	}
	if (polestar.filter.type === 'rarity') {
		return `crew_max_rarity_${polestar.filter.rarity}` === trait;
	}
	if (polestar.filter.type === 'skill') {
		return polestar.filter.skill === trait;
	}
}

// TODO: This is copied from profilecrew, we need to find a way to merge common aspects/logics from multiple crew tables

class CrewRetrieval extends Component<CrewRetrievalProps, CrewRetrievalState> {
	constructor(props: CrewRetrievalProps) {
		super(props);

		this.state = {
			column: null,
			direction: null,
			searchFilter: '',
			pagination_rows: 10,
			pagination_page: 1,
			data: null,
			ownedPolestars: null,
			disabledPolestars: [],
			allCrew: null,
			activeCrew: null,
			ownedFilter: ownedFilterOptions[0].value,
			minRarity: null,
			collection: null,
			modalFilterIsOpen: false,
			recalculateCombos: false,
		};
	}

	componentDidMount() {
        if (this.props.playerData.forte_root) {
            fetch('/structured/keystones.json')
                .then(response => response.json())
			.    then(allkeystones => {
                    let ownedPolestars = allkeystones.filter((k) => k.type === 'keystone' && this.props.playerData.forte_root.items.some((f) => f.id === k.id));
                    ownedPolestars.forEach((p) => { p.quantity = this.props.playerData.forte_root.items.find(k => k.id === p.id).quantity });
                    this.setState({ ownedPolestars });
                });
        
        
            fetch('/structured/crew.json')
                .then(response => response.json())
            .   then(allCrew => this.setState({ allCrew }));
        }
	}

	componentDidUpdate() {
		if (!this.state.recalculateCombos && (!this.state.ownedPolestars || !this.state.allCrew || this.state.data)) {
			return;
		}
		let filteredPolestars = this.state.ownedPolestars.filter((p) => this.state.disabledPolestars.indexOf(p.id) === -1);
		let data = this.state.allCrew.filter(
			(crew) => crew.unique_polestar_combos?.some(
				(upc) => upc.every(
					(trait) => filteredPolestars.some(op => filterTraits(op, trait))
				)
			)
		);
		data.forEach(crew => { crew.highest_owned_rarity = this._findHighestOwnedRarityForCrew(crew.symbol, false) });
		
		if(this.state.recalculateCombos && this.state.column) {
			data = this._reSort(data);
		}
		this.setState({ data: data, recalculateCombos: false });

		let cArr = [...new Set(data.map(a => a.collections).flat())].sort();
		cArr.forEach(c => {
			let pc = { progress: 'n/a', milestone: { goal: 'n/a' }};
			if (this.props.playerData.player.character.cryo_collections) {
				let matchedCollection = this.props.playerData.player.character.cryo_collections.find((pc) => pc.name === c);
				if (matchedCollection) {
					pc = matchedCollection;
				}
			}
			let kv = cArr.indexOf(c) + 1;
			collectionsOptions.push({
				key: kv,
				value: c,
				text: c,
				content: (
					<span>{c} <span style={{ whiteSpace: 'nowrap' }}>({pc.progress} / {pc.milestone.goal || 'max'})</span></span>
				),
			});
		});
	}

	_onChangePage(activePage) {
		this.setState({ pagination_page: activePage });
	}

	_handleSort(clickedColumn, keepSortOptions) {
		const { column, direction } = this.state;
		let { data } = this.state;
		
		const sortConfig: IConfigSortData = {
			field: clickedColumn,
			direction: column === clickedColumn ? direction : null
		};

		if(keepSortOptions) {
			sortConfig.direction = direction;
			sortConfig.keepSortOptions = true;
		}

		if(clickedColumn === 'max_rarity') {
			sortConfig.direction = direction || 'descending';
			sortConfig.secondary = {
				field: 'highest_owned_rarity',
				direction: 'ascending'
			};
		}
		
		const sorted: IResultSortDataBy = sortDataBy(data, sortConfig);
		this.setState({
			column: sorted.field,
			direction: sorted.direction,
			pagination_page: 1,
			data: sorted.result
		});
	}
	
	_reSort(data) {
		const sortConfig: IConfigSortData = {
			field: this.state.column,
			direction: this.state.direction,
			keepSortOptions: true
		};

		if(sortConfig.field === 'max_rarity') {
			sortConfig.secondary = {
				field: 'highest_owned_rarity',
				direction: sortConfig.direction
			};
		}

		const sorted: IResultSortDataBy = sortDataBy(data, sortConfig);
		return sorted.result;
	}

	_findCombosForCrew(crew: any) {
		let filteredPolestars = this.state.ownedPolestars.filter((p) => this.state.disabledPolestars.indexOf(p.id) === -1);
		let combos = crew.unique_polestar_combos?.filter(
			(upc) => upc.every(
				(trait) => filteredPolestars.some(op => filterTraits(op, trait))
			)
		).map((upc) => upc.map((trait) => this.state.ownedPolestars.find((op) => filterTraits(op, trait))));
		return (
			<div className="ui accordion" onClick={() => this.setState({ activeCrew: this.state.activeCrew === crew.symbol ? null : crew.symbol })}>
				<div className={`title ${this.state.activeCrew === crew.symbol ? 'active' : ''}`}>View</div>
				<div className={`content ${this.state.activeCrew === crew.symbol ? 'active' : ''}`}>
						<div className="ui four column grid">
							{combos.map((combo) => (
								<div className="row">
									{combo.map((polestar) => (
											<div className="column"><img width={32} src={`${process.env.GATSBY_ASSETS_URL}${polestar.icon.file.substr(1).replace(/\//g, '_')}`} /><br />{polestar.name.replace(' Polestar', '').replace(' Skill', '')}</div>
									))
									}
								</div>
							))}
					</div>
				</div>
			</div>
		)
	}

	_updateHighestRarities(ownedFilterValue: string) {
		// update highest rarity for owned crew at each change of owned filter
		let excludeFF = ownedFilterOptions[2].value === ownedFilterValue ? true : false;
		this.state.data.forEach(crew => { crew.highest_owned_rarity = this._findHighestOwnedRarityForCrew(crew.symbol, excludeFF) });
	}

	_findHighestOwnedRarityForCrew(crewSymbol: string, excludeFF: boolean): number {
		const { playerData: { player: { character: { crew } } } } = this.props;
		crew.sort((a, b) => b.rarity - a.rarity);
		const highestRarityMatchingCrew = (excludeFF && excludeFF === true)
			? crew.find((c) => c.symbol === crewSymbol && c.rarity < c.max_rarity)
			: crew.find((c) => c.symbol === crewSymbol);
		if (highestRarityMatchingCrew) {
			return highestRarityMatchingCrew['rarity'];
		}
		return 0;
	}

	_filterCheckbox(p) {
		return (
			<Grid.Column>
				<Checkbox
					toggle
					id={`polestar_filter_id_${p.id}`}
					label={`${p.short_name} (${p.quantity})`}
					checked={this.state.disabledPolestars.indexOf(p.id)===-1}
					onChange={(e) => this._handleFilterChange(e)}
				/>
			</Grid.Column>
		)
	}

	_filterCheckboxGroupHeader(t) {
		return (
			<Grid.Column largeScreen={16} mobile={4}>
				<strong>{t}</strong>
			</Grid.Column>
		)
	}

	_createFilterCheckboxes() {
		const grouped = [
			{
				title: "Rarity",
				ids: [14502, 14504, 14506, 14507, 14509],
				polestars: [],
			},
			{
				title: "Skills",
				ids: [14511, 14512, 14513, 14514, 14515, 14516],
				polestars: [],
			},
			{
				title: "Traits",
				ids: null,
				polestars: [],
			},
		];
		this.state.ownedPolestars.forEach(p => {
			let group = 2;
			if(grouped[0].ids.indexOf(p.id) !== -1) group = 0;
			if(grouped[1].ids.indexOf(p.id) !== -1) group = 1;
			grouped[group].polestars.push(p);
		});
		const checkboxes = [];
		grouped.map((group) => {
			if(group.polestars.length > 0) {
				checkboxes.push(this._filterCheckboxGroupHeader(group.title));
				group.polestars.map((polestar) => {
					checkboxes.push(this._filterCheckbox(polestar));
				});
			}
		});
		return checkboxes;
	}

	_handleFilterChange(e) {
		let disabledPolestars = this.state.disabledPolestars;
		let id = parseInt(e.target.id.replace(/polestar_filter_id_/, ''));
		if(e.target.checked === true && disabledPolestars.indexOf(id) !== -1) {
			disabledPolestars = disabledPolestars.filter(el => el !== id);
		}
		if(e.target.checked === false && this.state.disabledPolestars.indexOf(id) === -1) {
			disabledPolestars.push(id);
		}
		this.setState({disabledPolestars: disabledPolestars});
	}

	render() {
		const { column, direction, pagination_rows, pagination_page, ownedFilter, minRarity, collection } = this.state;
		const { playerData } = this.props
		let { data } = this.state;
		if (!playerData?.forte_root) {
                        return (
                <div>
                    <h2>Crew Retrieval Unavailable</h2>
                    <p>Crew retrieval requires a <a href="https://stt.disruptorbeam.com/player?client_api=17">newer version</a> of your player file. 
                       Please follow the link and copy the correct version to paste.</p>
                </div>
            )
        }
        
        if (!data) {
            return null;
        }
        
        data = data.filter(ownedFilters[ownedFilter](playerData.player.character.crew));
		
		if (minRarity) {
			data = data.filter((crew) => crew.max_rarity >= minRarity);
		}
		
		if (collection) {
			data = data.filter((crew) => crew.collections.indexOf(collection) !== -1);
		}
		
		let totalPages = Math.ceil(data.length / this.state.pagination_rows);

		// Pagination
		data = data.slice(pagination_rows * (pagination_page - 1), pagination_rows * pagination_page);

		return (
			<>
				<Header as='h4'>Here are all the crew who you can perform a 100% guaranteed Crew Retrieval for, using the polestars currently in your inventory:</Header>
				<Form>
					<Form.Group inline>
						<Modal
							open={this.state.modalFilterIsOpen}
							onClose={() => this.setState({modalFilterIsOpen: false, recalculateCombos: true})}
							onOpen={() => this.setState({modalFilterIsOpen: true})}
							trigger={<Button>{this.state.ownedPolestars.length-this.state.disabledPolestars.length} / {this.state.ownedPolestars.length} Polestars</Button>}
							header='Filter Owned Polestars'
							size='large'
						>
							<Modal.Header>Filter Owned Polestars</Modal.Header>
							<Modal.Content scrolling>
								<Grid columns={4} stackable padded>
									{this._createFilterCheckboxes()}
								</Grid>
							</Modal.Content>
							<Modal.Actions>
								<Button positive onClick={() => this.setState({modalFilterIsOpen: false, recalculateCombos: true})}>
									Update Filter
								</Button>
							</Modal.Actions>
						</Modal>
						<Form.Field
								control={Dropdown}
								selection
								options={ownedFilterOptions}
								value={this.state.ownedFilter}
								onChange={(e, { value }) => {this._updateHighestRarities(value), this.setState({ ownedFilter: value, pagination_page: 1 })}}
						/>
						<Form.Field
								control={Dropdown}
								placeholder="Minimum rarity"
								selection
								options={rarityOptions}
								value={this.state.minRarity}
								onChange={(e, { value }) => this.setState({ minRarity: value, pagination_page: 1 })}
						/>
						<Form.Field
								control={Dropdown}
								placeholder="Collections"
								selection
								options={collectionsOptions}
								value={this.state.collection}
								onChange={(e, { value }) => this.setState({ collection: value, pagination_page: 1 })}
						/>
					</Form.Group>
				</Form>
				<Table sortable celled selectable striped collapsing unstackable compact="very">
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell
								width={3}
								sorted={column === 'name' ? direction : null}
								onClick={() => this._handleSort('name', false)}
							>
								Crew
							</Table.HeaderCell>
							<Table.HeaderCell
								width={1}
								sorted={column === 'max_rarity' ? direction : null}
								onClick={() => this._handleSort('max_rarity', false)}
							>
								Rarity
							</Table.HeaderCell>
							<Table.HeaderCell
								width={1}
								sorted={column === 'bigbook_tier' ? direction : null}
								onClick={() => this._handleSort('bigbook_tier', false)}
							>
								Tier
							</Table.HeaderCell>
							<Table.HeaderCell
								width={3}
								sorted={null}
							>
								Useable Combos
							</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{data.map((crew, idx) => (
							<Table.Row key={idx} style={{ cursor: 'zoom-in' }} >
								<Table.Cell onClick={() => navigate(`/crew/${crew.symbol}/`)}>
									<div
										style={{
											display: 'grid',
											gridTemplateColumns: '60px auto',
											gridTemplateAreas: `'icon stats' 'icon description'`,
											gridGap: '1px'
										}}
									>
										<div style={{ gridArea: 'icon' }}>
											<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
										</div>
										<div style={{ gridArea: 'stats' }}>
											<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{crew.name}</span>
										</div>
										<div style={{ gridArea: 'description' }}>{getCoolStats(crew, false, false)}</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<Rating icon='star' rating={crew.highest_owned_rarity} maxRating={crew.max_rarity} size="large" disabled />
								</Table.Cell>
								<Table.Cell textAlign="center">
									<b>{formatTierLabel(crew.bigbook_tier)}</b>
								</Table.Cell>
								<Table.Cell textAlign="center">
									{this._findCombosForCrew(crew)}
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
					<Table.Footer>
						<Table.Row>
							<Table.HeaderCell colSpan="8">
								<Pagination
									totalPages={totalPages}
									activePage={pagination_page}
									onPageChange={(event, { activePage }) => this._onChangePage(activePage)}
								/>
								<span style={{ paddingLeft: '2em' }}>
									Crew per page:{' '}
									<Dropdown
										inline
										options={pagingOptions}
										value={pagination_rows}
										onChange={(event, { value }) =>
											this.setState({ pagination_page: 1, pagination_rows: value as number })
										}
									/>
								</span>
							</Table.HeaderCell>
						</Table.Row>
					</Table.Footer>
				</Table>
			</>
		);
	}
}

export default CrewRetrieval;
