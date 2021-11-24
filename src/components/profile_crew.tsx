import React from 'react';
import { Table, Icon, Rating, Form, Checkbox, Header, Popup, Select } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';

import { SearchableTable, ITableConfigRow, initSearchableOptions } from '../components/searchabletable';

import CONFIG from '../components/CONFIG';
import CABExplanation from '../components/cabexplanation';

import { crewMatchesSearchFilter } from '../utils/crewsearch';
import { formatTierLabel } from '../utils/crewutils';
import { useStateWithStorage } from '../utils/storage';
import { calculateBuffConfig } from '../utils/voyageutils';

const rarityLabels = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];

type ProfileCrewProps = {
	playerData: any;
	isTools?: boolean;
	allCrew?: any[];
};

const ProfileCrew = (props: ProfileCrewProps) => {
	const { isTools } = props;
	const pageId = isTools ? 'tools' : 'profile';
	const myCrew = [...props.playerData.player.character.crew];
	const buffConfig = calculateBuffConfig(props.playerData.player);
	return (
		<React.Fragment>
			<ProfileCrewTable pageId={pageId} crew={myCrew} />
			{isTools && <SkillDepth myCrew={myCrew} allCrew={props.allCrew} buffConfig={buffConfig} />}
		</React.Fragment>
	);
};

type ProfileCrewTableProps = {
	pageId: string;
	crew: any[];
};

