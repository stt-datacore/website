import React, { Component } from 'react';
import { Table, Icon, Rating, Pagination, Dropdown } from 'semantic-ui-react';
import { navigate } from 'gatsby';

type ProfileCrewProps = {
	playerData: any;
};

type ProfileCrewState = {
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

class ProfileCrew extends Component<ProfileCrewProps, ProfileCrewState> {
	constructor(props: ProfileCrewProps) {
		super(props);

		this.state = {
			column: null,
			direction: null,
			searchFilter: '',
			pagination_rows: 10,
			pagination_page: 1,
			data: this.props.playerData.player.character.crew
		};
	}

	_onChangePage(activePage) {
		this.setState({ pagination_page: activePage });
	}

	// TODO: share this code with index.tsx
	_handleSort(clickedColumn, isSkill) {
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

	_descriptionLabel(crew: any) {
		if (crew.immortal) {
			return (
				<div>
					<Icon name="snowflake" /> <span>{crew.immortal} frozen</span>
				</div>
			);
		} else {
			return (
				<div>
					{crew.favorite && <Icon name="heart" />}
					<span>Level {crew.level}</span>
				</div>
			);
		}
	}

	render() {
		const { column, direction, pagination_rows, pagination_page } = this.state;
		let { data } = this.state;

		let totalPages = Math.ceil(data.length / this.state.pagination_rows);

		// Pagination
		data = data.slice(pagination_rows * (pagination_page - 1), pagination_rows * pagination_page);

		return (
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
							sorted={column === 'command_skill' ? direction : null}
							onClick={() => this._handleSort('command_skill', true)}
						>
							Command
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'diplomacy_skill' ? direction : null}
							onClick={() => this._handleSort('diplomacy_skill', true)}
						>
							Diplomacy
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'engineering_skill' ? direction : null}
							onClick={() => this._handleSort('engineering_skill', true)}
						>
							Engineering
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'medicine_skill' ? direction : null}
							onClick={() => this._handleSort('medicine_skill', true)}
						>
							Medicine
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'science_skill' ? direction : null}
							onClick={() => this._handleSort('science_skill', true)}
						>
							Science
						</Table.HeaderCell>
						<Table.HeaderCell
							width={1}
							sorted={column === 'security_skill' ? direction : null}
							onClick={() => this._handleSort('security_skill', true)}
						>
							Security
						</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.map((crew, idx) => (
						<Table.Row key={idx} style={{ cursor: 'zoom-in' }} onClick={() => navigate(`/crew/${crew.symbol}/`)}>
							<Table.Cell>
								<div
									style={{
										display: 'grid',
										gridTemplateColumns: '60px auto',
										gridTemplateAreas: `'icon stats' 'icon description'`,
										gridGap: '1px'
									}}
								>
									<div style={{ gridArea: 'icon' }}>
										<img width={48} src={`/media/assets/${crew.imageUrlPortrait}`} />
									</div>
									<div style={{ gridArea: 'stats' }}>
										<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{crew.name}</span>
									</div>
									<div style={{ gridArea: 'description' }}>{this._descriptionLabel(crew)}</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Rating defaultRating={crew.rarity} rating={crew.rarity} maxRating={crew.max_rarity} size="large" disabled />
							</Table.Cell>
							{crew.base_skills.command_skill ? (
								<Table.Cell textAlign="center">
									<b>{crew.base_skills.command_skill.core}</b>
									<br />
									+({crew.base_skills.command_skill.range_min}-{crew.base_skills.command_skill.range_max})
								</Table.Cell>
							) : (
								<Table.Cell />
							)}
							{crew.base_skills.diplomacy_skill ? (
								<Table.Cell textAlign="center">
									<b>{crew.base_skills.diplomacy_skill.core}</b>
									<br />
									+({crew.base_skills.diplomacy_skill.range_min}-{crew.base_skills.diplomacy_skill.range_max})
								</Table.Cell>
							) : (
								<Table.Cell />
							)}
							{crew.base_skills.engineering_skill ? (
								<Table.Cell textAlign="center">
									<b>{crew.base_skills.engineering_skill.core}</b>
									<br />
									+({crew.base_skills.engineering_skill.range_min}-{crew.base_skills.engineering_skill.range_max})
								</Table.Cell>
							) : (
								<Table.Cell />
							)}
							{crew.base_skills.medicine_skill ? (
								<Table.Cell textAlign="center">
									<b>{crew.base_skills.medicine_skill.core}</b>
									<br />
									+({crew.base_skills.medicine_skill.range_min}-{crew.base_skills.medicine_skill.range_max})
								</Table.Cell>
							) : (
								<Table.Cell />
							)}
							{crew.base_skills.science_skill ? (
								<Table.Cell textAlign="center">
									<b>{crew.base_skills.science_skill.core}</b>
									<br />
									+({crew.base_skills.science_skill.range_min}-{crew.base_skills.science_skill.range_max})
								</Table.Cell>
							) : (
								<Table.Cell />
							)}
							{crew.base_skills.security_skill ? (
								<Table.Cell textAlign="center">
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
		);
	}
}

export default ProfileCrew;
