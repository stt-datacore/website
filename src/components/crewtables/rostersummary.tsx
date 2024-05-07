import React from 'react';
import { Modal, Button, Icon, Form, Select, Checkbox, Table, Popup, Rating } from 'semantic-ui-react';

import CONFIG from '../../components/CONFIG';
import { CompactCrew, CrewRoster, PlayerCrew } from '../../model/player';
import { ComputedSkill, CrewMember, Skill, SkillsSummary } from '../../model/crew';
import { BuffStatTable } from '../../utils/voyageutils';
import { applySkillBuff } from '../../utils/crewutils';

type RosterSummaryProps = {
	myCrew: PlayerCrew[];
	allCrew: CrewMember[];
	buffConfig: BuffStatTable;
};

const RosterSummary = (props: RosterSummaryProps) => {
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
				Roster Summary
				<Button.Group floated='right'>
					<Button onClick={() => setTableView('rarity')} positive={tableView === 'rarity' ? true : undefined}>
						By Rarity
					</Button>
					<Button.Or />
					<Button onClick={() => setTableView('skill')} positive={tableView === 'skill' ? true : undefined}>
						By Skill
					</Button>
				</Button.Group>
			</Modal.Header>
			<Modal.Content scrolling>
				{modalIsOpen && tableView === 'rarity' && <RarityDepth myCrew={props.myCrew} allCrew={props.allCrew} />}
				{modalIsOpen && tableView === 'skill' && <SkillDepth myCrew={props.myCrew} allCrew={props.allCrew} buffConfig={props.buffConfig} />}
			</Modal.Content>
			<Modal.Actions>
				<Button onClick={() => setModalIsOpen(false)}>
					Close
				</Button>
			</Modal.Actions>
		</Modal>
	);

	function renderTrigger(): JSX.Element {
		return (
			<Button icon='calculator' content='Roster Summary' size='large' />
		)
	}
};

type RarityDepthProps = {
	myCrew: PlayerCrew[];
	allCrew: CrewMember[];
};

const RarityDepth = (props: RarityDepthProps) => {
	const [rarityData, setRarityData] = React.useState<CrewRoster[] | undefined>(undefined);

	const isImmortal = c => c.level === 100 && c.rarity === c.max_rarity && c.equipment?.length === 4;

	React.useEffect(() => {
		const myCrew = JSON.parse(JSON.stringify(props.myCrew));
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
				name: 'Any',
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
		return <><Icon loading name='spinner' /> Loading...</>;

	return (
		<React.Fragment>
			<p>This table breaks down your roster by rarity and shows your progress toward immortalizing all crew in the game.</p>
			<RarityDepthTable data={rarityData} />
			<p>The Owned, % Owned, % Portal, Immortal, and % Immortal columns consider unique crew only. All other columns consider your duplicates.</p>
		</React.Fragment>
	);
};

type RarityDepthTableProps = {
	data: any[];
};

const RarityDepthTable = (props: RarityDepthTableProps) => {
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
		{ column: 'rarity', title: 'Rarity', center: false },
		{ column: 'owned', title: 'Owned', center: true, reverse: true },
		{ column: 'ownedPct', title: '% Owned', center: true, reverse: true },
		{ column: 'portalPct', title: '% Portal', center: true, reverse: true },
		{ column: 'progress', title: 'Immortal', center: true, reverse: true },
		{ column: 'progressPct', title: '% Immortal', center: true, reverse: true },
		{ column: 'immortal', title: 'Immortal+', center: true, reverse: true },
		{ column: 'unfrozen', title: 'Unfrozen', center: true, reverse: true },
		{ column: 'frozen', title: 'Frozen', center: true, reverse: true },
		{ column: 'dupes', title: 'Duplicate', center: true, reverse: true }
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

	function renderPercentCell(value: number): JSX.Element {
		if (value === 1) return <Icon name='check' color='green' />;
		return (
			<React.Fragment>
				{(value*100).toFixed(1)}
			</React.Fragment>
		);
	}

	function renderImmortalCell(rarity: number, immortal: number): JSX.Element {
		if (immortal === 0) return <></>;
		return (
			<React.Fragment>
				{immortal}
				{rarity === 0 &&
					<Popup
						trigger=<Icon name='help' />
						content=<p>Your achievements in-game may incorrectly report this number as <b>{immortal+1}</b>.</p>
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

	const [skillData, setSkillData] = React.useState<SkillsSummary[] | undefined>(undefined);
	const [scoreOption, setScoreOption] = React.useState('core');
	const [comboOption, setComboOption] = React.useState('all');
	const [preferVersatile, setPreferVersatile] = React.useState(false);

	React.useEffect(() => {
		const myCrew = JSON.parse(JSON.stringify(props.myCrew)) as CompactCrew[];
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
					name: crewBySkill.length > 0 ? crewBySkill[0].name ?? 'None' : 'None'
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

	if (!skillData)
		return <><Icon loading name='spinner' /> Loading...</>;

	return (
		<React.Fragment>
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
								{scoreOption !== 'core' && scoreOption !== 'shuttles' &&
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
			<SkillDepthTable data={skillData} />
			<p>The Owned and % Owned columns consider unique crew only. All other columns consider your duplicates.</p>
		</React.Fragment>
	);
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
		{ column: 'owned', title: 'Owned', center: true, reverse: true },
		{ column: 'ownedPct', title: '% Owned', center: true, reverse: true },
		{ column: 'average', title: 'Average', center: true, reverse: true },
		{ column: 'best', title: 'Best', center: false, reverse: true },
		{ column: 'tenAverage', title: <span>Ten Best <Popup trigger={<Icon name='help' />} content='The average score of your ten best crew at this skill' /></span>, center: true, reverse: true },
		{ column: 'maxPct', title: <span>% of Max <Popup trigger={<Icon name='help' />} content='How your ten best crew compare to all crew in the game with this skill' /></span>, center: true, reverse: true }
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