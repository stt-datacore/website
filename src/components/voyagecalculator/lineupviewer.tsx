import React from 'react';
import { Grid, Button, Table, Popup, Icon, Card, Label, SemanticICONS } from 'semantic-ui-react';

import { CrewMember, Skill } from '../../model/crew';
import { PlayerCrew, Voyage, VoyageCrewSlot } from '../../model/player';
import { Ship } from '../../model/ship';
import { IVoyageCalcConfig } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import { CrewHoverStat } from '../hovering/crewhoverstat';
import ItemDisplay from '../itemdisplay';
import CONFIG from '../CONFIG';
import { useStateWithStorage } from '../../utils/storage';
import { renderBonuses, renderKwipmentBonus } from '../item_presenters/item_presenter';
import { isQuipped } from '../../utils/crewutils';

interface IAssignment {
	crew: PlayerCrew;
	name: string;
	trait: string;
	bestRank: IBestRank | undefined;
};

interface IBestRank {
	skill: string;
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

const voyScore = (v: Skill) => v.core + (v.range_min + v.range_max)/2;

type LineupViewerProps = {
	voyageConfig: IVoyageCalcConfig | Voyage;
	ship?: Ship;
	roster?: PlayerCrew[];
	rosterType?: 'allCrew' | 'myCrew';
};

export const LineupViewer = (props: LineupViewerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { voyageConfig, ship, roster, rosterType } = props;

	const getBestRank = (crew: PlayerCrew | CrewMember, seatSkill: string) => {
		const best = {
			skill: 'None',
			rank: 1000
		} as IBestRank;
		if ('skills' in crew) {
			Object.keys(crew.skills).forEach(crewSkill => {
				const skr = skillRankings.find(sr => sr.skill === crewSkill);
				if (skr) {
					const rank = skr.roster.filter(c => Object.keys(c.skills)
						.includes(seatSkill) && !usedCrew.includes(c.id))
						.map(c => c.id).indexOf(crew.id) + 1;

					// Prefer seat skill if no scrolling is necessary
					const stayWithSeat = best.skill === seatSkill && best.rank <= 3;
					const switchToSeat = crewSkill === seatSkill && (rank <= 3 || rank === best.rank);
					if ((rank < best.rank && !stayWithSeat) || switchToSeat) {
						best.skill = crewSkill;
						best.rank = rank;
					}
				}
			});
		}
		return best;
	};

	const skillRankings = Object.keys(CONFIG.SKILLS).map(skill => ({
		skill,
		roster: (roster ?? [] as PlayerCrew[]).filter(c => Object.keys(c.skills).includes(skill))
			.filter(c => c.skills[skill].core > 0)
			.sort((c1, c2) => {
				// Sort by skill voyage score descending
				//	Voyage scores are floored before sorting
				const vs1 = Math.floor(voyScore(c1.skills[skill]));
				const vs2 = Math.floor(voyScore(c2.skills[skill]));
				// Break ties by sum of all core skills descending
				if (vs1 === vs2) {
					const coreScore = c => Object.keys(c.skills).reduce((prev, curr) => prev + c.skills[curr].core, 0);
					const cs1 = coreScore(c1);
					const cs2 = coreScore(c2);
					// Break ties by max rarity descending (unconfirmed but likely)
					if (cs1 === cs2) {
						// Break ties by rarity descending
						if (c1.max_rarity === c2.max_rarity) {
							// Break ties by symbol descending
							if (c1.rarity === c2.rarity) return c2.symbol.localeCompare(c1.symbol);
							return c2.rarity - c1.rarity;
						}
						return c2.max_rarity - c1.max_rarity;
					}
					return cs2 - cs1;
				}
				return vs2 - vs1;
			})
	}));

	const usedCrew = [] as number[];
	const assignments = Object.values(CONFIG.VOYAGE_CREW_SLOTS).map(entry => {
		const { crew, name, trait, skill } = (Object.values(voyageConfig.crew_slots).find(slot => slot.symbol === entry) as VoyageCrewSlot);
		const bestRank = rosterType === 'myCrew' && voyageConfig.state === 'pending' ? getBestRank(crew, skill) : undefined;
		if (!crew.imageUrlPortrait)
			crew.imageUrlPortrait = `${crew.portrait.file.slice(1).replace('/', '_')}.png`;
		usedCrew.push(crew.id);
		return {
			crew, name, trait, bestRank
		} as IAssignment;
	}) as IAssignment[];

	const shipData = {
		direction: 'right',
		index: -1,
		shipBonus: 0,
		crewBonus: 0
	} as IShipData;

	if (ship) {
		if (!ship.index) ship.index = { left: 0, right: 0 };
		shipData.direction = ship.index.right < ship.index.left ? 'right' : 'left';
		shipData.index = ship.index[shipData.direction] ?? 0;
		shipData.shipBonus = ship.traits?.includes(voyageConfig.ship_trait) ? 150 : 0;
		shipData.crewBonus = voyageConfig.max_hp - ship.antimatter - shipData.shipBonus;
	}

	const viewContext = {
		voyageConfig,
		rosterType,
		ship,
		shipData,
		assignments
	} as IViewContext;

	return (
		<ViewContext.Provider value={viewContext}>
			<React.Fragment>
				{playerData && <PlayerViewPicker dbid={`${playerData.player.dbid}`} />}
				{!playerData && <NonPlayerViewPicker />}
			</React.Fragment>
		</ViewContext.Provider>
	);
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
								<Table.Cell width={8}>
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
											<AssignmentCard assignment={assignment} showFinder={!!bestRank} showSkills={true} />
										</Popup.Content>
									</Popup>
								</Table.Cell>
								<Table.Cell width={2} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
									{bestRank && <CrewFinder crew={crew} bestRank={bestRank} />}
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
										{crew.traits.includes(trait.toLowerCase()) &&
											<Popup content={`${TRAIT_NAMES[trait]} +25 AM`} mouseEnterDelay={POPUP_DELAY} trigger={
												<span style={{ cursor: 'help' }}>
													<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
												</span>
											} />
										}
									</div>
								</Table.Cell>
							</Table.Row>
						);
					})}
				</Table.Body>
			</Table>
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
				<Grid doubling centered textAlign='center'>
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

	function renderCards(): JSX.Element {
		return (
			<React.Fragment>
				{assignments.map((assignment, idx) => {
					return (
						<Grid.Column key={idx}>
							<AssignmentCard assignment={assignment} showFinder={!!assignment.bestRank} showSkills={false} />
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
									<AssignmentCard assignment={assignment} showFinder={!!bestRank} showSkills={true} />
								</Popup.Content>
							</Popup>
							{bestRank &&
								<div style={{ marginTop: '.3em', textAlign: 'center', fontSize: '1.1em' }}>
									<CrewFinder crew={crew} bestRank={bestRank} />
								</div>
							}
						</Grid.Column>
					);
				})}
			</React.Fragment>
		);
	}
};

