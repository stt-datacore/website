import React from 'react';
import { Grid, Button, Table, Popup, Icon, Card, Label, SemanticICONS } from 'semantic-ui-react';

import { Skill } from '../../model/crew';
import { PlayerCrew, Voyage, VoyageCrewSlot } from '../../model/player';
import { Ship } from '../../model/ship';
import { IVoyageCalcConfig } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import ItemDisplay from '../itemdisplay';
import CONFIG from '../CONFIG';
import { useStateWithStorage } from '../../utils/storage';
import { renderKwipmentBonus } from '../item_presenters/item_presenter';
import { isQuipped } from '../../utils/crewutils';
import { getCrewTraitBonus, getCrewVP, getShipTraitBonus } from './utils';

interface IAssignment {
	crew: PlayerCrew;
	name: string;
	trait: string;
	bestRank: ISkillsRank | undefined;
};

interface ISkillsRankings {
	[key: string]: PlayerCrew[];	// key is skill or joined skills combo (i.e. skill,skill)
};

interface ISkillsRank {
	skills: string[];
	rank: number;
};

interface IShipData {
	direction: 'left' | 'right';
	index: number;
	shipBonus: number;
	crewBonus: number;
};

interface IViewContext {
	voyageConfig: IVoyageCalcConfig | Voyage;
	rosterType?: 'allCrew' | 'myCrew';
	ship?: Ship;
	shipData: IShipData;
	assignments: IAssignment[];
};

const ViewContext = React.createContext<IViewContext>({} as IViewContext);

const SHOW_SHIP_FINDER = false;
const POPUP_DELAY = 500;

const voySkillScore = (sk: Skill) => sk.core + (sk.range_min + sk.range_max)/2;
const crewVoySkillsScore = (c: PlayerCrew, skills: string[]) => skills.reduce((prev, curr) => prev + voySkillScore((c.skills[curr] as Skill)), 0);

const profSkillScore = (sk: Skill) => sk.range_max;
const crewProfSkillsScore = (c: PlayerCrew, skills: string[]) => skills.reduce((prev, curr) => prev + profSkillScore((c.skills[curr] as Skill)), 0);

type LineupViewerProps = {
	configSource?: 'player' | 'custom';
	voyageConfig: IVoyageCalcConfig | Voyage;
	ship?: Ship;
	roster?: PlayerCrew[];
	rosterType?: 'allCrew' | 'myCrew';
};

