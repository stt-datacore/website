import React, { Component } from 'react';
import { Header, Table, Rating, Icon, Dropdown, Popup } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';

import Layout from '../components/layout';
import { SearchableTable, ITableConfigRow, initSearchableOptions } from '../components/searchabletable';
import Announcement from '../components/announcement';

import CONFIG from '../components/CONFIG';
import { formatTierLabel } from '../utils/crewutils';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import CABExplanation from '../components/cabexplanation';

const rarityLabels = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];

type IndexPageProps = {
	data: any;
	location: any;
};

type IndexPageState = {
	botcrew: any[];
	initOptions: any;
	lockable: any[];
};

const tableConfig: ITableConfigRow[] = [
	{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'events', 'collections.length', 'date_added'] },
	{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true },
	{ width: 1, column: 'bigbook_tier', title: 'Tier' },
	{ width: 1, column: 'cab_ov', title: <span>CAB <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },
	{ width: 1, column: 'ranks.voyRank', title: 'Voyage' }
];
CONFIG.SKILLS_SHORT.forEach((skill) => {
	tableConfig.push({
		width: 1,
		column: `${skill.name}`,
		title: <img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />,
		reverse: true
	});
});

class IndexPage extends Component<IndexPageProps, IndexPageState> {
	constructor(props) {
		super(props);
		this.state = {
			botcrew: [],
			initOptions: false,
			lockable: []
		};
	}

	async componentDidMount() {
		let response = await fetch('/structured/crew.json');
		const botcrew = await response.json();

		botcrew.forEach(crew => {
			// Add dummy fields for sorting to work
			CONFIG.SKILLS_SHORT.forEach(skill => {
				crew[skill.name] = crew.base_skills[skill.name] ? crew.base_skills[skill.name].core : 0;
			});
		});

		// Check for custom initial table options from URL or <Link state>
		const initOptions = initSearchableOptions(this.props.location);
		// Check for custom initial index options from URL or <Link state>
		const initHighlight = initOption(this.props.location, 'highlight', '');
		// Clear history state now so that new stored values aren't overriden by outdated parameters
		if (this.props.location.state && (initOptions || initHighlight))
			window.history.replaceState(null, '');

		const lockable = [];
		if (initHighlight != '') {
			const highlighted = botcrew.find(c => c.symbol === initHighlight);
			if (highlighted) {
				lockable.push({
					symbol: highlighted.symbol,
					name: highlighted.name
				});
			}
		}

		this.setState({ botcrew, initOptions, lockable });

		function initOption(location: any, option: string, defaultValue: any): any {
			let value = undefined;
			// Always use URL parameters if found
			if (location?.search) {
				const urlParams = new URLSearchParams(location.search);
				if (urlParams.has(option)) value = Array.isArray(defaultValue) ? urlParams.getAll(option) : urlParams.get(option);
			}
			// Otherwise check <Link state>
			if (!value && location?.state) {
				const linkState = location.state;
				if (linkState[option]) value = JSON.parse(JSON.stringify(linkState[option]));
			}
			return value ?? defaultValue;
		}
	}

	renderTableRow(crew: any, idx: number, highlighted: boolean): JSX.Element {
		const attributes = {
			positive: highlighted
		};

		const counts = [
			{ name: 'event', count: crew.events },
			{ name: 'collection', count: crew.collections.length }
		];
		const formattedCounts = counts.map((count, idx) => (
			<span key={idx} style={{ whiteSpace: 'nowrap' }}>
				{count.count} {count.name}{count.count != 1 ? 's' : ''}{idx < counts.length-1 ? ',' : ''}
			</span>
		)).reduce((prev, curr) => [prev, ' ', curr]);

		return (
			<Table.Row key={crew.symbol} style={{ cursor: 'zoom-in' }} onClick={() => navigate(`/crew/${crew.symbol}/`)} {...attributes}>
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
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
						<div style={{ gridArea: 'description' }}>
							{formattedCounts}
						</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
				<Table.Cell textAlign="center">
					<b>{formatTierLabel(crew.bigbook_tier)}</b>
				</Table.Cell>
				<Table.Cell style={{ textAlign: 'center' }}>
					<b>{crew.cab_ov}</b><br />
					<small>{rarityLabels[parseInt(crew.max_rarity)-1]} #{crew.cab_ov_rank}</small>
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
		const { botcrew, initOptions, lockable } = this.state;
		if (!botcrew || botcrew.length === 0) {
			return (
				<Layout>
					<Icon loading name='spinner' /> Loading...
				</Layout>
			);
		}

		return (
			<Layout>
				<Announcement />

				<Header as='h2'>Crew stats</Header>

				<SearchableTable
					id="index"
					data={botcrew}
					config={tableConfig}
					renderTableRow={(crew, idx, highlighted) => this.renderTableRow(crew, idx, highlighted)}
					filterRow={(crew, filter, filterType) => crewMatchesSearchFilter(crew, filter, filterType)}
					initOptions={initOptions}
					showFilterOptions={true}
					lockable={lockable}
				/>

				<p>
					<i>Hint</i>: Click on a row to get details on that specific crew
				</p>
			</Layout>
		);
	}
}

export default IndexPage;
