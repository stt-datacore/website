// import React from 'react';
// import { Icon, Button, Message, Image, Grid, Card } from 'semantic-ui-react';

// import CONFIG from './CONFIG';
// import allTraits from '../../static/structured/translation_en.json';

// import ConfigEditor from '../components/voyagecalculator/configeditor';
// import Recommender from '../components/voyagecalculator/recommender';
// import CIVASMessage from '../components/voyagecalculator/civas';
// import { VoyageStats } from '../components/voyagecalculator/voyagestats';

// import { ActiveVoyageTracker } from '../components/voyagehistory/activevoyage';
// import { getRuntime } from '../components/voyagehistory/utils';

// import { mergeShips } from '../utils/shiputils';
// import { useStateWithStorage } from '../utils/storage';
// import { PlayerCrew, Voyage, VoyageBase, VoyageInfo, VoyageSkills } from '../model/player';
// import { Schematics, Ship } from '../model/ship';
// import { IDefaultGlobal, GlobalContext } from '../context/globalcontext';
// import { CrewHoverStat } from './hovering/crewhoverstat';
// import { crewCopy } from '../utils/crewutils';
// import { EphemeralData, PlayerContext } from '../context/playercontext';
// import { ItemHoverStat } from './hovering/itemhoverstat';

// export const VoyageContext = React.createContext<IDefaultGlobal>({} as IDefaultGlobal);

// const VoyageCalculator = () => {
// 	const context = React.useContext(GlobalContext);
// 	const { ephemeral, playerData } = context.player;
// 	const { crew: allCrew, items } = context.core;
// 	const { playerShips: ships } = context.player;

// 	const activeCrew = ephemeral?.activeCrew;
// 	const [allShips, setAllShips] = React.useState<Ship[] | undefined>(undefined);

// 	if (!allShips && !!ships) {
// 		fetchAllShips(ships);
// 		return (<><Icon loading name='spinner' /> Loading...</>);
// 	}

// 	// Create fake ids for active crew based on rarity, level, and equipped status
// 	const activeCrewIds = activeCrew?.map(ac => {
// 		return {
// 			id: ac.symbol+','+ac.rarity+','+ac.level+','+ac.equipment.join(''),
// 			active_status: ac.active_status
// 		};
// 	});

// 	const myCrew = crewCopy(playerData?.player.character.crew ?? []) as PlayerCrew[];
// 	myCrew.forEach((crew, crewId) => {
// 		crew.id = crewId+1;

// 		// Voyage calculator looks for skills, range_min, range_max properties
// 		let skills = {};
// 		for (let skill in CONFIG.SKILLS) {
// 			if (crew[skill].core > 0)
// 				skills[skill] = {
// 					'core': crew[skill].core,
// 					'range_min': crew[skill].min,
// 					'range_max': crew[skill].max
// 				};
// 		}
// 		crew.skills = skills;

// 		// Voyage roster generation looks for active_status property
// 		crew.active_status = 0;
// 		if (crew.immortal <= 0) {
// 			const activeCrewId = crew.symbol+','+crew.rarity+','+crew.level+','+crew.equipment.join('');
// 			const active = activeCrewIds?.find(ac => ac.id === activeCrewId);
// 			if (active) {
// 				crew.active_status = active.active_status ?? 0;
// 				active.id = '';	// Clear this id so that dupes are counted properly
// 			}
// 		}
// 	});

// 	// There may be other ways we should check for voyage eligibility
// 	if ((playerData?.player.character.level ?? 0) < 8 || myCrew.length < 12)
// 		return (<Message>Sorry, but you can't voyage just yet!</Message>);

// 	const allData = {
// 		... context,
// 		core: {
// 			...context.core,
// 			crew: allCrew,
// 			ships: allShips,
// 			items
// 		},
// 		player: {
// 			...context.player,
// 			playerData
// 		}
// 	} as IDefaultGlobal;

// 	return (
// 		<VoyageContext.Provider value={allData}>
// 			<VoyageMain myCrew={myCrew} />
// 		</VoyageContext.Provider>
// 	);

// 	function fetchAllShips(ships: Ship[]) {