export const LineupViewer = (props: LineupViewerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { configSource, voyageConfig, ship, roster, rosterType } = props;

	const findBestRank: boolean = configSource === 'player';

	const skillRankings: ISkillsRankings = initSkillRankings();
	//const skillCombos: ISkillsRankings = initSkillCombos();

	const usedCrew: number[] = [];
	const assignments: IAssignment[] = Object.values(CONFIG.VOYAGE_CREW_SLOTS).map(entry => {
		const { crew, name, trait, skill } = (Object.values(voyageConfig.crew_slots).find(slot => slot.symbol === entry) as VoyageCrewSlot);
		const bestRank: ISkillsRank | undefined = findBestRank ? getBestRank(crew, skill, usedCrew) : undefined;
		if (!crew.imageUrlPortrait)
			crew.imageUrlPortrait = `${crew.portrait.file.slice(1).replace('/', '_')}.png`;
		usedCrew.push(crew.id);
		return {
			crew, name, trait, bestRank
		};
	});

	const shipData: IShipData = {
		direction: 'right',
		index: -1,
		shipBonus: 0,
		crewBonus: 0
	};

	if (ship) {
		if (!ship.index) ship.index = { left: 0, right: 0 };
		shipData.direction = ship.index.right < ship.index.left ? 'right' : 'left';
		shipData.index = ship.index[shipData.direction] ?? 0;
		shipData.shipBonus = getShipTraitBonus(voyageConfig, ship);
		shipData.crewBonus = voyageConfig.max_hp - ship.antimatter - shipData.shipBonus;
	}

	const viewContext: IViewContext = {
		voyageConfig,
		rosterType,
		ship,
		shipData,
		assignments
	};

	return (
		<ViewContext.Provider value={viewContext}>
			<React.Fragment>
				{playerData && <PlayerViewPicker dbid={`${playerData.player.dbid}`} />}
				{!playerData && <NonPlayerViewPicker />}
			</React.Fragment>
		</ViewContext.Provider>
	);

	function initSkillRankings(): ISkillsRankings {
		const skillRankings: ISkillsRankings = {};
		if (roster) {
			roster.forEach(crew => {
				const crewSkills: string[] = Object.keys(crew.skills);
				crewSkills.forEach(skill => {
					skillRankings[skill] ??= [];
					skillRankings[skill].push(crew);
				});
			});
			Object.keys(skillRankings).forEach(skill => {
				skillRankings[skill] = skillRankings[skill].sort((c1: PlayerCrew, c2: PlayerCrew) => {
					if (voyageConfig.voyage_type === 'encounter')
						return encounterSort(c1, c2, [skill]);
					return dilemmaSort(c1, c2, [skill]);
				});
			});
		}
		return skillRankings;
	}

	// function initSkillCombos(): ISkillsRankings {
	// 	const skillCombos: ISkillsRankings = {};
	// 	if (!findBestRank) return skillCombos;

	// 	[1, 2, 3].forEach(i => {
	// 		souzaCombinations(Object.keys(CONFIG.SKILLS), i).forEach(skills => {
	// 			skillCombos[skills.join(',')] = [];
	// 		});
	// 	});

	// 	if (roster) {
	// 		roster.forEach(crew => {
	// 			const crewSkills: string[] = Object.keys(crew.skills);
	// 			for (let i = 1; i <= crewSkills.length; i++) {
	// 				souzaCombinations(crewSkills, i).forEach(skills => {
	// 					skillCombos[skills.join(',')].push(crew);
	// 				});
	// 			}
	// 		});
	// 		Object.keys(skillCombos).forEach(skills => {
	// 			skillCombos[skills] = skillCombos[skills].sort((c1: PlayerCrew, c2: PlayerCrew) => {
	// 				if (voyageConfig.voyage_type === 'encounter')
	// 					return encounterSort(c1, c2, skills.split(','));
	// 				return dilemmaSort(c1, c2, skills.split(','));
	// 			});
	// 		});
	// 	}

	// 	return skillCombos;
	// }

	// Match in-game order for dilemma voyage crew selection
	function dilemmaSort(c1: PlayerCrew, c2: PlayerCrew, skills: string[]): number {
		const v1: number = crewVoySkillsScore(c1, skills);
		const v2: number = crewVoySkillsScore(c2, skills);
		if (v1 === v2) return c1.name.localeCompare(c2.name);	// Probably?
		return v2 - v1;
	}

	// Match in-game order for encounter voyage crew selection
	function encounterSort(c1: PlayerCrew, c2: PlayerCrew, skills: string[]): number {
		const p1: number = crewProfSkillsScore(c1, skills);
		const p2: number = crewProfSkillsScore(c2, skills);
		if (p1 === p2) return c1.name.localeCompare(c2.name);	// Probably?
		return p2 - p1;
	}

	function getBestRank(crew: PlayerCrew, seatSkill: string, usedCrew: number[]): ISkillsRank {
		let bestRank: ISkillsRank = {
			skills: [],
			rank: 1000
		};
		const seatRank: number = skillRankings[seatSkill].filter(c =>
			!usedCrew.includes(c.id)
		).findIndex(c => c.id === crew.id) + 1;
		if (seatRank > 0 && seatRank <= 3) {
			bestRank = { skills: [seatSkill], rank: seatRank };
		}
		else {
			const otherSkills: string[] = Object.keys(crew.skills).filter(skill => skill !== seatSkill);
			for (let i = 0; i < otherSkills.length; i++) {
				const sortSkill: string = otherSkills[i];
				const pairRank: number = skillRankings[sortSkill].filter(c =>
					!usedCrew.includes(c.id)
						&& Object.keys(c.skills).includes(seatSkill)
				).findIndex(c => c.id === crew.id) + 1;
				if (pairRank >= 0 && pairRank < bestRank.rank)
					bestRank = { skills: [seatSkill, sortSkill], rank: pairRank };
				if (bestRank.rank <= 3) break;
			}
			if (bestRank.rank > 3 && otherSkills.length > 1) {
				for (let i = 0; i < otherSkills.length; i++) {
					const sortSkill: string = otherSkills[i];
					const filterSkill: string = otherSkills[i == 0 ? 1 : 0];
					const tripletRank: number = skillRankings[sortSkill].filter(c =>
						!usedCrew.includes(c.id)
							&& Object.keys(c.skills).includes(seatSkill)
							&& Object.keys(c.skills).includes(filterSkill)
					).findIndex(c => c.id === crew.id) + 1;
					if (tripletRank >= 0 && tripletRank < bestRank.rank)
						bestRank = { skills: [seatSkill, filterSkill, sortSkill], rank: tripletRank };
					if (bestRank.rank <= 3) break;
				}
			}
		}
		bestRank.skills = bestRank.skills.filter(skill => skill !== seatSkill);
		// bestRank.skills = sortSkills(bestRank.skills, seatSkill);
		return bestRank;
	}

	// function getBestComboRank(crew: PlayerCrew, seatSkill: string, usedCrew: number[]): ISkillsRank {
	// 	let bestRank: ISkillsRank = {
	// 		skills: [],
	// 		rank: 1000
	// 	};
	// 	const crewSkills: string[] = Object.keys(crew.skills);
	// 	for (let i = 1; i <= crewSkills.length; i++) {
	// 		souzaCombinations(crewSkills, i).forEach(skills => {
	// 			if (skills.includes(seatSkill)) {
	// 				const rank: number = skillRankings[skills.join(',')]
	// 					.filter(c => !usedCrew.includes(c.id))
	// 					.findIndex(c => c.id === crew.id) + 1;
	// 				if (rank < bestRank.rank) bestRank = { skills, rank };
	// 			}
	// 		});
	// 		if (bestRank.rank <= 3) break;
	// 	}
	// 	bestRank.skills = sortSkills(bestRank.skills, seatSkill);
	// 	return bestRank;
	// }

	// Filter out seat skill and match in-game left-to-right order of skill filter buttons
	// function sortSkills(skills: string[], seatSkill: string): string[] {
	// 	const filterSkills: string[] = [
	// 		'command_skill', 'diplomacy_skill', 'engineering_skill',
	// 		'security_skill', 'medicine_skill', 'science_skill'
	// 	];
	// 	const sorted: string[] = [];
	// 	filterSkills.forEach(skill => {
	// 		if (skills.includes(skill) && seatSkill !== skill) sorted.push(skill);
	// 	});
	// 	return sorted;
	// }

	// https://blog.lublot.dev/combinations-in-typescript
// 	function souzaCombinations<T>(items: T[], size: number = items.length): T[][] {
// 		const combinations: T[][] = [];
// 		const stack: number[] = [];
// 		let i = 0;

// 		size = Math.min(items.length, size);

// 		while (true) {
// 			if (stack.length === size) {
// 				combinations.push(stack.map((index) => items[index]));
// 				i = stack.pop()! + 1;
// 			}

// 			if (i >= items.length) {
// 				if (stack.length === 0) {
// 					break;
// 				}
// 				i = stack.pop()! + 1;
// 			} else {
// 				stack.push(i++);
// 			}
// 		}

// 		return combinations;
// 	}
};