const ProfileCrewTable = (props: ProfileCrewTableProps) => {
	const { pageId } = props;
	const [showFrozen, setShowFrozen] = useStateWithStorage(pageId+'/crew/showFrozen', true);
	const [findDupes, setFindDupes] = useStateWithStorage(pageId+'/crew/findDupes', false);
	const [initOptions, setInitOptions] = React.useState(undefined);

	React.useEffect(() => {
		// Check for custom initial table options from URL or <Link state>
		const options = initSearchableOptions(window.location);
		// Clear history state now so that new stored values aren't overriden by outdated parameters
		if (window.location.state && options)
			window.history.replaceState(null, '');
		setInitOptions({...options});
	}, []);

	if (!initOptions) return (<><Icon loading name='spinner' /> Loading...</>);

	const myCrew = JSON.parse(JSON.stringify(props.crew));

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: 'Crew', pseudocolumns: ['name', 'bigbook_tier', 'events'] },
		{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true, tiebreakers: ['rarity'] },
		{ width: 1, column: 'cab_ov', title: <span>CAB <CABExplanation /></span>, reverse: true, tiebreakers: ['cab_ov_rank'] },
		{ width: 1, column: 'ranks.voyRank', title: 'Voyage' }
	];
	CONFIG.SKILLS_SHORT.forEach((skill) => {
		tableConfig.push({
			width: 1,
			column: `${skill.name}.core`,
			title: <img alt={CONFIG.SKILLS[skill.name]} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.name}.png`} style={{ height: '1.1em' }} />,
			reverse: true
		});
	});

	function showThisCrew(crew: any, filters: [], filterType: string): boolean {
		if (!showFrozen && crew.immortal > 0) {
			return false;
		}

		if (findDupes) {
			if (myCrew.filter((c) => c.symbol === crew.symbol).length === 1)
				return false;
		}

		return crewMatchesSearchFilter(crew, filters, filterType);
	}

	function renderTableRow(crew: any, idx: number): JSX.Element {
		const highlighted = {
			positive: initOptions.highlights?.indexOf(crew.symbol) >= 0
		};

		return (
			<Table.Row key={idx} style={{ cursor: 'zoom-in' }} onClick={() => navigate(`/crew/${crew.symbol}/`)} {...highlighted}>
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
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
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
				id={`${pageId}_crew`}
				data={myCrew}
				config={tableConfig}
				renderTableRow={(crew, idx) => renderTableRow(crew, idx)}
				filterRow={(crew, filters, filterType) => showThisCrew(crew, filters, filterType)}
				initOptions={initOptions}
				showFilterOptions="true"
			/>
		</React.Fragment>
	);
}

type SkillDepthProps = {
	myCrew: any[];
	allCew: any[];
	buffConfig: any;
};

const SkillDepth = (props: SkillDepthProps) => {
	const { buffConfig } = props;

	const [scoreOption, setScoreOption] = React.useState('core');
	const [comboOption, setComboOption] = React.useState('all');
	const [preferVersatile, setPreferVersatile] = React.useState(false);

	const scoreOptions = [
		{ key: 'core', value: 'core', text: 'Core' },
		{ key: 'shuttles', value: 'shuttles', text: 'Shuttles' },
		{ key: 'gauntlet', value: 'gauntlet', text: 'Gauntlet' },
		{ key: 'voyage', value: 'voyage', text: 'Voyage' }
	];

	const comboOptions = [
		{ key: 'all', value: 'all', text: 'All skill combos', excludes: [] },
		{ key: 'singles', value: 'singles', text: 'Single skills only', excludes: [] },
		{ key: 'pairs', value: 'pairs', text: 'Pairs only', excludes: ['core', 'shuttles'] },
		{ key: 'triplets', value: 'triplets', text: 'Triplets only', excludes: ['core', 'shuttles'] }
	];
	CONFIG.SKILLS_SHORT.forEach(skill => {
		comboOptions.push({
			key: skill.name, value: skill.name, text: `${CONFIG.SKILLS[skill.name]} only`, excludes: ['core']
		});
	});

	const myCrew = JSON.parse(JSON.stringify(props.myCrew));

	const data = [];
	for (let first = 0; first < CONFIG.SKILLS_SHORT.length; first++) {
		let firstSkill = CONFIG.SKILLS_SHORT[first].name;
		if (comboOption == 'all' || comboOption == 'singles' || [firstSkill].includes(comboOption))
			data.push(getSkillData([firstSkill]));
		if (scoreOption != 'core') {
			for (let second = first+1; second < CONFIG.SKILLS_SHORT.length; second++) {
				let secondSkill = CONFIG.SKILLS_SHORT[second].name;
				if (comboOption == 'all' || comboOption == 'pairs' || [firstSkill, secondSkill].includes(comboOption))
					data.push(getSkillData([firstSkill, secondSkill]));
				if (scoreOption != 'shuttles') {
					for (let third = second+1; third < CONFIG.SKILLS_SHORT.length; third++) {
						let thirdSkill = CONFIG.SKILLS_SHORT[third].name;
						if (comboOption == 'all' || comboOption == 'triplets' || [firstSkill, secondSkill, thirdSkill].includes(comboOption))
							data.push(getSkillData([firstSkill, secondSkill, thirdSkill]));
					}
				}
			}
		}
	}

	return (
		<React.Fragment>
			<Header as='h4'>Skill Depth</Header>
			<p>This table shows the depth and strength of your roster at various areas of the game for every relevant skill combination.</p>
			<div style={{ marginTop: '1em' }}>
				<Form>
					<Form.Group inline>
						<Form.Field
							control={Select}
							label='Score'
							options={scoreOptions}
							value={scoreOption}
							onChange={(e, { value }) => { setScoreOption(value); setComboOption('all'); setPreferVersatile(false); }}
							placeholder='Score'
						/>
						{scoreOption !== 'core' &&
							<React.Fragment>
								<Form.Field
									control={Select}
									label='Filter skills'
									options={comboOptions.filter(combo => !combo.excludes.includes(scoreOption))}
									value={comboOption}
									onChange={(e, { value }) => setComboOption(value)}
									placeholder='Filter skills'
								/>
								{scoreOption != 'core' && scoreOption != 'shuttles' &&
									<Form.Field
										control={Checkbox}
										label='Only consider 3-skill crew'
										checked={preferVersatile}
										onChange={(e, { checked }) => setPreferVersatile(checked)}
									/>
								}
							</React.Fragment>
						}
					</Form.Group>
				</Form>
			</div>
			<SkillDepthTable data={data} />
		</React.Fragment>
	);

	function getSkillData(skills: string[]) {
		const skillScore = (crew) => {
			if (preferVersatile && Object.entries(crew.base_skills).length != 3) return 0;
			const scores = [];
			skills.forEach(skill => {
				if (crew[skill].core > 0) scores.push(crew[skill]);
			});
			if (scores.length < skills.length) return 0;
			return getSkillScore(scores);
		};
		const crewBySkill = myCrew.filter(crew => skillScore(crew) > 0).sort((a, b) => skillScore(b) - skillScore(a));
		const skillAverage = crewBySkill.length > 0 ? crewBySkill.reduce((prev, curr) => prev + skillScore(curr), 0)/crewBySkill.length : 0;
		const myBestTen = crewBySkill.slice(0, Math.min(10, crewBySkill.length));
		const myBestTenSum = myBestTen.reduce((prev, curr) => prev + skillScore(curr), 0);
		const myBestTenAverage = myBestTen.length > 0 ? myBestTenSum/myBestTen.length : 0;
		return {
			key: skills.join(','),
			skills: skills,
			count: crewBySkill.length,
			average: skillAverage,
			best: {
				score: crewBySkill.length > 0 ? skillScore(crewBySkill[0]) : 0,
				name: crewBySkill.length > 0 ? crewBySkill[0].name : 'None'
			},
			tenAverage: myBestTenAverage,
			maxRatio: myBestTen.length > 0 ? getMaxRatio(skills, myBestTen.length, myBestTenSum) : 0
		};
	}

	function getMaxRatio(skills: string[], myBestCount: number, myBestSum: number): number {
		const skillScore = (crew) => {
			if (preferVersatile && Object.entries(crew.base_skills).length != 3) return 0;
			const scores = [];
			skills.forEach(skill => {
				if (crew.base_skills[skill]) scores.push(applySkillBuff(buffConfig, skill, crew.base_skills[skill]));
			});
			if (scores.length < skills.length) return 0;
			return getSkillScore(scores);
		};
		const crewBySkill = props.allCrew.filter(crew => skillScore(crew) > 0)
			.sort((a, b) => skillScore(b) - skillScore(a));
		const allBestTen = crewBySkill.slice(0, Math.min(10, crewBySkill.length));
		const allBestTenSum = allBestTen.reduce((prev, curr) => prev + skillScore(curr), 0);
		return myBestSum/allBestTenSum;
	}

	function getSkillScore(scores: any[]): number {
		if (scoreOption === 'voyage')
			return scores.reduce((prev, curr) => prev + curr.core+(curr.min+curr.max)/2, 0);
		if (scoreOption === 'gauntlet')
			return scores.reduce((prev, curr) => prev + curr.max, 0)/scores.length;
		if (scores.length > 1) {
			if (scores[0].core > scores[1].core)
				return scores[0].core+(scores[1].core/4);
			return scores[1].core+(scores[0].core/4);
		}
		return scores[0].core;
	}

	function applySkillBuff(buffConfig: any, skill: string, base_skill: any): { core: number, min: number, max: number } {
		const getMultiplier = (skill: string, stat: string) => {
			return buffConfig[`${skill}_${stat}`].multiplier + buffConfig[`${skill}_${stat}`].percent_increase;
		};
		return {
			core: Math.round(base_skill.core*getMultiplier(skill, 'core')),
			min: Math.round(base_skill.range_min*getMultiplier(skill, 'range_min')),
			max: Math.round(base_skill.range_max*getMultiplier(skill, 'range_max'))
		};
	}
};

type SkillDepthTableProps = {
	data: any[];
};

const SkillDepthTable = (props: SkillDepthTableProps) => {
	const skillsMap = CONFIG.SKILLS_SHORT.map(skill => skill.name);

	const [state, dispatch] = React.useReducer(reducer, {
		column: null,
		data: props.data,
		direction: null
	});
	const { column, data, direction } = state;

	React.useEffect(() => {
		dispatch({ type: 'UPDATE_DATA', data: props.data });
	}, [props.data]);

	const tableConfig = [
		{ column: 'skills', title: 'Skill', center: false },
		{ column: 'count', title: 'Crew count', center: true, reverse: true },
		{ column: 'average', title: 'Average', center: true, reverse: true },
		{ column: 'best', title: 'Best', center: false, reverse: true },
		{ column: 'tenAverage', title: <span>Ten Best <Popup trigger={<Icon name="help" />} content='The average score of your ten best crew at this skill' /></span>, center: true, reverse: true },
		{ column: 'maxRatio', title: <span>% of Max <Popup trigger={<Icon name="help" />} content='How your ten best crew compare to all crew in the game with this skill' /></span>, center: true, reverse: true }
	];

	return (
		<Table sortable celled selectable striped unstackable compact="very">
			<Table.Header>
				<Table.Row>
					{tableConfig.map((cell, idx) => (
						<Table.HeaderCell key={idx}
							sorted={column === cell.column ? direction : null}
							onClick={() => dispatch({ type: 'CHANGE_SORT', column: cell.column, reverse: cell.reverse })}
							textAlign={cell.center ? 'center' : 'left'}
						>
							{cell.title}
						</Table.HeaderCell>
					))}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{data.map(row => (
					<Table.Row key={row.key}>
						<Table.Cell>
							{row.skills.map(skill => (
								<img key={skill} alt={skill} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1.1em', padding: '0 2px' }} />
							))}
						</Table.Cell>
						<Table.Cell textAlign='center'>{row.count}</Table.Cell>
						<Table.Cell textAlign='center'>{row.average.toFixed(1)}</Table.Cell>
						<Table.Cell>{Math.floor(row.best.score)} ({row.best.name})</Table.Cell>
						<Table.Cell textAlign='center'>{row.tenAverage.toFixed(1)}</Table.Cell>
						<Table.Cell textAlign='center'>{(row.maxRatio*100).toFixed(1)}</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table>
	);

	function reducer(state, action) {
		switch (action.type) {
			case 'UPDATE_DATA':
				const updatedData = action.data.slice();
				firstSort(updatedData, 'skills', false);
				return {
					column: 'skills',
					data: updatedData,
					direction: 'ascending'
				};
			case 'CHANGE_SORT':
				if (state.column === action.column) {
					return {
						...state,
						data: state.data.slice().reverse(),
						direction: state.direction === 'ascending' ? 'descending' : 'ascending'
					};
				}
				else {
					const data = state.data.slice();
					firstSort(data, action.column, action.reverse);
					return {
						column: action.column,
						data: data,
						direction: action.reverse ? 'descending' : 'ascending'
					};
				}
			default:
				throw new Error();
		}
	}

	function firstSort(data: any[], column: string, reverse: boolean = false): any[] {
		data.sort((a, b) => {
			if (column === 'skills') {
				if (a.skills.length === b.skills.length) {
					let index = 0;
					while (a.skills[index] === b.skills[index] && index < a.skills.length) {
						index++;
					}
					return skillsMap.indexOf(a.skills[index]) - skillsMap.indexOf(b.skills[index]);
				}
				return a.skills.length - b.skills.length;
			}
			else if (column === 'best')
				return b.best.score - a.best.score;
			else if (reverse)
				return b[column] - a[column];
			return a[column] - b[column];
		});
	}
};

export default ProfileCrew;