// 		const ownedCount = playerData?.player.character.ships.length ?? 0;
// 		playerData?.player.character.ships.sort((a, b) => (a?.archetype_id ?? 0) - (b?.archetype_id ?? 0)).forEach((ship, idx) => {
// 			// allShips is missing the default ship for some reason (1* Constellation Class), so manually add it here from playerData
// 			if (ship.symbol === 'constellation_ship') {
// 				const constellation = {
// 					symbol: ship.symbol,
// 					rarity: ship.rarity,
// 					level: ship.level,
// 					antimatter: ship.antimatter,
// 					name: 'Constellation Class',
// 					icon: { file: '/ship_previews_fed_constellationclass' },
// 					traits: ['federation','explorer'],
// 					owned: true
// 				} as Ship;
// 				ships.push(constellation);
// 			}
// 			const myShip = ships.find(s => s.symbol === ship.symbol);
// 			if (myShip) {
// 				myShip.id = ship.id;	// VoyageStats needs ship id to identify ship on existing voyage
// 				myShip.index = { left: (ownedCount-idx+1), right: idx-1 };
// 				if (idx === 0)
// 					myShip.index = { left: 1, right: ownedCount-1 };
// 				else if (idx === 1)
// 					myShip.index = { left: 0, right: 0 };
// 			}
// 		});
// 		setAllShips(ships);
// 	}
// };

// type VoyageMainProps = {
// 	myCrew: PlayerCrew[];
// };

// const VoyageMain = (props: VoyageMainProps) => {
// 	const playerContext = React.useContext(VoyageContext);
// 	const ephemeral = playerContext.player.ephemeral ?? {} as EphemeralData;
// 	const { voyage, voyageDescriptions } = ephemeral;

// 	const { myCrew } = props;
// 	const voyageData = { voyage, voyage_descriptions: voyageDescriptions };

// 	const [voyageConfig, setVoyageConfig] = React.useState<VoyageBase | undefined>(undefined);
// 	const [showInput, setShowInput] = React.useState(true);

// 	if (!voyageConfig) {
// 		if (voyageData?.voyage_descriptions?.length) {
// 			// Voyage started, config will be full voyage data
// 			if (voyageData.voyage && voyageData.voyage.length > 0) {
// 				setVoyageConfig(voyageData.voyage[0]);
// 				setShowInput(false);
// 			}
// 			// Voyage awaiting input, config will be input parameters only
// 			else {
// 				setVoyageConfig(voyageData.voyage_descriptions[0]);
// 			}
// 		}
// 		else {
// 			// voyageData not found in cache, config will be blank voyage
// 			setVoyageConfig({ skills: {} as VoyageSkills} as VoyageBase);
// 		}
// 		return (<></>);
// 	}

// 	return (
// 		<React.Fragment>
// 			{voyageConfig.state && (<VoyageActiveCard voyageConfig={voyageConfig as Voyage} showInput={showInput} setShowInput={setShowInput} />)}
// 			{!showInput && (<VoyageActive voyageConfig={voyageConfig} myCrew={myCrew} />)}
// 			{showInput && (<VoyageInput voyageConfig={voyageConfig} myCrew={myCrew} />)}
// 		</React.Fragment>
// 	);
// };

// type VoyageActiveCardProps = {
// 	voyageConfig: Voyage;
// 	showInput: boolean;
// 	setShowInput: (showInput: boolean) => void;
// };

// const VoyageActiveCard = (props: VoyageActiveCardProps) => {
// 	const { ships: allShips } = React.useContext(VoyageContext).core;
// 	const { voyageConfig, showInput, setShowInput } = props;

// 	const ship = allShips?.find(s => s.id === voyageConfig.ship_id);
// 	if (!ship) return <></>;
// 	const msgTypes = {
// 		started: 'has been running for',
// 		failed: 'failed at',
// 		recalled: 'ran for',
// 		completed: 'ran for'
// 	};
// 	const voyageDuration = formatTime(getRuntime(voyageConfig));

// 	return (
// 		<Card fluid>
// 			<Card.Content>
// 				<Image floated='left' src={`${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`} style={{ height: '4em' }} />
// 				<Card.Header>{voyageConfig.ship_name ? `${voyageConfig.ship_name} (${ship.name})` : `${ship.name}`}</Card.Header>
// 				<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', rowGap: '1em' }}>
// 					<div>
// 						<p>
// 							Active voyage: <b>{CONFIG.SKILLS[voyageConfig.skills.primary_skill]}</b> / <b>{CONFIG.SKILLS[voyageConfig.skills.secondary_skill]}</b> / <b>{allTraits.ship_trait_names[voyageConfig.ship_trait] ?? voyageConfig.ship_trait}</b>
// 						</p>
// 						<p style={{ marginTop: '.5em' }}>
// 							Your voyage {msgTypes[voyageConfig.state]} <b><span style={{ whiteSpace: 'nowrap' }}>{voyageDuration}</span></b>.
// 							<ActiveVoyageTracker voyageConfig={voyageConfig} shipSymbol={ship.symbol} />
// 						</p>
// 					</div>
// 					<div>
// 						<Button content={showInput ? 'View active voyage' : 'View crew calculator'}
// 							icon='exchange'
// 							size='large'
// 							onClick={()=> setShowInput(showInput ? false : true)}
// 						/>
// 					</div>
// 				</div>
// 			</Card.Content>
// 		</Card>
// 	);