const PlayerViewPicker = (props: { dbid: string }) => {
	let default_layout = 'table-compact';
	if (window.location.search?.length) {
		let search = new URLSearchParams(window.location.search);
		if (search.has('layout')) {
			let param_layer = search.get('layout');
			if (param_layer && ['table-compact', 'table-standard', 'grid-cards', 'grid-icons'].includes(param_layer)) {
				default_layout = param_layer;
			}
		}
	}

	const [layout, setLayout] = useStateWithStorage(props.dbid+'/voyage/layout', default_layout, { rememberForever: true });

	return (
		<React.Fragment>
			{(layout === 'table-compact' || layout === 'table-standard') && <TableView layout={layout} />}
			{(layout === 'grid-cards' || layout === 'grid-icons') && <GridView layout={layout} />}
			<div style={{ marginTop: '2em' }}>
				Toggle layout:{` `}
				<Button.Group>
					<Button icon='align justify' color={layout === 'table-compact' ? 'blue' : undefined} onClick={() => setLayout('table-compact')} />
					<Button icon='list' color={layout === 'table-standard' ? 'blue' : undefined} onClick={() => setLayout('table-standard')} />
					<Button icon='block layout' color={layout === 'grid-cards' ? 'blue' : undefined} onClick={() => setLayout('grid-cards')} />
					<Button icon='ellipsis horizontal' color={layout === 'grid-icons' ? 'blue' : undefined} onClick={() => setLayout('grid-icons')} />
				</Button.Group>
			</div>
		</React.Fragment>
	);
};

