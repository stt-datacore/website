import React, { Component } from 'react';
import { Header, Table, Rating, Icon, Dropdown } from 'semantic-ui-react';
import { navigate } from 'gatsby';

import Layout from '../components/layout';
import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';
import { formatTierLabel } from '../utils/crewutils';

type IndexPageProps = {};

type IndexPageState = {
	botcrew: any[];
};

const searchTypeOptions = [
    { key : '0', value : 'Exact', text : 'Exact match only' },
    { key : '1', value : 'Whole word', text : 'Whole word only' },
    { key : '2', value : 'Any match', text : 'Match any text' }
];

const tableConfig: ITableConfigRow[] = [
	{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'bigbook_tier', 'events'] },
	{ width: 1, column: 'max_rarity', title: 'Rarity' },
	{ width: 1, column: 'command_skill', title: 'Command' },
	{ width: 1, column: 'science_skill', title: 'Science' },
	{ width: 1, column: 'security_skill', title: 'Security' },
	{ width: 1, column: 'engineering_skill', title: 'Engineering' },
	{ width: 1, column: 'diplomacy_skill', title: 'Diplomacy' },
	{ width: 1, column: 'medicine_skill', title: 'Medicine' }
];

class IndexPage extends Component<IndexPageProps, IndexPageState> {
	state = { botcrew: [], searchType : 'Any match' };
    searchTypes = {
        'Exact': (input: string, searchString: string) => input.toLowerCase() == searchString.toLowerCase(),
        'Whole word': (input: string, searchString: string) => new RegExp('\\b' + searchString + '\\b', 'i').test(input),
        'Any match': (input: string, searchString: string) => input.toLowerCase().indexOf(searchString.toLowerCase()) >= 0
    };
    
	async componentDidMount() {
		let response = await fetch('/structured/crew.json');
		const botcrew = await response.json();

		// Add dummy fields for sorting to work
		botcrew.forEach(crew => {
			CONFIG.SKILLS_SHORT.forEach(skill => {
				crew[skill.name] = crew.base_skills[skill.name] ? crew.base_skills[skill.name].core : 0;
			});
		});

		this.setState({ botcrew });
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
					let conditionResult = true;
					if (condition.keyword === 'name') {
						conditionResult = matchesFilter(crew.name, condition.value);
					} else if (condition.keyword === 'trait') {
						conditionResult =
							crew.traits_named.some(t => matchesFilter(t, condition.value)) ||
							crew.traits_hidden.some(t => matchesFilter(t, condition.value));
					} else if (condition.keyword === 'rarity') {
						if (!condition.negated) {
							rarities.push(Number.parseInt(condition.value));
							continue;
						}

						conditionResult = crew.max_rarity === Number.parseInt(condition.value);
					} else if (condition.keyword === 'skill') {
						// Only full skill names or short names are valid here e.g. command or cmd
						let skillShort = CONFIG.SKILLS_SHORT.find(skill => skill.short === condition.value.toUpperCase());
						let skillName = skillShort ? skillShort.name : condition.value.toLowerCase()+"_skill";
						conditionResult = skillName in crew.base_skills;
					} else if (condition.keyword === 'in_portal') {
						conditionResult = condition.value.toLowerCase() === 'true' ? crew.in_portal : !crew.in_portal;
					}
					meetsAllConditions = meetsAllConditions && (condition.negated ? !conditionResult : conditionResult);
				}

				if (rarities.length > 0) {
					meetsAllConditions = meetsAllConditions && rarities.includes(crew.max_rarity);
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
							Tier {formatTierLabel(crew.bigbook_tier)}, {crew.events} events
						</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating rating={crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled />
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
					data={botcrew}
					explanation={
						<div>
							<p>
								Search for crew by name or trait (with optional '-' for exclusion). For example, this returns all Rikers
								that are not romantic:
							</p>
							<p>
								<code>riker -romantic</code>
							</p>

							<p>
								Search for multiple crew by separating terms with <b>OR</b>. This returns any Tuvok or T'Pol:
							</p>
							<p>
								<code>tuvok OR tpol</code>
							</p>

							<p>
								Specify <b>name</b>, <b>trait</b>, <b>rarity</b> or <b>skill</b> fields for more advanced searches. This
								returns all female crew of rarity 4 or 5 with science skill and the Q Continuum trait:
							</p>
							<p>
								<code>trait:female rarity:4,5 skill:sci trait:"q continuum"</code>
							</p>

							<p>
								Search for all crew that are in the game portal (<b>true</b>) or not (any other value):
							</p>
							<p>
								<code>in_portal:true</code>
							</p>
						</div>
					}
					renderTableRow={crew => this.renderTableRow(crew)}
					filterRow={(crew, filter) => this._filterCrew(crew, filter)}
					config={tableConfig}
					searchExt = { 
						<span style={{ paddingLeft: '2em' }}>
							<Dropdown inline
										options={searchTypeOptions}
										value={this.state.searchType}
										onChange={(event, {value}) => 
										this.setState({ searchType: value as number })
										}
							/>
						</span>
					}
				/>

				<p>
					<i>Hint</i> Click on a row to get details on that specific crew
				</p>
			</Layout>
		);
	}
}

export default IndexPage;
