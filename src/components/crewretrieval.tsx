import React, { Component } from 'react';
import { Table, Icon, Rating, Pagination, Dropdown, Form, Checkbox, Header } from 'semantic-ui-react';
import { navigate } from 'gatsby';
import { getCoolStats } from '../utils/misc';

type CrewRetrievalProps = {
	playerData: any;
};

type CrewRetrievalState = {
	column: any;
	direction: 'descending' | 'ascending' | null;
	searchFilter: string;
	data: any[];
	ownedPolestars: any[];
	allCrew: any[];
	activeCrew: any;
	pagination_rows: number;
	pagination_page: number;
	unownedOnly: boolean;
	minRarity: any;
};

const ownedFilterOptions = [
    { key: '0', value: 'Show all crew', text: 'Show all crew' },
    { key: '1', value: 'Only show unowned crew', text: 'Only show unowned crew' },
    { key: '2', value: 'Only show owned crew', text: 'Only show owned crew not FF' },
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
	{ key: null, value: null, text: 'None' },
	{ key: '1', value: '1', text: '1' },
	{ key: '2', value: '2', text: '2' },
	{ key: '3', value: '3', text: '3' },
	{ key: '4', value: '4', text: '4' },
	{ key: '5', value: '5', text: '5' }
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
			allCrew: null,
			activeCrew: null,
			ownedFilter: ownedFilterOptions[0].value,
			minRarity: null,
		};
	}

	componentDidMount() {
        if (this.props.playerData.forte_root) {
            fetch('/structured/keystones.json')
                .then(response => response.json())
			.    then(allkeystones => {
                    let ownedPolestars = allkeystones.filter((k) => k.type === 'keystone' && this.props.playerData.forte_root.items.some((f) => f.id === k.id));
                    this.setState({ ownedPolestars });
                });
        
        
            fetch('/structured/crew.json')
                .then(response => response.json())
            .   then(allCrew => this.setState({ allCrew }));
        }
	}

	componentDidUpdate() {
		if (!this.state.ownedPolestars || !this.state.allCrew || this.state.data) {
			return;
		}
		let data = this.state.allCrew.filter(
			(crew) => crew.unique_polestar_combos?.some(
				(upc) => upc.every(
					(trait) => this.state.ownedPolestars.some(op => filterTraits(op, trait))
				)
			)
		);
		this.setState({ data });
	}

	_onChangePage(activePage) {
		this.setState({ pagination_page: activePage });
	}

	_compare(a, b) {
		return (a > b ? 1 : b > a ? -1 : 0);
	}

	_handleSort(clickedColumn, isSkill) {
		const { column, direction } = this.state;
		let { data } = this.state;

		if (column !== clickedColumn) {
			let sortedData;
			if (isSkill) {
				sortedData = data.sort(
					(a, b) =>
						(a.base_skills[clickedColumn] ? a.base_skills[clickedColumn].core : 0) -
						(b.base_skills[clickedColumn] ? b.base_skills[clickedColumn].core : 0)
				);
			} else {
				sortedData = data.sort((a, b) => this._compare(a[clickedColumn], b[clickedColumn]));
			}

			this.setState({
				column: clickedColumn,
				direction: 'ascending',
				pagination_page: 1,
				data: sortedData
			});
		} else {
			this.setState({
				direction: direction === 'ascending' ? 'descending' : 'ascending',
				pagination_page: 1,
				data: data.reverse()
			});
		}
	}

	_findCombosForCrew(crew: any) {
		let combos = crew.unique_polestar_combos?.filter(
			(upc) => upc.every(
				(trait) => this.state.ownedPolestars.some(op => filterTraits(op, trait))
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

	render() {
		const { column, direction, pagination_rows, pagination_page, ownedFilter, minRarity } = this.state;
		let { data } = this.state;
		if (!data) {
            return (
                <div>
                    <h2>Crew Retrieval Unavailable</h2>
                    <p>Crew retrieval requires a <a href="https://stt.disruptorbeam.com/player?client_api=17">newer version</a> of your player file. 
                       Please follow the link and copy the correct version to paste.</p>
                </div>
            )
        }
        
        data = data.filter(ownedFilters[this.state.ownedFilter](this.props.playerData.player.character.crew));
		
		if (minRarity) {
			data = data.filter((crew) => crew.max_rarity >= minRarity);
		}
		
		let totalPages = Math.ceil(data.length / this.state.pagination_rows);

		// Pagination
		data = data.slice(pagination_rows * (pagination_page - 1), pagination_rows * pagination_page);

		return (
			<>
				<Header as='h4'>Here are all the crew who you can perform a 100% guaranteed Crew Retrieval for, using the polestars currently in your inventory:</Header>
				<Form>
					<Form.Group inline>
							<Form.Field
								control={Dropdown}
								selection
								options={ownedFilterOptions}
								value={this.state.ownedFilter}
								onChange={(e, { value }) => this.setState({ ownedFilter: value })}
						/>
						<Form.Field
								control={Dropdown}
								placeholder="Minimum rarity"
								selection
								options={rarityOptions}
								value={this.state.minRarity}
								onChange={(e, { value }) => this.setState({ minRarity: value })}
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
									<Rating rating={crew.rarity} maxRating={crew.max_rarity} size="large" disabled />
								</Table.Cell>
								<Table.Cell textAlign="center">
									<b>{crew.bigbook_tier}</b>
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