const NonPlayerViewPicker = () => {
	const [layout, setLayout] = React.useState('table-compact');
	return (
		<React.Fragment>
			{(layout === 'table-compact' || layout === 'table-standard') && <TableView layout={layout} />}
			{(layout === 'grid-cards' || layout === 'grid-icons') && <GridView layout={layout} />}
			<div style={{ marginTop: '2em' }}>
				Toggle layout:{` `}
				<Button.Group>
					<Button icon='align justify' color={layout === 'table-compact' ? 'blue' : undefined} onClick={() => setLayout('table-compact')} />
					<Button icon='list' color={layout === 'table-standard' ? 'blue' : undefined} onClick={() => setLayout('table-standard')} />
					<Button icon='block layout' color={layout === 'grid-cards' ? 'blue' : undefined} onClick={() => setLayout('grid-cards')} />
					<Button icon='ellipsis horizontal' color={layout === 'grid-icons' ? 'blue' : undefined} onClick={() => setLayout('grid-icons')} />
				</Button.Group>
			</div>
		</React.Fragment>
	);
};

type ViewProps = {
	layout: string;
};

const TableView = (props: ViewProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES } = globalContext.localized;
	const { voyageConfig, rosterType, ship, shipData, assignments } = React.useContext(ViewContext);
	const { layout } = props;

	const compact = layout === 'table-compact';

	return (
		<Grid columns={2} stackable>
			<Grid.Column>
				{renderShip()}
				<React.Fragment>
					{[0, 2, 4, 6, 8, 10].map(index => renderSkillAssignments(index))}
				</React.Fragment>
			</Grid.Column>
			<Grid.Column verticalAlign='middle'>
				<Aggregates layout={layout} />
			</Grid.Column>
		</Grid>
	);

	function renderShip(): JSX.Element {
		if (!ship) return (<></>);
		return (
			<Table celled selectable striped unstackable compact='very' className={`voyageLineup ${compact ? 'compactView' : ''}`}>
				<Table.Body>
					<Table.Row>
						<Table.Cell width={5}>Ship</Table.Cell>
						<Table.Cell width={8} style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
							<b>{ship.name}</b>
						</Table.Cell>
						<Table.Cell width={2} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
							{SHOW_SHIP_FINDER && voyageConfig.state === 'pending' && rosterType === 'myCrew' &&
								<span style={{ cursor: 'help' }}>
									<Popup content={`On voyage selection screen, tap ${shipData.direction} ${shipData.index} times to select ship`} mouseEnterDelay={POPUP_DELAY} trigger={
										<span style={{ whiteSpace: 'nowrap' }}>
											<Icon name={`arrow ${shipData.direction}` as SemanticICONS} />{shipData.index}
										</span>
									} />
								</span>
							}
						</Table.Cell>
						<Table.Cell width={1} className='iconic'>
							{ship.traits?.includes(voyageConfig.ship_trait) &&
								<span style={{ cursor: 'help' }}>
									<Popup content='+150 AM' mouseEnterDelay={POPUP_DELAY} trigger={<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />} />
								</span>
							}
						</Table.Cell>
					</Table.Row>
				</Table.Body>
			</Table>
		);
	}

	function renderSkillAssignments(index: number): JSX.Element {
		const seated = assignments.slice(index, index+2);
		return (
			<Table celled selectable striped unstackable compact='very' key={index} className={`voyageLineup ${compact ? 'compactView' : ''}`}>
				<Table.Body>
					{seated.map((assignment, idx) => {
						const { crew, name, trait, bestRank } = assignment;
						return (
							<Table.Row key={idx}>
								<Table.Cell width={5}>{name}</Table.Cell>
								<Table.Cell width={7}>
									<Popup mouseEnterDelay={POPUP_DELAY} trigger={
										<div style={{ cursor: 'help', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
											{!compact &&
												<span style={{ paddingRight: '.3em' }}>
													<ItemDisplay
														src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
														size={32}
														maxRarity={crew.max_rarity}
														rarity={crew.rarity}
														style={{ verticalAlign: 'middle' }}
													/>
												</span>
											}
											<span style={{ marginLeft: '0.25em', fontSize: `${compact ? '1em' : '1.1em'}`, fontWeight: 'bolder' }}>{crew.name}</span>
										</div>
									}>
										<Popup.Content>
											<AssignmentCard assignment={assignment} showSkills={true} />
										</Popup.Content>
									</Popup>
								</Table.Cell>
								<Table.Cell width={2} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
									<CrewFinder crew={crew} bestRank={bestRank} />
								</Table.Cell>
								<Table.Cell width={1} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
									<div style={{display:'flex', flexDirection:'row', gap: "0.5em", alignItems: "center", justifyContent: "right", marginRight: "0.5em"}}>
										{isQuipped(crew) &&
										<>
										<Popup wide content={renderKwipmentBonus((crew.kwipment as number[][]).map(q => typeof q === 'number' ? q : q[1]), globalContext.core.items)} mouseEnterDelay={POPUP_DELAY} trigger={
												<span style={{ cursor: 'help' }}>
													<img src={`${process.env.GATSBY_ASSETS_URL}atlas/ContinuumUnlock.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
												</span>
											} />
										</>}
										{renderVPBonus(crew)}
										{renderTraitBonus(crew, trait)}
									</div>
								</Table.Cell>
							</Table.Row>
						);
					})}
				</Table.Body>
			</Table>
		);
	}

	function renderTraitBonus(crew: PlayerCrew, trait: string): JSX.Element {
		const traitBonus: number = getCrewTraitBonus(voyageConfig, crew, trait);
		if (traitBonus === 0) return <></>;
		let bonusText: string = '';
		if (traitBonus === 25)
			bonusText = `${TRAIT_NAMES[trait]} +25 AM`;
		else
			bonusText = `+${traitBonus} AM`;
		return (
			<Popup content={bonusText} mouseEnterDelay={POPUP_DELAY} trigger={
				<span style={{ cursor: 'help' }}>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
				</span>
			} />
		);
	}

	function renderVPBonus(crew: PlayerCrew): JSX.Element {
		if (voyageConfig.voyage_type !== 'encounter') return <></>;
		const crewVP: number = getCrewVP(voyageConfig, crew);
		let bonusText = `+${crewVP} VP`;
		return (
			<Popup content={bonusText} mouseEnterDelay={POPUP_DELAY} trigger={
				<span style={{ cursor: 'help' }}>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/victory_point_icon.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
				</span>
			} />
		);
	}
};

const GridView = (props: ViewProps) => {
	const { voyageConfig, rosterType, ship, shipData, assignments } = React.useContext(ViewContext);
	const { layout } = props;

	return (
		<React.Fragment>
			{renderShip()}
			{layout === 'grid-cards' &&
				<div>
					<Grid columns={6} doubling centered>
						{renderCards()}
					</Grid>
				</div>
			}
			{layout === 'grid-icons' &&
				<Grid doubling centered>
					{renderIcons()}
				</Grid>
			}

			<div style={{ marginTop: '2em' }}>
				<Aggregates layout={layout} />
			</div>
		</React.Fragment>
	);

	function renderShip(): JSX.Element {
		if (!ship) return (<></>);
		return (
			<Table celled selectable striped unstackable collapsing compact='very' style={{ margin: '0 auto 2em' }}>
				<Table.Body>
					<Table.Row>
						<Table.Cell width={5}>Ship</Table.Cell>
						<Table.Cell width={8} style={{ fontSize: '1.1em' }}>
							<b>{ship.name}</b>
						</Table.Cell>
						<Table.Cell width={2} className='iconic' style={{ fontSize: '1.1em' }}>
							{SHOW_SHIP_FINDER && voyageConfig.state === 'pending' && rosterType === 'myCrew' &&
								<span style={{ cursor: 'help' }}>
									<Popup content={`On voyage selection screen, tap ${shipData.direction} ${shipData.index} times to select ship`} mouseEnterDelay={POPUP_DELAY} trigger={
										<span style={{ whiteSpace: 'nowrap' }}>
											<Icon name={`arrow ${shipData.direction}` as SemanticICONS} />{shipData.index}
										</span>
									} />
								</span>
							}
						</Table.Cell>
						<Table.Cell width={1} className='iconic'>
							{shipData.shipBonus > 0 &&
								<span style={{ cursor: 'help' }}>
									<Popup content={`+${shipData.shipBonus} AM`} mouseEnterDelay={POPUP_DELAY} trigger={<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />} />
								</span>
							}
						</Table.Cell>
					</Table.Row>
				</Table.Body>
			</Table>
		);
	}

	function renderCards(): JSX.Element {
		return (
			<React.Fragment>
				{assignments.map((assignment, idx) => {
					return (
						<Grid.Column key={idx}>
							<AssignmentCard assignment={assignment} showSkills={false} />
						</Grid.Column>
					);
				})}
			</React.Fragment>
		);
	}

	function renderIcons(): JSX.Element {
		return (
			<React.Fragment>
				{assignments.map((assignment, idx) => {
					const { crew, name, trait, bestRank } = assignment;
					return (
						<Grid.Column key={idx}>
							<Popup mouseEnterDelay={POPUP_DELAY} trigger={
								<div style={{ cursor: 'help' }}>
									<ItemDisplay
										src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
										size={48}
										maxRarity={crew.max_rarity}
										rarity={crew.rarity}
									/>
								</div>
							}>
								<Popup.Content>
									<AssignmentCard assignment={assignment} showSkills={true} />
								</Popup.Content>
							</Popup>
							<div style={{ marginTop: '.3em', textAlign: 'center', fontSize: '1.1em' }}>
								<CrewFinder crew={crew} bestRank={bestRank} />
							</div>
						</Grid.Column>
					);
				})}
			</React.Fragment>
		);
	}
};

const Aggregates = (props: ViewProps) => {
	const { voyageConfig, ship, shipData, assignments } = React.useContext(ViewContext);
	const { layout } = props;

	const landscape = layout === 'grid-cards' || layout === 'grid-icons';

	return (
		<React.Fragment>
			{!landscape &&
				<React.Fragment>
					<div style={{ marginBottom: '1em' }}>
						{renderCrewBonusesTable()}
					</div>
					{renderAggregateTable(['command_skill', 'diplomacy_skill', 'engineering_skill', 'security_skill', 'medicine_skill', 'science_skill'])}
				</React.Fragment>
			}
			{landscape &&
				<div style={{ textAlign: 'center' }}>
					<div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2em' }}>
						<div>
							{renderCrewBonusesTable()}
						</div>
						{renderAggregateTable(['command_skill', 'diplomacy_skill', 'engineering_skill'])}
						{renderAggregateTable(['security_skill', 'medicine_skill', 'science_skill'])}
					</div>
				</div>
			}
		</React.Fragment>
	);

	function renderCrewBonusesTable(): JSX.Element {
		return (
			<Table collapsing celled selectable striped unstackable compact='very' style={{ margin: '0 auto' }}>
				<Table.Body>
					{renderVPRow()}
					{renderAntimatterRow()}
				</Table.Body>
			</Table>
		);
	}

	function renderVPRow(): JSX.Element {
		if (voyageConfig.voyage_type !== 'encounter') return <></>;
		const totalVP: number = assignments.reduce((prev, curr) => prev + getCrewVP(voyageConfig, curr.crew), 50);
		return (
			<Table.Row>
				<Table.Cell>Base Event VP</Table.Cell>
				<Table.Cell className='iconic' style={{width: '2.2em'}}>&nbsp;</Table.Cell>
				<Table.Cell style={{ textAlign: 'right', fontSize: '1.1em' }}>
					<b>{totalVP}</b>
				</Table.Cell>
				<Table.Cell className='iconic' textAlign='center'>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/victory_point_icon.png`} style={{ height: '1em' }} className='invertibleIcon' />
				</Table.Cell>
			</Table.Row>
		);
	}

	function renderAntimatterRow(): JSX.Element {
		return (
			<Table.Row>
				<Table.Cell>Antimatter</Table.Cell>
				<Table.Cell className='iconic' style={{width: '2.2em'}}>&nbsp;</Table.Cell>
				<Table.Cell style={{ textAlign: 'right', fontSize: '1.1em' }}>
					{ship && (
						<Popup mouseEnterDelay={POPUP_DELAY} trigger={<span style={{ cursor: 'help', fontWeight: 'bolder' }}>{voyageConfig.max_hp}</span>}>
							<Popup.Content>
								{ship.antimatter} (Level {ship.level} Ship)
								<br />+{shipData.shipBonus} (Ship Trait Bonus)
								<br />+{shipData.crewBonus} (Crew Trait Bonuses)
							</Popup.Content>
						</Popup>
					)}
					{!ship && <span>{voyageConfig.max_hp}</span>}
				</Table.Cell>
				<Table.Cell className='iconic' textAlign='center'>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em' }} className='invertibleIcon' />
				</Table.Cell>
			</Table.Row>
		);
	}

	function renderAggregateTable(skills: string[]): JSX.Element {
		return (
			<Table collapsing celled selectable striped unstackable compact='very' style={{ margin: '0 auto' }}>
				<Table.Body>
					{skills.map((entry, idx) => {
						const agg = voyageConfig.skill_aggregates[entry];
						if (typeof(agg) === 'number') {
							return (
								<Table.Row key={idx}>
									<Table.Cell>{CONFIG.SKILLS[entry]}</Table.Cell>
									<Table.Cell></Table.Cell>
									<Table.Cell style={{ textAlign: 'right', fontSize: '1.1em' }}>
										<b>{Math.round(agg)}</b>
									</Table.Cell>
									<Table.Cell className='iconic' textAlign='center'>
										<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${entry}.png`} style={{ height: '1em', verticalAlign: 'middle' }} />
									</Table.Cell>
								</Table.Row>
							);
						} else {
							const score = Math.floor(voySkillScore(agg));
							return (
								<Table.Row key={idx}>
									<Table.Cell>{CONFIG.SKILLS[entry]}</Table.Cell>
									<Table.Cell className='iconic'>
										{voyageConfig.skills.primary_skill === entry && <Icon name='star' color='yellow' />}
										{voyageConfig.skills.secondary_skill === entry && <Icon name='star' color='grey' />}
									</Table.Cell>
									<Table.Cell style={{ textAlign: 'right', fontSize: '1.1em' }}>
										<Popup mouseEnterDelay={POPUP_DELAY} trigger={<span style={{ cursor: 'help', fontWeight: 'bolder' }}>{score}</span>}>
											<Popup.Content>
												{agg.core + ' +(' + agg.range_min + '-' + agg.range_max + ')'}
											</Popup.Content>
										</Popup>
									</Table.Cell>
									<Table.Cell className='iconic' textAlign='center'>
										<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${entry}.png`} style={{ height: '1em', verticalAlign: 'middle' }} />
									</Table.Cell>
								</Table.Row>
							);
						}
					})}
				</Table.Body>
			</Table>
		);
	}
};

type AssignmentCardProps = {
	assignment: IAssignment;
	showSkills: boolean;
};

const AssignmentCard = (props: AssignmentCardProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES } = globalContext.localized;
	const { voyageConfig } = React.useContext(ViewContext);
	const { assignment: { crew, name, trait, bestRank }, showSkills } = props;

	return (
		<Card style={{ padding: '.5em', textAlign: 'center', height: '100%' }}>
			{(bestRank || crew.immortal > 0 || crew.active_status > 0) &&
				<Label corner='right' style={{ fontSize: '1.1em', textAlign: 'right', padding: '.4em .4em 0 0' }}>
					<CrewFinder crew={crew} bestRank={bestRank} />
				</Label>
			}
			<div style={{ margin: '0 auto' }}>
				<ItemDisplay
					crewBackground='rich'
					allCrew={globalContext.core.crew}
					playerData={globalContext.player.playerData}
					targetGroup='voyageLineupHover'
					itemSymbol={crew.symbol}
					src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
					size={96}
					maxRarity={crew.max_rarity}
					rarity={crew.rarity}
				/>
			</div>
			<div style={{ marginBottom: '2em' }}>
				<div style={{ fontSize: '1.1em', fontWeight: 'bolder' }}>
					<Popup mouseEnterDelay={POPUP_DELAY} trigger={<span style={{ cursor: 'help' }}>{crew.name}</span>}>
						<Popup.Content>
							<CrewVoyageSkills
								crew={crew}
								showProficiency={voyageConfig.voyage_type === 'encounter'}
							/>
						</Popup.Content>
					</Popup>
				</div>
				<div style={{display: 'flex', flexDirection: 'row', alignItems: "center", justifyContent: 'center', gap: '1em'}}>
					{isQuipped(crew) && (
						<div style={{paddingBottom: "0.1em"}}>
							<Popup wide
								content={renderKwipmentBonus((crew.kwipment as number[][]).map(q => typeof q === 'number' ? q : q[1]), globalContext.core.items)}
								mouseEnterDelay={POPUP_DELAY}
								trigger={
									<span style={{ cursor: 'help' }}>
										<img src={`${process.env.GATSBY_ASSETS_URL}atlas/ContinuumUnlock.png`} style={{ marginLeft: "0.25em", marginRight: "0.25em", height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
									</span>
								}
							/>
						</div>
					)}
					{renderCrewVP()}
					{renderTraitBonus()}
				</div>
				{showSkills && (
					<CrewVoyageSkills
						crew={crew}
						showProficiency={voyageConfig.voyage_type === 'encounter'}
					/>
				)}
			</div>
			<Label attached='bottom' style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
				{name}
			</Label>
		</Card>
	);

	function renderCrewVP(): JSX.Element {
		const crewVP: number = getCrewVP(voyageConfig, crew);
		if (crewVP === 0) return <></>;
		return (
			<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '.3em' }}>
				<span>+{crewVP}</span>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/victory_point_icon.png`} style={{ height: '1em' }} className='invertibleIcon' />
			</div>
		);
	}

	function renderTraitBonus(): JSX.Element {
		const traitBonus: number = getCrewTraitBonus(voyageConfig, crew, trait);
		if (traitBonus === 0) return <></>;
		if (traitBonus === 25) {
			return (
				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '.5em' }}>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em' }} className='invertibleIcon' />
					<span>{TRAIT_NAMES[trait]}</span>
				</div>
			);
		}
		return (
			<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '.3em' }}>
				<span>+{traitBonus}</span>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em' }} className='invertibleIcon' />
			</div>
		);
	}
};

type CrewVoyageSkillsProps = {
	crew: PlayerCrew;
	showProficiency: boolean;
};

const CrewVoyageSkills = (props: CrewVoyageSkillsProps) => {
	const { crew, showProficiency } = props;
	if (!('skills' in crew)) return <></>;
	return (
		<React.Fragment>
			{Object.keys(crew.skills).map(skill =>
				<Label key={skill}>
					{CONFIG.SKILLS_SHORT.find(c => c.name === skill)?.short}{` `}
					<b>{Math.floor(voySkillScore(crew.skills[skill]))}</b>
					{showProficiency && (
						<React.Fragment>
							{` `}({crew.skills[skill].range_min}-{crew.skills[skill].range_max})
						</React.Fragment>
					)}
				</Label>
			)}
		</React.Fragment>
	);
};

type CrewFinderProps = {
	crew: PlayerCrew;
	bestRank: ISkillsRank | undefined;
};

const CrewFinder = (props: CrewFinderProps) => {
	const { crew, bestRank } = props;

	let popup = { content: '', trigger: <></> };

	if (crew.immortal > 0) {
		popup = {
			content: 'Unfreeze crew',
			trigger: <div style={{textAlign: 'center' }}><Icon name='snowflake' /></div>
		};
	}
	else if (crew.active_status === 2) {
		popup = {
			content: 'On shuttle',
			trigger: <div style={{textAlign: 'center' }}><Icon name='space shuttle' /></div>
		};
	}
	else if (crew.active_status === 3) {
		popup = {
			content: 'On voyage',
			trigger: <div style={{textAlign: 'center' }}><Icon name='rocket' /></div>
		};
	}
	else if (bestRank) {
		let content: string = '';
		if (bestRank.skills.length === 0)
			content = `Select the ${bestRank.rank === 1 ? 'top crew' : addPostfix(bestRank.rank) + ' crew from the top'} for this seat`;
		else {
			content = `Filter by these skills, then select the ${bestRank.rank === 1 ? 'top crew' : addPostfix(bestRank.rank) + ' crew from the top'}`;
		}
		popup = {
			content,
			trigger:
				<span style={{ whiteSpace: 'nowrap' }}>
					{bestRank.skills.map(skill => (
						<img key={skill} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1em', verticalAlign: 'middle' }} />
					))}
					{` `}<span style={{ verticalAlign: 'middle' }}>{bestRank.rank}</span>
				</span>
		};
	}

	return (
		<Popup content={popup.content} mouseEnterDelay={POPUP_DELAY} trigger={
			<span style={{ cursor: 'help' }}>
				{popup.trigger}
			</span>
		} />
	);

	function addPostfix(pos: number): string {
		const POSITION_POSTFIX: string[] = [
			'th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'
		];
		if (pos > 3 && pos < 21) return `${pos}th`;
		return `${pos}${POSITION_POSTFIX[pos%10]}`;
	}
};
