import React from 'react';
import { Table, Icon, Rating, Pagination, Dropdown, Form, Checkbox } from 'semantic-ui-react';
import { navigate } from 'gatsby';

import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { formatTierLabel } from '../utils/crewutils';
import { useStateWithStorage } from '../utils/storage';

const tableConfig: ITableConfigRow[] = [
	{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'bigbook_tier', 'events'] },
	{ width: 1, column: 'max_rarity', title: 'Rarity' },
	{ width: 1, column: 'command_skill.core', title: 'Command' },
	{ width: 1, column: 'science_skill.core', title: 'Science' },
	{ width: 1, column: 'security_skill.core', title: 'Security' },
	{ width: 1, column: 'engineering_skill.core', title: 'Engineering' },
	{ width: 1, column: 'diplomacy_skill.core', title: 'Diplomacy' },
	{ width: 1, column: 'medicine_skill.core', title: 'Medicine' }
];

type ProfileCrewProps = {
	playerData: any;
	isTools?: boolean;
};

const ProfileCrew = (props: ProfileCrewProps) => {
	const { isTools } = props;

	const pageId = isTools ? 'tools' : 'profile';
	const [showFrozen, setShowFrozen] = useStateWithStorage(pageId+'/crew/showFrozen', true);
	const [findDupes, setFindDupes] = useStateWithStorage(pageId+'/crew/findDupes', false);

	const data = [...props.playerData.player.character.crew];

	function showThisCrew(crew: any, filters: [], filterType: string): boolean {
		if (!showFrozen && crew.immortal > 0) {
			return false;
		}

		if (findDupes) {
			if (data.filter((c) => c.symbol === crew.symbol).length === 1)
				return false;
		}

		return crewMatchesSearchFilter(crew, filters, filterType);
	}

	function renderTableRow(crew: any, idx: number): JSX.Element {
		return (
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
							<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{crew.name}</span>
						</div>
						<div style={{ gridArea: 'description' }}>{descriptionLabel(crew)}</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating rating={crew.rarity} maxRating={crew.max_rarity} size="large" disabled />
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

	function descriptionLabel(crew: any): JSX.Element {
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
					<span>Level {crew.level}, </span>
					<span>Tier {formatTierLabel(crew.bigbook_tier)}, </span>
					<span>{crew.events} events,</span>
					<span>{crew.collections.length} collections</span>
				</div>
			);
		}
	}

	return (
		<React.Fragment>
			<div style={{ margin: '.5em 0' }}>
				<Form.Group grouped>
					<Form.Field
						control={Checkbox}
						label='Show frozen (vaulted) crew'
						checked={showFrozen}
						onChange={(e, { checked }) => setShowFrozen(checked)}
					/>
					<Form.Field
						control={Checkbox}
						label='Only show duplicate crew'
						checked={findDupes}
						onChange={(e, { checked }) => setFindDupes(checked)}
					/>
				</Form.Group>
			</div>
			<SearchableTable
				id={isTools ? "tools_crew" : "profile_crew"}
				data={data}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderTableRow(crew, idx)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
				showFilterOptions="true"
			/>
		</React.Fragment>
	);
}

export default ProfileCrew;