const Aggregates = (props: ViewProps) => {
	const { voyageConfig, ship, shipData } = React.useContext(ViewContext);
	const { layout } = props;

	const landscape = layout === 'grid-cards' || layout === 'grid-icons';

	return (
		<React.Fragment>
			{!landscape &&
				<React.Fragment>
					<div style={{ marginBottom: '1em' }}>
						{renderAntimatter()}
					</div>
					{renderAggregateTable(['command_skill', 'diplomacy_skill', 'engineering_skill', 'security_skill', 'medicine_skill', 'science_skill'])}
				</React.Fragment>
			}
			{landscape &&
				<div style={{ textAlign: 'center' }}>
					<div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2em' }}>
						<div>{renderAntimatter()}</div>
						{renderAggregateTable(['command_skill', 'diplomacy_skill', 'engineering_skill'])}
						{renderAggregateTable(['security_skill', 'medicine_skill', 'science_skill'])}
					</div>
				</div>
			}
		</React.Fragment>
	);

	function renderAntimatter(): JSX.Element {
		return (
			<Table collapsing celled selectable striped unstackable compact='very' style={{ margin: '0 auto' }}>
				<Table.Body>
					<Table.Row>
						<Table.Cell>Antimatter</Table.Cell>
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
						<Table.Cell className='iconic'>
							<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
						</Table.Cell>
					</Table.Row>
				</Table.Body>
			</Table>
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
							const score = Math.floor(voyScore(agg));
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
	showFinder: boolean;
	showSkills: boolean;
};

const AssignmentCard = (props: AssignmentCardProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES } = globalContext.localized;
	const { assignment: { crew, name, trait, bestRank }, showFinder, showSkills } = props;

	return (
		<Card style={{ padding: '.5em', textAlign: 'center', height: '100%' }}>
			{showFinder &&
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
							{renderSkills()}
						</Popup.Content>
					</Popup>
				</div>
				<div style={{display: 'flex', flexDirection: 'row', alignItems: "center", justifyContent: 'center'}}>
					{isQuipped(crew) && (
						<div>
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
					{crew.traits.includes(trait.toLowerCase()) &&
						<React.Fragment>
							<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
							<span style={{ marginLeft: '.5em', verticalAlign: 'middle' }}>{TRAIT_NAMES[trait]}</span>
						</React.Fragment>
					}
				</div>
				{showSkills &&
					<div>{renderSkills()}</div>
				}
			</div>
			<Label attached='bottom' style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
				{name}
			</Label>
		</Card>
	);

	function renderSkills(): JSX.Element {
		if (!('skills' in crew)) return (<></>);
		return (
			<React.Fragment>
				{Object.keys(crew.skills).map(skill =>
					<Label key={skill}>
						{CONFIG.SKILLS_SHORT.find(c => c.name === skill)?.short}{` `}
						{Math.floor(voyScore(crew.skills[skill]))}
					</Label>
				)}
			</React.Fragment>
		);
	}
};

type CrewFinderProps = {
	crew: PlayerCrew;
	bestRank: IBestRank | undefined;
};

const CrewFinder = (props: CrewFinderProps) => {
	const { crew, bestRank } = props;

	if (!bestRank) return (<></>);

	const POSITION_POSTFIX = [
		'th',
		'st',
		'nd',
		'rd',
		'th',
		'th',
		'th',
		'th',
		'th',
		'th'
	];

	const addPostfix = pos => pos > 3 && pos < 21 ? pos + 'th' : pos + POSITION_POSTFIX[pos%10];
	let popup = {
		content: `Select ${bestRank.rank === 1 ? 'top crew' : addPostfix(bestRank.rank) + ' crew from top'} in ${CONFIG.SKILLS[bestRank.skill]}`,
		trigger:
			<span style={{ whiteSpace: 'nowrap' }}>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${bestRank.skill}.png`} style={{ height: '1em', verticalAlign: 'middle' }} />
				{` `}<span style={{ verticalAlign: 'middle' }}>{bestRank.rank}</span>
			</span>
	};
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
	return (
		<Popup content={popup.content} mouseEnterDelay={POPUP_DELAY} trigger={
			<span style={{ cursor: 'help' }}>
				{popup.trigger}
			</span>
		} />
	);
};
