import React from 'react';
import { Modal, Button, Icon, Form, Select, Checkbox, Table, Popup, Rating } from 'semantic-ui-react';

import CONFIG from '../../components/CONFIG';
import { CompactCrew, CrewRoster, PlayerCrew } from '../../model/player';
import { ComputedSkill, CrewMember, SkillsSummary } from '../../model/crew';
import { BuffStatTable } from '../../utils/voyageutils';
import { applySkillBuff } from '../../utils/crewutils';
import { GlobalContext } from '../../context/globalcontext';

type RosterSummaryProps = {
	myCrew: PlayerCrew[];
	allCrew: CrewMember[];
	buffConfig: BuffStatTable;
};

const RosterSummary = (props: RosterSummaryProps) => {
	const { t } = React.useContext(GlobalContext).localized;

	const [modalIsOpen, setModalIsOpen] = React.useState(false);
	const [tableView, setTableView] = React.useState('rarity');

	return (
		<Modal
			open={modalIsOpen}
			onClose={() => setModalIsOpen(false)}
			onOpen={() => setModalIsOpen(true)}
			trigger={renderTrigger()}
			centered={false}
		>
			<Modal.Header>
				{t('roster_summary.title')}
				<Button.Group floated='right'>
					<Button onClick={() => setTableView('rarity')} positive={tableView === 'rarity' ? true : undefined}>
						{t('roster_summary.by_rarity')}
					</Button>
					<Button.Or />
					<Button onClick={() => setTableView('skill')} positive={tableView === 'skill' ? true : undefined}>
						{t('roster_summary.by_skill')}
					</Button>
				</Button.Group>
			</Modal.Header>
			<Modal.Content scrolling>
				{modalIsOpen && tableView === 'rarity' && <RarityDepth myCrew={props.myCrew} allCrew={props.allCrew} />}
				{modalIsOpen && tableView === 'skill' && <SkillDepth myCrew={props.myCrew} allCrew={props.allCrew} buffConfig={props.buffConfig} />}
			</Modal.Content>
			<Modal.Actions>
				<Button onClick={() => setModalIsOpen(false)}>
					{t('global.close')}
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function renderTrigger(): React.JSX.Element {
		return (
			<Button icon='calculator' content={t('roster_summary.title')} size='large' />
		)
	}
};

type RarityDepthProps = {
	myCrew: PlayerCrew[];
	allCrew: CrewMember[];
};

const RarityDepth = (props: RarityDepthProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const [rarityData, setRarityData] = React.useState<CrewRoster[] | undefined>(undefined);

	const isImmortal = c => c.level === 100 && c.rarity === c.max_rarity && c.equipment?.length === 4;

	React.useEffect(() => {
		const myCrew = structuredClone(props.myCrew);
		const uniqueOwned = props.allCrew.filter(crew => myCrew.filter(mc => mc.symbol === crew.symbol).length > 0);
		const uniqueImmortal = props.allCrew.filter(crew => myCrew.filter(mc => mc.symbol === crew.symbol && (mc.immortal > 0 || isImmortal(mc))).length > 0);
		const anyOwnedCount = myCrew.reduce((prev, curr) => prev + (curr.immortal > 0 ? curr.immortal : 1), 0);
		const anyImmortalCount = myCrew.reduce((prev, curr) => prev + (curr.immortal > 0 ? curr.immortal : (isImmortal(curr) ? 1 : 0)), 0);
		const anyUnfrozen = myCrew.filter(crew => crew.immortal <= 0);
		const uniqueFrozen = myCrew.filter(crew => crew.immortal > 0);
		const data = [] as CrewRoster[];
		data.push(
			{
				key: 0,
				rarity: 0,
				name: t('global.any'),
				total: props.allCrew.length,
				owned: uniqueOwned.length,
				ownedPct: uniqueOwned.length/props.allCrew.length,
				portalPct: uniqueOwned.filter(crew => !!!crew.in_portal).length/props.allCrew.filter(crew => !!!crew.in_portal).length,
				progress: uniqueImmortal.length,
				progressPct: uniqueImmortal.length/props.allCrew.length,
				immortal: anyImmortalCount,
				unfrozen: anyUnfrozen.length,
				frozen: uniqueFrozen.reduce((prev, curr) => prev + curr.immortal, 0),
				dupes: anyOwnedCount - uniqueOwned.length
			}
		);
		for (let i = 1; i <= 5; i++) {
			const allRarity = props.allCrew.filter(crew => crew.max_rarity === i);
			const myCrewRarity = myCrew.filter(crew => crew.max_rarity === i);
			const uniqueOwnedRarity = uniqueOwned.filter(crew => crew.max_rarity === i);
			const uniqueImmortalRarity = uniqueImmortal.filter(crew => crew.max_rarity === i);
			const anyOwnedRarityCount = myCrewRarity.reduce((prev, curr) => prev + (curr.immortal > 0 ? curr.immortal : 1), 0);
			const anyImmortalRarityCount = myCrewRarity.reduce((prev, curr) => prev + (curr.immortal > 0 ? curr.immortal : (isImmortal(curr) ? 1 : 0)), 0);
			const anyUnfrozenRarity = myCrewRarity.filter(crew => crew.immortal <= 0);
			const uniqueFrozenRarity = myCrewRarity.filter(crew => crew.immortal > 0);
			data.push(
				{
					key: i,
					rarity: i,
					name: `${i} - ${CONFIG.RARITIES[i].name}`,
					total: allRarity.length,
					owned: uniqueOwnedRarity.length,
					ownedPct: uniqueOwnedRarity.length/allRarity.length,
					portalPct: uniqueOwnedRarity.filter(crew => !!crew.in_portal).length/allRarity.filter(crew => !!crew.in_portal).length,
					progress: uniqueImmortalRarity.length,
					progressPct: uniqueImmortalRarity.length/allRarity.length,
					immortal: anyImmortalRarityCount,
					unfrozen: anyUnfrozenRarity.length,
					frozen: uniqueFrozenRarity.reduce((prev, curr) => prev + curr.immortal, 0),
					dupes: anyOwnedRarityCount - uniqueOwnedRarity.length
				}
			);
		}
		setRarityData([...data]);
	}, [props.myCrew]);

	if (!rarityData)
		return <><Icon loading name='spinner' /> {t('global.loading_ellipses')}</>;

	return (
		<React.Fragment>
			<p>{t('roster_summary.rarity.header_text')}</p>
			<RarityDepthTable data={rarityData} />
			<p>{t('roster_summary.rarity.footer_text')}</p>
		</React.Fragment>
	);
};

type RarityDepthTableProps = {
	data: any[];
};

const RarityDepthTable = (props: RarityDepthTableProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
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
		{ column: 'rarity', title: t('roster_summary.rarity.columns.rarity'), center: false },
		{ column: 'owned', title: t('roster_summary.rarity.columns.owned'), center: true, reverse: true },
		{ column: 'ownedPct', title: t('roster_summary.rarity.columns.ownedPct'), center: true, reverse: true },
		{ column: 'portalPct', title: t('roster_summary.rarity.columns.portalPct'), center: true, reverse: true },
		{ column: 'progress', title: t('roster_summary.rarity.columns.progress'), center: true, reverse: true },
		{ column: 'progressPct', title: t('roster_summary.rarity.columns.progressPct'), center: true, reverse: true },
		{ column: 'immortal', title: t('roster_summary.rarity.columns.immortal'), center: true, reverse: true },
		{ column: 'unfrozen', title: t('roster_summary.rarity.columns.unfrozen'), center: true, reverse: true },
		{ column: 'frozen', title: t('roster_summary.rarity.columns.frozen'), center: true, reverse: true },
		{ column: 'dupes', title: t('roster_summary.rarity.columns.dupes'), center: true, reverse: true }
	];

	return (
		<Table sortable celled selectable striped unstackable compact='very'>
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
							{row.rarity === 0 && <b>{row.name}</b>}
							{row.rarity > 0 &&
								<Rating icon='star' rating={row.rarity} maxRating={row.rarity} disabled />
							}
						</Table.Cell>
						<Table.Cell textAlign='center'>{row.owned} / {row.total}</Table.Cell>
						<Table.Cell textAlign='center'>{renderPercentCell(row.ownedPct)}</Table.Cell>
						<Table.Cell textAlign='center'>{renderPercentCell(row.portalPct)}</Table.Cell>
						<Table.Cell textAlign='center'>{row.progress}</Table.Cell>
						<Table.Cell textAlign='center'>{renderPercentCell(row.progressPct)}</Table.Cell>
						<Table.Cell textAlign='center'>{renderImmortalCell(row.rarity, row.immortal)}</Table.Cell>
						<Table.Cell textAlign='center'>{row.unfrozen > 0 ? row.unfrozen : ''}</Table.Cell>
						<Table.Cell textAlign='center'>{row.frozen > 0 ? row.frozen : ''}</Table.Cell>
						<Table.Cell textAlign='center'>{row.dupes > 0 ? row.dupes : ''}</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table>
	);

	function renderPercentCell(value: number): React.JSX.Element {
		if (value === 1) return <Icon name='check' color='green' />;
		return (
			<React.Fragment>
				{(value*100).toFixed(1)}
			</React.Fragment>
		);
	}

	function renderImmortalCell(rarity: number, immortal: number): React.JSX.Element {
		if (immortal === 0) return <></>;
		return (
			<React.Fragment>
				{immortal}
				{rarity === 0 &&
					<Popup
						trigger={<Icon name='help' />}
						content={<p>{tfmt('roster_summary.rarity.immortal_cell_help', { number: <b>{immortal+1}</b> })}</p>}
					/>
				}
			</React.Fragment>
		);
	}

	function reducer(state, action): any {
		switch (action.type) {
			case 'UPDATE_DATA':
				const updatedData = action.data.slice();
				firstSort(updatedData, 'rarity', false);
				return {
					column: 'rarity',
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

	function firstSort(data: any[], column: string, reverse: boolean = false) {
		data.sort((a, b) => {
			if (reverse)
				return b[column] - a[column];
			return a[column] - b[column];
		});
	}
};

type SkillDepthProps = {
	myCrew: PlayerCrew[];
	allCrew: CrewMember[];
	buffConfig: BuffStatTable;
};

const SkillDepth = (props: SkillDepthProps) => {
	const { buffConfig } = props;
	const { t } = React.useContext(GlobalContext).localized;

	const [skillData, setSkillData] = React.useState<SkillsSummary[] | undefined>(undefined);
	const [scoreOption, setScoreOption] = React.useState('core');
	const [comboOption, setComboOption] = React.useState('all');
	const [preferVersatile, setPreferVersatile] = React.useState(false);

	React.useEffect(() => {
		const myCrew = structuredClone(props.myCrew) as CompactCrew[];
		const myOwned = props.allCrew.filter(crew => myCrew.filter(mc => mc.symbol === crew.symbol).length > 0);

		const data = [] as SkillsSummary[];
		for (let first = 0; first < CONFIG.SKILLS_SHORT.length; first++) {
			let firstSkill = CONFIG.SKILLS_SHORT[first].name;
			if (comboOption === 'all' || comboOption === 'singles' || [firstSkill].includes(comboOption))
				data.push(getSkillData([firstSkill]));
			if (scoreOption !== 'core') {
				for (let second = first+1; second < CONFIG.SKILLS_SHORT.length; second++) {
					let secondSkill = CONFIG.SKILLS_SHORT[second].name;
					if (comboOption === 'all' || comboOption === 'pairs' || [firstSkill, secondSkill].includes(comboOption))
						data.push(getSkillData([firstSkill, secondSkill]));
					if (scoreOption !== 'shuttles') {
						for (let third = second+1; third < CONFIG.SKILLS_SHORT.length; third++) {
							let thirdSkill = CONFIG.SKILLS_SHORT[third].name;
							if (comboOption === 'all' || comboOption === 'triplets' || [firstSkill, secondSkill, thirdSkill].includes(comboOption))
								data.push(getSkillData([firstSkill, secondSkill, thirdSkill]));
						}
					}
				}
			}
		}
		setSkillData([...data]);

		function getSkillData(skills: string[]): SkillsSummary {
			const skillScore = (crew: PlayerCrew | CompactCrew) => {
				if (preferVersatile && crew.base_skills && Object.entries(crew.base_skills).length !== 3) return 0;
				const scores = [] as ComputedSkill[];
				skills.forEach(skill => {
					if (crew[skill] && crew[skill].core > 0) scores.push(crew[skill]);
				});
				if (scores.length < skills.length) return 0;
				return getSkillScore(scores);
			};
			const tallyAllCrewBySkill = () => {
				return props.allCrew.filter(crew => {
					if (preferVersatile && Object.entries(crew.base_skills).length !== 3) return false;
					let skillCount = 0;
					skills.forEach(skill => {
						if (crew.base_skills[skill]) skillCount++;
					});
					return skillCount >= skills.length;
				}).length;
			};
			const allTally = tallyAllCrewBySkill();
			const crewBySkill = myCrew.filter(crew => skillScore(crew) > 0).sort((a, b) => skillScore(b) - skillScore(a));
			const owned = myOwned.filter(crew => crewBySkill.filter(c => c.symbol === crew.symbol).length > 0);
			const skillAverage = crewBySkill.length > 0 ? crewBySkill.reduce((prev, curr) => prev + skillScore(curr), 0)/crewBySkill.length : 0;
			const myBestTen = crewBySkill.slice(0, Math.min(10, crewBySkill.length));
			const myBestTenSum = myBestTen.reduce((prev, curr) => prev + skillScore(curr), 0);
			const myBestTenAverage = myBestTen.length > 0 ? myBestTenSum/myBestTen.length : 0;
			return {
				key: skills.join(','),
				skills: skills,
				total: allTally,
				owned: owned.length,
				ownedPct: allTally > 0 ? owned.length / allTally : 0,
				average: skillAverage,
				best: {
					score: crewBySkill.length > 0 ? skillScore(crewBySkill[0]) : 0,
					name: crewBySkill.length > 0 ? crewBySkill[0].name ?? t('global.none') : t('global.none')
				},
				tenAverage: myBestTenAverage,
				maxPct: myBestTen.length > 0 ? getMaxPct(skills, myBestTen.length, myBestTenSum) : 0
			};
		}

		function getMaxPct(skills: string[], myBestCount: number, myBestSum: number): number {
			const skillScore = (crew: PlayerCrew | CrewMember) => {
				if (preferVersatile && Object.entries(crew.base_skills).length !== 3) return 0;
				const scores = [] as ComputedSkill[];
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

		function getSkillScore(scores: ComputedSkill[]): number {
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

		// function applySkillBuff(buffConfig: any, skill: string, base_skill: Skill): ComputedSkill {
		// 	const getMultiplier = (skill: string, stat: string) => {
		// 		return buffConfig[`${skill}_${stat}`].multiplier + buffConfig[`${skill}_${stat}`].percent_increase;
		// 	};
		// 	return {
		// 		core: Math.round(base_skill.core*getMultiplier(skill, 'core')),
		// 		min: Math.round(base_skill.range_min*getMultiplier(skill, 'range_min')),
		// 		max: Math.round(base_skill.range_max*getMultiplier(skill, 'range_max'))
		// 	};
		// }
	}, [props.myCrew, scoreOption, comboOption, preferVersatile]);

	const scoreOptions = [
		{ key: 'core', value: 'core', text: t('roster_summary.skills.score.core') },
		{ key: 'shuttles', value: 'shuttles', text: t('roster_summary.skills.score.shuttles') },
		{ key: 'gauntlet', value: 'gauntlet', text: t('roster_summary.skills.score.gauntlet') },
		{ key: 'voyage', value: 'voyage', text: t('roster_summary.skills.score.voyage') }
	];

	const comboOptions = [
		{ key: 'all', value: 'all', text: t('roster_summary.skills.combos.all'), excludes: [] },
		{ key: 'singles', value: 'singles', text: t('roster_summary.skills.combos.singles'), excludes: [] },
		{ key: 'pairs', value: 'pairs', text: t('roster_summary.skills.combos.pairs'), excludes: ['core', 'shuttles'] },
		{ key: 'triplets', value: 'triplets', text: t('roster_summary.skills.combos.triplets'), excludes: ['core', 'shuttles'] }
	];

	CONFIG.SKILLS_SHORT.forEach(skill => {
		comboOptions.push({
			key: skill.name, value: skill.name, text:t('roster_summary.skills.combos.skill_only', { skill: CONFIG.SKILLS[skill.name]}), excludes: ['core']
		});
	});

	if (!skillData)
		return <><Icon loading name='spinner' /> {t('global.loading_ellipses')}</>;

	return (
		<React.Fragment>
			<p>{t('roster_summary.skills.header_text')}</p>
			<div style={{ marginTop: '1em' }}>
				<Form>
					<Form.Group inline>
						<Form.Field
							control={Select}
							label={t('roster_summary.skills.score_title')}
							options={scoreOptions}
							value={scoreOption}
							onChange={(e, { value }) => { setScoreOption(value); setComboOption('all'); setPreferVersatile(false); }}
							placeholder='Score'
						/>
						{scoreOption !== 'core' &&
							<React.Fragment>
								<Form.Field
									control={Select}
									label={t('roster_summary.skills.combos_title')}
									options={comboOptions.filter(combo => !combo.excludes.includes(scoreOption))}
									value={comboOption}
									onChange={(e, { value }) => setComboOption(value)}
									placeholder={t('roster_summary.skills.combos_title')}
								/>
								{scoreOption !== 'core' && scoreOption !== 'shuttles' &&
									<Form.Field
										control={Checkbox}
										label={t('roster_summary.skills.three_skill_check')}
										checked={preferVersatile}
										onChange={(e, { checked }) => setPreferVersatile(checked)}
									/>
								}
							</React.Fragment>
						}
					</Form.Group>
				</Form>
			</div>
			<SkillDepthTable data={skillData} />
			<p>{t('roster_summary.skills.footer_text')}</p>
		</React.Fragment>
	);
};

type SkillDepthTableProps = {
	data: any[];
};

const SkillDepthTable = (props: SkillDepthTableProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
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
		{ column: 'skills', title: t('roster_summary.skills.columns.skills'), center: false },
		{ column: 'owned', title: t('roster_summary.skills.columns.owned'), center: true, reverse: true },
		{ column: 'ownedPct', title: t('roster_summary.skills.columns.ownedPct'), center: true, reverse: true },
		{ column: 'average', title: t('roster_summary.skills.columns.average'), center: true, reverse: true },
		{ column: 'best', title: t('roster_summary.skills.columns.best'), center: false, reverse: true },
		{ column: 'tenAverage', title: <span>{t('roster_summary.skills.columns.tenAverage.title')} <Popup trigger={<Icon name='help' />} content={t('roster_summary.skills.columns.tenAverage.description')}  /></span>, center: true, reverse: true },
		{ column: 'maxPct', title: <span>{t('roster_summary.skills.columns.maxPct.title')}  <Popup trigger={<Icon name='help' />} content={t('roster_summary.skills.columns.maxPct.description')}  /></span>, center: true, reverse: true }
	];

	return (
		<Table sortable celled selectable striped unstackable compact='very'>
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
						<Table.Cell textAlign='center'>{row.owned} / {row.total}</Table.Cell>
						<Table.Cell textAlign='center'>{(row.ownedPct*100).toFixed(1)}</Table.Cell>
						<Table.Cell textAlign='center'>{row.average.toFixed(1)}</Table.Cell>
						<Table.Cell>{Math.floor(row.best.score)} ({row.best.name})</Table.Cell>
						<Table.Cell textAlign='center'>{row.tenAverage.toFixed(1)}</Table.Cell>
						<Table.Cell textAlign='center'>{(row.maxPct*100).toFixed(1)}</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table>
	);

	function reducer(state, action): any {
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

	function firstSort(data: any[], column: string, reverse: boolean = false) {
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

export default RosterSummary;