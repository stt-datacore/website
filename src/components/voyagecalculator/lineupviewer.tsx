import React from 'react';
import { Grid, Button, Table, Popup, Icon, Card, Label, SemanticICONS } from 'semantic-ui-react';

import CONFIG from '../CONFIG';
import allTraits from '../../../static/structured/translation_en.json';

import ItemDisplay from '../itemdisplay';

import { useStateWithStorage } from '../../utils/storage';
import { Ship } from '../../model/ship';
import { PlayerCrew, Voyage, VoyageCrewSlot } from '../../model/player';
import { CrewMember, Skill } from '../../model/crew';
import { HoverStat } from '../hovering/hoverstat';
import { CrewHoverStat } from '../hovering/crewhoverstat';
import { MergedContext } from '../../context/mergedcontext';

const POPUP_DELAY = 500;
const voyScore = (v: Skill) => v.core + (v.range_min + v.range_max)/2;

type LineupViewerProps = {
	voyageData: Voyage;
	ship: Ship;
	roster: PlayerCrew[];
	dbid: string;
};

const LineupViewer = (props: LineupViewerProps) => {
	const { voyageData, ship, roster, dbid } = props;

	const getBestRank = (crew: PlayerCrew, seatSkill: string) => {
		const best = {
			skill: 'None',
			rank: 1000
		};
		Object.keys(crew.skills).forEach(crewSkill => {
			let skr = skillRankings.find(sr => sr.skill === crewSkill);

			// null check not necessary from code perspective but VS Code
			// is still linting:

			// const rank = skr?.roster.filter(c => Object.keys(c.skills)
			// 	.includes(seatSkill) && !usedCrew.includes(c.id))
			// 	.map(c => c.id).indexOf(crew.id) + 1;

			// proposed fix:
			const rank = (skr?.roster?.filter(c => Object.keys(c.skills)
				.includes(seatSkill) && !usedCrew.includes(c.id))
				?.map(c => c.id)?.indexOf(crew.id) ?? -1) + 1;

			// Prefer seat skill if no scrolling is necessary
			const stayWithSeat = best.skill === seatSkill && best.rank <= 3;
			const switchToSeat = crewSkill === seatSkill && (rank <= 3 || rank === best.rank);
			if ((rank < best.rank && !stayWithSeat) || switchToSeat) {
				best.skill = crewSkill;
				best.rank = rank;
			}
		});
		return best;
	};

	const skillRankings = Object.keys(CONFIG.SKILLS).map(skill => ({
		skill,
		roster: roster.filter(c => Object.keys(c.skills).includes(skill))
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
		const { crew, name, trait, skill } = (Object.values(voyageData.crew_slots).find(slot => slot.symbol === entry) as VoyageCrewSlot);
		const bestRank = getBestRank(crew, skill);
		if (!crew.imageUrlPortrait)
			crew.imageUrlPortrait =
				`${crew.portrait.file.substring(1).replace(/\//g, '_')}.png`;
		usedCrew.push(crew.id);
		return {
			crew, name, trait, skill, bestRank
		};
	});

	const shipData = {
		direction: '',
		index: -1,
		shipBonus: 0,
		crewBonus: 0
	};

	if (ship) {
		if (!ship.index) ship.index = { left: 0, right: 0 };
		shipData.direction = ship.index.right < ship.index.left ? 'right' : 'left';
		shipData.index = ship.index[shipData.direction] ?? 0;
		shipData.shipBonus = ship.traits?.includes(voyageData.ship_trait) ? 150 : 0;
		shipData.crewBonus = voyageData.max_hp - ship.antimatter - shipData.shipBonus;
	}

	return <ViewPicker voyageData={voyageData} ship={ship} shipData={shipData} assignments={assignments} dbid={dbid} />;
};

type ViewPickerProps = {
	voyageData: Voyage;
	ship: Ship;
	shipData: {direction: string, index: number, shipBonus: number, crewBonus: number };
	assignments: any[];
	dbid: string;
};

const ViewPicker = (props: ViewPickerProps) => {
	const { voyageData, ship, shipData, assignments, dbid } = props;

	const [layout, setLayout] = useStateWithStorage(dbid+'/voyage/layout', 'table-compact', { rememberForever: true });

	return (
		<React.Fragment>
			{(layout === 'table-compact' || layout === 'table-standard') &&
				<TableView layout={layout} voyageData={voyageData} ship={ship} shipData={shipData} assignments={assignments} />
			}
			{(layout === 'grid-cards' || layout === 'grid-icons') &&
				<GridView layout={layout} voyageData={voyageData} ship={ship} shipData={shipData} assignments={assignments} />
			}
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
	voyageData: any;
	ship: Ship;
	shipData: any;
	assignments: any[];
};

const TableView = (props: ViewProps) => {
	const { layout, voyageData, ship, shipData, assignments } = props;

	const compact = layout === 'table-compact';

	return (
		<Grid columns={2} stackable>
			<Grid.Column>
				{ship && renderShip()}
				<React.Fragment>
					{[0, 2, 4, 6, 8, 10].map(index => renderSkillAssignments(index))}
				</React.Fragment>
			</Grid.Column>
			<Grid.Column verticalAlign='middle'>
				<Aggregates layout={layout} voyageData={voyageData} ship={ship} shipData={shipData} assignments={assignments} />
			</Grid.Column>
		</Grid>
	);

	function renderShip(): JSX.Element {
		return (
			<Table celled selectable striped unstackable compact='very' className={`voyageLineup ${compact ? 'compactView' : ''}`}>
				<Table.Body>
					<Table.Row>
						<Table.Cell width={5}>Ship</Table.Cell>
						<Table.Cell width={8} style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
							<b>{ship.name}</b>
						</Table.Cell>
						<Table.Cell width={2} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
							{voyageData.state === 'pending' &&
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
							{ship.traits?.includes(voyageData.ship_trait) &&
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
						const imageUrlPortrait = crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replaceAll('/', '_')}.png`;
						return (
							<Table.Row key={idx}>
								<Table.Cell width={5}>{name}</Table.Cell>
								<Table.Cell width={8}>
									<Popup mouseEnterDelay={POPUP_DELAY} trigger={
										<div style={{ cursor: 'help', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
											{!compact &&
												<span style={{ paddingRight: '.3em' }}>
													<ItemDisplay
														src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`}
														size={32}
														maxRarity={crew.max_rarity}
														rarity={crew.rarity}
														style={{ verticalAlign: 'middle' }}
													/>
												</span>
											}
											<span style={{ marginLeft: "0.25em", fontSize: `${compact ? '1em' : '1.1em'}`, fontWeight: 'bolder' }}>{crew.name}</span>
										</div>
									}>
										<Popup.Content>
											<AssignmentCard assignment={assignment} showFinder={voyageData.state === 'pending'} showSkills={true} />
										</Popup.Content>
									</Popup>
								</Table.Cell>
								<Table.Cell width={2} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
									{voyageData.state === 'pending' && <CrewFinder crew={crew} bestRank={bestRank} />}
								</Table.Cell>
								<Table.Cell width={1} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
									{crew.traits.includes(trait.toLowerCase()) &&
										<Popup content={`${allTraits.trait_names[trait]} +25 AM`} mouseEnterDelay={POPUP_DELAY} trigger={
											<span style={{ cursor: 'help' }}>
												<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
											</span>
										} />
									}
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
	const { layout, voyageData, ship, shipData, assignments } = props;

	return (
		<React.Fragment>			
			

			{ship && renderShip()}
			{layout === 'grid-cards' &&
				<div>
					<CrewHoverStat useBoundingClient={true} targetGroup='voyageLineup' />
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
				<Aggregates layout={layout} voyageData={voyageData} ship={ship} shipData={shipData} assignments={assignments} />
			</div>
		</React.Fragment>
	);

	function renderShip(): JSX.Element {
		return (
			<Table celled selectable striped unstackable collapsing compact='very' style={{ margin: '0 auto 2em' }}>
				<Table.Body>
					<Table.Row>
						<Table.Cell width={5}>Ship</Table.Cell>
						<Table.Cell width={8} style={{ fontSize: '1.1em' }}>
							<b>{ship.name}</b>
						</Table.Cell>
						<Table.Cell width={2} className='iconic' style={{ fontSize: '1.1em' }}>
							{voyageData.state === 'pending' &&
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
							{ship.traits?.includes(voyageData.ship_trait) &&
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
							<AssignmentCard assignment={assignment} showFinder={voyageData.state === 'pending'} showSkills={false} />
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
					const imageUrlPortrait = crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replaceAll('/', '_')}.png`;
					return (
						<Grid.Column key={idx}>
							<Popup mouseEnterDelay={POPUP_DELAY} trigger={
								<div style={{ cursor: 'help' }}>
									<ItemDisplay
										src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`}
										size={48}
										maxRarity={crew.max_rarity}
										rarity={crew.rarity}
									/>
								</div>
							}>
								<Popup.Content>
									<AssignmentCard assignment={assignment} showFinder={voyageData.state === 'pending'} showSkills={true} />
								</Popup.Content>
							</Popup>
							{voyageData.state === 'pending' &&
								<div style={{ textAlign: 'center' }}>
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
	const { layout, voyageData, ship, shipData, assignments } = props;

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
								<Popup mouseEnterDelay={POPUP_DELAY} trigger={<span style={{ cursor: 'help', fontWeight: 'bolder' }}>{voyageData.max_hp}</span>}>
									<Popup.Content>
										{ship.antimatter} (Level {ship.level} Ship)
										<br />+{shipData.shipBonus} (Ship Trait Bonus)
										<br />+{shipData.crewBonus} (Crew Trait Bonuses)
									</Popup.Content>
								</Popup>
							)}
							{!ship && <span>{voyageData.max_hp}</span>}
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
						const agg = voyageData.skill_aggregates[entry];
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
										{voyageData.skills.primary_skill === entry && <Icon name='star' color='yellow' />}
										{voyageData.skills.secondary_skill === entry && <Icon name='star' color='grey' />}
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
	assignment: any;
	showFinder: boolean;
	showSkills: boolean;
};

const AssignmentCard = (props: AssignmentCardProps) => {
	const { assignment: { crew, name, trait, bestRank }, showFinder, showSkills } = props;
	const imageUrlPortrait = crew.imageUrlPortrait ?? `${crew.portrait.file.substring(1).replaceAll('/', '_')}.png`;
	
	const context = React.useContext(MergedContext);

	return (
		<Card style={{ padding: '.5em', textAlign: 'center', height: '100%' }}>
			{showFinder &&
				<Label corner='right' style={{ fontSize: '1.1em', textAlign: 'right', padding: '.4em .4em 0 0' }}>
					<CrewFinder crew={crew} bestRank={bestRank} />
				</Label>
			}
			<div style={{ margin: '0 auto' }}>
				<ItemDisplay
					allCrew={context.allCrew}
					playerData={context.playerData}
					targetGroup='voyageLineup'
					itemSymbol={crew.symbol}					
					src={`${process.env.GATSBY_ASSETS_URL}${imageUrlPortrait}`}
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
				{crew.traits.includes(trait.toLowerCase()) &&
					<React.Fragment>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
						<span style={{ marginLeft: '.5em', verticalAlign: 'middle' }}>{allTraits.trait_names[trait]}</span>
					</React.Fragment>
				}
				{showSkills &&
					<div>{renderSkills()}</div>
				}
			</div>
			<Label attached='bottom'>
				{name}
			</Label>
		</Card>
	);

	function renderSkills(): JSX.Element {
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
	crew: any;
	bestRank: any;
};

const CrewFinder = (props: CrewFinderProps) => {
	const { crew, bestRank } = props;

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
			trigger: <div style={{textAlign: "center", marginTop: "-0.6em" }}><Icon name='snowflake' /></div>
		};
	}
	else if (crew.active_status === 2) {
		popup = {
			content: 'On shuttle',
			trigger: <div style={{textAlign: "center", marginTop: "-0.6em" }}><Icon name='space shuttle' /></div>
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

export default LineupViewer;
