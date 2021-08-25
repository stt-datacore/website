import React from 'react';
import { Table, Icon, Rating, Pagination, Dropdown, Form, Checkbox } from 'semantic-ui-react';
import { navigate } from 'gatsby';

import { SearchableTable, ITableConfigRow } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';
import CABExplanation from '../components/cabexplanation';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { formatTierLabel } from '../utils/crewutils';
import { useStateWithStorage } from '../utils/storage';

const rarityLabels = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];

const tableConfig: ITableConfigRow[] = [
	{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'bigbook_tier', 'events'] },
	{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true },
	{ width: 1, column: 'cab_ov', title: <span>CAB <CABExplanation /></span>, reverse: true },
	{ width: 1, column: 'ranks.voyRank', title: 'Voyage' },
	{ width: 1, column: 'command_skill.core', title: <img alt="Command" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_command_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'science_skill.core', title: <img alt="Science" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_science_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'security_skill.core', title: <img alt="Security" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_security_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'engineering_skill.core', title: <img alt="Engineering" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_engineering_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'diplomacy_skill.core', title: <img alt="Diplomacy" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_diplomacy_skill.png`} style={{ height: '1.1em' }} />, reverse: true },
	{ width: 1, column: 'medicine_skill.core', title: <img alt="Medicine" src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_medicine_skill.png`} style={{ height: '1.1em' }} />, reverse: true }
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
					<Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size="large" disabled />
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
					crew[skill.name].core > 0 ? (
						<Table.Cell key={skill.name} textAlign='center'>
							<b>{crew[skill.name].core}</b>
							<br />
							+({crew[skill.name].min}-{crew[skill.name].max})
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
				<div>
					{crew.favorite && <Icon name="heart" />}
					<span>Level {crew.level}, </span>
					{crew.bigbook_tier > 0 && <>Tier {formatTierLabel(crew.bigbook_tier)} (Legacy), </>}{formattedCounts}
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