// 	function formatTime(time: number): string {
// 		let hours = Math.floor(time);
// 		let minutes = Math.floor((time-hours)*60);
// 		return hours+"h " +minutes+"m";
// 	}
// };

// type VoyageActiveProps = {
// 	voyageConfig: VoyageBase;
// 	myCrew: PlayerCrew[];
// };

// const VoyageActive = (props: VoyageActiveProps) => {
// 	const context = React.useContext(VoyageContext);
// 	const { ephemeral, playerData } = context.player;
// 	const { ships: allShips, crew: allCrew, items } = context.core;

// 	const { voyageConfig, myCrew } = props;

// 	if (!allShips) return <></>;

// 	return (
// 		<React.Fragment>
// 			<VoyageStats
// 				voyageData={voyageConfig as Voyage}
// 				ships={allShips}
// 				showPanels={voyageConfig.state === 'started' ? ['estimate'] : ['rewards']}
// 				playerItems={playerData?.player.character.items}
// 				roster={myCrew}
// 				dbid={playerData?.player.dbid ?? ''}
// 				allCrew={allCrew}
// 				allItems={items}
// 				playerData={playerData}
// 			/>
// 			{voyageConfig.state !== 'pending' && <CIVASMessage voyageConfig={voyageConfig} />}
// 			<CrewHoverStat targetGroup='voyageRewards_crew' />
// 			<ItemHoverStat targetGroup='voyageRewards_item' />

// 		</React.Fragment>
// 	)
// };

// type VoyageInputProps = {
// 	voyageConfig: VoyageBase;
// 	myCrew: PlayerCrew[];
// };

// const VoyageInput = (props: VoyageInputProps) => {
// 	const context = React.useContext(VoyageContext);
// 	const { ephemeral, playerData } = context.player;
// 	const { ships: allShips, crew: allCrew, items } = context.core;

// 	const [voyageConfig, setVoyageConfig] = React.useState<Voyage>(JSON.parse(JSON.stringify(props.voyageConfig)));
// 	if (!playerData) return <></>;

// 	const allData = {
// 		allCrew, allShips, playerData
// 	};
// 	return (
// 		<React.Fragment>
// 			<Grid columns={2} stackable>
// 				<Grid.Column width={14}>
// 					<Card.Group>
// 						<Card>
// 							<Card.Content>
// 								<Image floated='right' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${voyageConfig.skills.primary_skill}.png`} style={{ height: '2em' }} />
// 								<Card.Header>{CONFIG.SKILLS[voyageConfig.skills.primary_skill]}</Card.Header>
// 								<p>primary</p>
// 							</Card.Content>
// 						</Card>
// 						<Card>
// 							<Card.Content>
// 								<Image floated='right' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${voyageConfig.skills.secondary_skill}.png`} style={{ height: '2em' }} />
// 								<Card.Header>{CONFIG.SKILLS[voyageConfig.skills.secondary_skill]}</Card.Header>
// 								<p>secondary</p>
// 							</Card.Content>
// 						</Card>
// 						<Card>
// 							<Card.Content>
// 								<Card.Header>{allTraits.ship_trait_names[voyageConfig.ship_trait] ?? voyageConfig.ship_trait}</Card.Header>
// 								<p>ship trait</p>
// 							</Card.Content>
// 						</Card>
// 					</Card.Group>
// 				</Grid.Column>
// 				<Grid.Column width={2} textAlign='right'>
// 					<ConfigEditor voyageConfig={voyageConfig} updateConfig={setVoyageConfig} />
// 				</Grid.Column>
// 			</Grid>
// 			<Recommender voyageConfig={voyageConfig} myCrew={props.myCrew} allData={allData} />
// 		</React.Fragment>
// 	);
// };

// export default VoyageCalculator;
