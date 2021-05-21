import React, { Component } from 'react';
import { Header, Table, Rating, Icon, Dropdown } from 'semantic-ui-react';
import { navigate } from 'gatsby';

import Layout from '../components/layout';
import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';
import { formatTierLabel } from '../utils/crewutils';

import { crewMatchesSearchFilter } from '../utils/crewsearch';

const rarityLabels = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];

type IndexPageProps = {};

type IndexPageState = {
	botcrew: any[];
	searchFilterType: string;
};

const tableConfig: ITableConfigRow[] = [
	{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'bigbook_tier', 'events'] },
	{ width: 1, column: 'max_rarity', title: 'Rarity' },
	{ width: 1, column: 'cab_ov', title: 'CAB' },
	{ width: 1, column: 'ranks.voyRank', title: 'Voyage' },
	{ width: 1, column: 'command_skill', title: <img alt="Command" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_command_skill.png`} style={{ width: '1em' }} /> },
	{ width: 1, column: 'science_skill', title: <img alt="Science" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_science_skill.png`} style={{ width: '1em' }} /> },
	{ width: 1, column: 'security_skill', title: <img alt="Security" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_security_skill.png`} style={{ width: '1em' }} /> },
	{ width: 1, column: 'engineering_skill', title: <img alt="Engineering" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_engineering_skill.png`} style={{ width: '1em' }} /> },
	{ width: 1, column: 'diplomacy_skill', title: <img alt="Diplomacy" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_diplomacy_skill.png`} style={{ width: '1em' }} /> },
	{ width: 1, column: 'medicine_skill', title: <img alt="Medicine" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_medicine_skill.png`} style={{ width: '1em' }} /> }
];

class IndexPage extends Component<IndexPageProps, IndexPageState> {
	state = { botcrew: [], searchFilterType: 'Any match' };

	async componentDidMount() {
		let response = await fetch('/structured/crew.json');
		const botcrew = await response.json();

		botcrew.forEach(crew => {
			// Add dummy fields for sorting to work
			CONFIG.SKILLS_SHORT.forEach(skill => {
				crew[skill.name] = crew.base_skills[skill.name] ? crew.base_skills[skill.name].core : 0;
			});
		});

		this.setState({ botcrew });
	}

	renderTableRow(crew: any): JSX.Element {
		return (
			<Table.Row key={crew.symbol} style={{ cursor: 'zoom-in' }} onClick={() => navigate(`/crew/${crew.symbol}/`)}>
				<Table.Cell>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}>
						<div style={{ gridArea: 'icon' }}>
							<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{crew.name}</span>
						</div>
						<div style={{ gridArea: 'description' }}>
							{crew.bigbook_tier > 0 && <>Tier {formatTierLabel(crew.bigbook_tier)}, </>}{crew.events} events, {crew.collections.length} collections
						</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					<b>{crew.cab_ov}</b><br />
					<small style={{ fontSize: '70%' }}>{rarityLabels[parseInt(crew.max_rarity)-1]} #{crew.cab_ov_rank}</small>
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					<b>#{crew.ranks.voyRank}</b><br />
					{crew.ranks.voyTriplet && <small>Triplet #{crew.ranks.voyTriplet.rank}</small>}
				</Table.Cell>

				{CONFIG.SKILLS_SHORT.map(skill =>
					crew.base_skills[skill.name] ? (
						<Table.Cell key={skill.name} textAlign='center'>
							<b>{crew.base_skills[skill.name].core}</b>
							<br />
							+({crew.base_skills[skill.name].range_min}-{crew.base_skills[skill.name].range_max})
						</Table.Cell>
					) : (
						<Table.Cell key={skill.name} />
					)
				)}
			</Table.Row>
		);
	}

	render() {
		const { botcrew } = this.state;
		if (!botcrew || botcrew.length === 0) {
			return (
				<Layout>
					<Icon loading name='spinner' /> Loading...
				</Layout>
			);
		}

		return (
			<Layout>
				<Header as='h2'>Crew stats</Header>

				<SearchableTable
					id="index"
					data={botcrew}
					config={tableConfig}
					renderTableRow={crew => this.renderTableRow(crew)}
					filterRow={(crew, filter, filterType) => crewMatchesSearchFilter(crew, filter, filterType)}
					showFilterOptions={true}
				/>

				<p>
					<i>Hint</i> Click on a row to get details on that specific crew
				</p>
			</Layout>
		);
	}
}

export default IndexPage;
