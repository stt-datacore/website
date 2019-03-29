import React, { Component } from 'react';
import { Container, Header, Table, Input, Rating, Pagination, Dropdown, Popup, Icon, Grid } from 'semantic-ui-react';
import { graphql, navigate } from 'gatsby';

import * as SearchString from 'search-string';
import * as localForage from 'localforage';

import Layout from '../components/layout';

type IndexPageProps = {
	data: {
		allCrewJson: any;
	};
};

type IndexPageState = {
	column: any;
	direction: 'descending' | 'ascending' | null;
	searchFilter: string;
	data: any[];
	pagination_rows: number;
	pagination_page: number;
};

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

class IndexPage extends Component<IndexPageProps, IndexPageState> {
	constructor(props) {
		super(props);

		this.state = {
			column: null,
			direction: null,
			searchFilter: '',
			pagination_rows: 10,
			pagination_page: 1,
			data: this.props.data.allCrewJson.edges.map(n => n.node)
		};
	}

	componentDidMount() {
		let urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('search')) {
			// Push the search string to localstorage for back button to behave as expected
			localForage.setItem<string>('searchFilter', urlParams.get('search'));
			this.setState({ searchFilter: urlParams.get('search') });
		} else {
			localForage.getItem<string>('searchFilter', (err, value) => {
				if (err) {
					console.error(err);
				} else {
					this.setState({ searchFilter: value });
				}
			});
		}
	}

	handleSort(clickedColumn, isSkill) {
		const { column, direction } = this.state;
		let { data } = this.state;

		if (column !== clickedColumn) {
			const compare = (a, b) => (a > b ? 1 : b > a ? -1 : 0);

			let sortedData;
			if (isSkill) {
				sortedData = data.sort(
					(a, b) =>
						(a.base_skills[clickedColumn] ? a.base_skills[clickedColumn].core : 0) -
						(b.base_skills[clickedColumn] ? b.base_skills[clickedColumn].core : 0)
				);
			} else {
				sortedData = data.sort((a, b) => compare(a[clickedColumn], b[clickedColumn]));
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

	render() {
		const { column, direction, pagination_rows, pagination_page } = this.state;
		let { data } = this.state;

		const matchesFilter = (input: string, searchString: string) => input.toLowerCase().indexOf(searchString.toLowerCase()) >= 0;

		if (this.state.searchFilter) {
			let filter = SearchString.parse(this.state.searchFilter);
			data = data.filter(crew => {
				let matches = true;

				if (filter.conditionArray.length === 0) {
					// text search only
					for (let segment of filter.textSegments) {
						let segmentResult =
							matchesFilter(crew.name, segment.text) ||
							crew.traits_named.some(t => matchesFilter(t, segment.text)) ||
							crew.traits_hidden.some(t => matchesFilter(t, segment.text));
						matches = matches && (segment.negated ? !segmentResult : segmentResult);
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
						}
						matches = matches && (condition.negated ? !conditionResult : conditionResult);
					}

					if (rarities.length > 0) {
						matches = matches && rarities.includes(crew.max_rarity);
					}

					for (let segment of filter.textSegments) {
						let segmentResult =
							matchesFilter(crew.name, segment.text) ||
							crew.traits_named.some(t => matchesFilter(t, segment.text)) ||
							crew.traits_hidden.some(t => matchesFilter(t, segment.text));
						matches = matches && (segment.negated ? !segmentResult : segmentResult);
					}
				}

				return matches;
			});
		}

		let totalPages = Math.ceil(data.length / this.state.pagination_rows);

		// Pagination
		data = data.slice(pagination_rows * (pagination_page - 1), pagination_rows * pagination_page);

		return (
			<Layout>
				<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
					<Header as='h2'>Crew stats</Header>


					<Input
						style={{width:'50%'}}
						icon='search'
						placeholder='Search...'
						value={this.state.searchFilter}
						onChange={(e, { value }) => this._onChangeFilter(value)}
					/>

					<Popup
						wide
						trigger={<Icon name='help' />}
						header={'Advanced search'}
						content={
							<div>
								<p>Do simple text search in the name and traits (with optional '-' for exclusion). For example, this will return all Rikers that are not romantic:</p>
								<p>
									<code>riker -romantic</code>
								</p>

								<p>You can also use advanced search to look through the <b>name</b>, <b>trait</b> or <b>rarity</b> fields. For example, this returns all crew with the 'Cultural Figure' trait of rarity 4 and 5 which are not alien and are from DS9:</p>
								<p>
									<code>trait:cultu rarity:4,5 -trait:nonhum ds9</code>
								</p>
								<p>Feedback is welcome!</p>
							</div>
						}
					/>

					<Table sortable celled selectable striped collapsing unstackable compact='very'>
						<Table.Header>
							<Table.Row>
								<Table.HeaderCell width={3} sorted={column === 'name' ? direction : null} onClick={() => this.handleSort('name', false)}>
									Crew
								</Table.HeaderCell>
								<Table.HeaderCell
									width={1}
									sorted={column === 'max_rarity' ? direction : null}
									onClick={() => this.handleSort('max_rarity', false)}>
									Rarity
								</Table.HeaderCell>
								<Table.HeaderCell
									width={1}
									sorted={column === 'command_skill' ? direction : null}
									onClick={() => this.handleSort('command_skill', true)}>
									Command
								</Table.HeaderCell>
								<Table.HeaderCell
									width={1}
									sorted={column === 'diplomacy_skill' ? direction : null}
									onClick={() => this.handleSort('diplomacy_skill', true)}>
									Diplomacy
								</Table.HeaderCell>
								<Table.HeaderCell
									width={1}
									sorted={column === 'engineering_skill' ? direction : null}
									onClick={() => this.handleSort('engineering_skill', true)}>
									Engineering
								</Table.HeaderCell>
								<Table.HeaderCell
									width={1}
									sorted={column === 'medicine_skill' ? direction : null}
									onClick={() => this.handleSort('medicine_skill', true)}>
									Medicine
								</Table.HeaderCell>
								<Table.HeaderCell
									width={1}
									sorted={column === 'science_skill' ? direction : null}
									onClick={() => this.handleSort('science_skill', true)}>
									Science
								</Table.HeaderCell>
								<Table.HeaderCell
									width={1}
									sorted={column === 'security_skill' ? direction : null}
									onClick={() => this.handleSort('security_skill', true)}>
									Security
								</Table.HeaderCell>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{data.map(crew => (
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
												<img width={48} src={`/media/assets/${crew.imageUrlPortrait}`} />
											</div>
											<div style={{ gridArea: 'stats' }}>
												<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{crew.name}</span>
											</div>
											<div style={{ gridArea: 'description' }}>{crew.short_name}</div>
										</div>
									</Table.Cell>
									<Table.Cell>
										<Rating defaultRating={crew.max_rarity} maxRating={crew.max_rarity} size='large' disabled />
									</Table.Cell>
									{crew.base_skills.command_skill ? (
										<Table.Cell textAlign='center'>
											<b>{crew.base_skills.command_skill.core}</b>
											<br />
											+({crew.base_skills.command_skill.range_min}-{crew.base_skills.command_skill.range_max})
										</Table.Cell>
									) : (
										<Table.Cell />
									)}
									{crew.base_skills.diplomacy_skill ? (
										<Table.Cell textAlign='center'>
											<b>{crew.base_skills.diplomacy_skill.core}</b>
											<br />
											+({crew.base_skills.diplomacy_skill.range_min}-{crew.base_skills.diplomacy_skill.range_max})
										</Table.Cell>
									) : (
										<Table.Cell />
									)}
									{crew.base_skills.engineering_skill ? (
										<Table.Cell textAlign='center'>
											<b>{crew.base_skills.engineering_skill.core}</b>
											<br />
											+({crew.base_skills.engineering_skill.range_min}-{crew.base_skills.engineering_skill.range_max})
										</Table.Cell>
									) : (
										<Table.Cell />
									)}
									{crew.base_skills.medicine_skill ? (
										<Table.Cell textAlign='center'>
											<b>{crew.base_skills.medicine_skill.core}</b>
											<br />
											+({crew.base_skills.medicine_skill.range_min}-{crew.base_skills.medicine_skill.range_max})
										</Table.Cell>
									) : (
										<Table.Cell />
									)}
									{crew.base_skills.science_skill ? (
										<Table.Cell textAlign='center'>
											<b>{crew.base_skills.science_skill.core}</b>
											<br />
											+({crew.base_skills.science_skill.range_min}-{crew.base_skills.science_skill.range_max})
										</Table.Cell>
									) : (
										<Table.Cell />
									)}
									{crew.base_skills.security_skill ? (
										<Table.Cell textAlign='center'>
											<b>{crew.base_skills.security_skill.core}</b>
											<br />
											+({crew.base_skills.security_skill.range_min}-{crew.base_skills.security_skill.range_max})
										</Table.Cell>
									) : (
										<Table.Cell />
									)}
								</Table.Row>
							))}
						</Table.Body>
						<Table.Footer>
							<Table.Row>
								<Table.HeaderCell colSpan='8'>
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
											onChange={(event, { value }) => this.setState({ pagination_page: 1, pagination_rows: value as number })}
										/>
									</span>
								</Table.HeaderCell>
							</Table.Row>
						</Table.Footer>
					</Table>
					<p>
						<i>Hint</i> Click on a row to get details on that specific crew
					</p>
				</Container>
			</Layout>
		);
	}

	_onChangePage(activePage) {
		this.setState({ pagination_page: activePage });
	}

	_onChangeFilter(value) {
		localForage.setItem<string>('searchFilter', value);
		this.setState({ searchFilter: value, pagination_page: 1 });
	}
}

export default IndexPage;

export const query = graphql`
	query {
		allCrewJson {
			edges {
				node {
					name
					symbol
					max_rarity
					imageUrlPortrait
					traits_named
					traits_hidden
					base_skills {
						security_skill {
							core
							range_min
							range_max
						}
						command_skill {
							core
							range_min
							range_max
						}
						diplomacy_skill {
							core
							range_min
							range_max
						}
						science_skill {
							core
							range_min
							range_max
						}
						medicine_skill {
							core
							range_min
							range_max
						}
						engineering_skill {
							core
							range_min
							range_max
						}
					}
				}
			}
		}
	}
`;
