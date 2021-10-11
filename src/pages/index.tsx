import React, { Component } from 'react';
import { Header, Table, Rating, Icon, Dropdown, Popup, Message } from 'semantic-ui-react';
import { navigate, graphql } from 'gatsby';

import Layout from '../components/layout';
import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';
import { formatTierLabel } from '../utils/crewutils';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import CABExplanation from '../components/cabexplanation';

const rarityLabels = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];

type IndexPageProps = {
	data: {};
};

type IndexPageState = {
	botcrew: any[];
	initOptions: any;
	highlights: string[];
};

const tableConfig: ITableConfigRow[] = [
	{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'bigbook_tier', 'events', 'date_added'] },
	{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true },
	{ width: 1, column: 'cab_ov', title: <span>CAB <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },
	{ width: 1, column: 'ranks.voyRank', title: 'Voyage' },
	{ width: 1, column: 'command_skill', title: <img alt="Command" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_command_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'science_skill', title: <img alt="Science" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_science_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'security_skill', title: <img alt="Security" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_security_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'engineering_skill', title: <img alt="Engineering" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_engineering_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'diplomacy_skill', title: <img alt="Diplomacy" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_diplomacy_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'medicine_skill', title: <img alt="Medicine" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_medicine_skill.png`} style={{ height: '1.1em' }} />, reverse: true }
];

class IndexPage extends Component<IndexPageProps, IndexPageState> {
	constructor(props) {
		super(props);
		this.state = {
			botcrew: [],
			initOptions: false,
			highlights: []
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
		let initOptions = false, highlights = [];
		const OPTIONS = ['searchFilter', 'filterType', 'column', 'direction', 'paginationRows', 'paginationPage'];

		// Always use URL search parameter if found
		//	TODO: Allow URL parameters for all options (with validation) so we can permalink search results
		let urlParams = new URLSearchParams(this.props.location.search);
		if (urlParams.has('search')) {
			initOptions = { searchFilter: urlParams.get('search') };
		}
		// Otherwise check <Link state>
		else if (this.props.location.state) {
			const linkState = this.props.location.state;
			OPTIONS.forEach((option) => {
				if (linkState[option]) {
					if (!initOptions) initOptions = {};
					initOptions[option] = linkState[option];
				}
			});
			if (linkState.highlights) highlights = linkState.highlights;
			// Clear history state now so that new stored values aren't overriden by outdated parameters
			window.history.replaceState(null, '');
		}

		this.setState({ botcrew, initOptions, highlights });
	}

	renderTableRow(crew: any): JSX.Element {
		const highlighted = {
			positive: this.state.highlights.indexOf(crew.symbol) >= 0
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
			<Table.Row key={crew.symbol} style={{ cursor: 'zoom-in' }} onClick={() => navigate(`/crew/${crew.symbol}/`)} {...highlighted}>
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
							{crew.bigbook_tier > 0 && <>Tier {formatTierLabel(crew.bigbook_tier)} (Legacy), </>}{formattedCounts}
						</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled />
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

	renderAnnouncements() {
		const expireInDays = 3;
		const dtNow = new Date();
		let announcements = this.props.data.allMarkdownRemark.edges;
		announcements = announcements.filter(({ node }) => {
			const dtThreshold = new Date(node.frontmatter.date);
			dtThreshold.setDate(dtThreshold.getDate()+expireInDays);
			return dtThreshold > dtNow;
		});
		if (announcements.length == 0) return (<></>);
		const announcement = announcements[0].node;
		return (
			<Message icon className={announcement.frontmatter.class ?? ''}>
				<Icon name={announcement.frontmatter.icon ?? 'info'} />
				<Message.Content>
					<Message.Header>{announcement.frontmatter.title ?? 'Message from the DataCore Team'}</Message.Header>
					<div dangerouslySetInnerHTML={{ __html: announcement.html }} />
				</Message.Content>
			</Message>
		);
	}

	render() {
		const { botcrew, initOptions } = this.state;
		if (!botcrew || botcrew.length === 0) {
			return (
				<Layout>
					<Icon loading name='spinner' /> Loading...
				</Layout>
			);
		}

		return (
			<Layout>
				{this.renderAnnouncements()}

				<Header as='h2'>Crew stats</Header>

				<SearchableTable
					id="index"
					data={botcrew}
					config={tableConfig}
					renderTableRow={crew => this.renderTableRow(crew)}
					filterRow={(crew, filter, filterType) => crewMatchesSearchFilter(crew, filter, filterType)}
					initOptions={initOptions}
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

export const query = graphql`
	query AnnouncementQuery {
	  allMarkdownRemark(
		limit: 1
		sort: {fields: frontmatter___date, order: DESC}
		filter: {fields: {source: {eq: "announcements"}}}
	  ) {
		edges {
		  node {
			html
			frontmatter {
			  title
			  date
			  class
			  icon
			}
		  }
		}
	  }
	}
`;