import React from 'react';
import { Icon, Button, Message, Image, Grid, Card } from 'semantic-ui-react';

import CONFIG from './CONFIG';
import allTraits from '../../static/structured/translation_en.json';

import ConfigEditor from '../components/voyagecalculator/configeditor';
import Recommender from '../components/voyagecalculator/recommender';
import CIVASMessage from '../components/voyagecalculator/civas';
import { VoyageStats } from '../components/voyagecalculator/voyagestats';

import { mergeShips } from '../utils/shiputils';
import { useStateWithStorage } from '../utils/storage';
import { CompletionState, PlayerCrew, PlayerData, Voyage, VoyageBase, VoyageInfo, VoyageSkills } from '../model/player';
import { Schematics, Ship } from '../model/ship';
import { MergedData, MergedContext } from '../context/mergedcontext';
import { CrewMember } from '../model/crew';
import { CrewHoverStat } from './hovering/crewhoverstat';
import { crewCopy } from '../utils/crewutils';
import { ItemHoverStat } from './hovering/itemhoverstat';

export const VoyageContext = React.createContext<MergedData>({} as MergedData);

const VoyageCalculator = () => {
	const { playerData, allCrew, items } = React.useContext(MergedContext);

	const [activeCrew, setActiveCrew] = useStateWithStorage<PlayerCrew[] | undefined>('tools/activeCrew', undefined);
	const [allShips, setAllShips] = React.useState<Ship[] | undefined>(undefined);
	
	if (!allShips) {
		fetchAllShips();
		return (<><Icon loading name='spinner' /> Loading...</>);
	}

	// Create fake ids for active crew based on rarity, level, and equipped status
	const activeCrewIds = activeCrew?.map(ac => {
		return {
			id: ac.symbol+','+ac.rarity+','+ac.level+','+ac.equipment.join(''),
			active_status: ac.active_status
		};
	});

	const myCrew = crewCopy(playerData.player.character.crew) as PlayerCrew[];
	myCrew.forEach((crew, crewId) => {
		crew.id = crewId+1;

		// Voyage calculator looks for skills, range_min, range_max properties
		let skills = {};
		for (let skill in CONFIG.SKILLS) {
			if (crew[skill].core > 0)
				skills[skill] = {
					'core': crew[skill].core,
					'range_min': crew[skill].min,
					'range_max': crew[skill].max
				};
		}
		crew.skills = skills;

		// Voyage roster generation looks for active_status property
		crew.active_status = 0;
		if (crew.immortal <= 0) {
			const activeCrewId = crew.symbol+','+crew.rarity+','+crew.level+','+crew.equipment.join('');
			const active = activeCrewIds?.find(ac => ac.id === activeCrewId);
			if (active) {
				crew.active_status = active.active_status;
				active.id = '';	// Clear this id so that dupes are counted properly
			}
		}
	});

	// There may be other ways we should check for voyage eligibility
	if (playerData.player.character.level < 8 || myCrew.length < 12)
		return (<Message>Sorry, but you can't voyage just yet!</Message>);

	const allData = {
		allCrew, allShips, playerData, items
	} as MergedData;

	return (
		<VoyageContext.Provider value={allData}>
			<VoyageMain myCrew={myCrew} />
		</VoyageContext.Provider>
	);

	async function fetchAllShips() {
		const [shipsResponse ] = await Promise.all([
			fetch('/structured/ship_schematics.json')
		]);
		const allships = await shipsResponse.json() as Schematics[];
		const ships = mergeShips(allships, playerData.player.character.ships);

		const ownedCount = playerData.player.character.ships.length;
		playerData.player.character.ships.sort((a, b) => (a?.archetype_id ?? 0) - (b?.archetype_id ?? 0)).forEach((ship, idx) => {
			// allShips is missing the default ship for some reason (1* Constellation Class), so manually add it here from playerData
			if (ship.symbol === 'constellation_ship') {
				const constellation = {
					symbol: ship.symbol,
					rarity: ship.rarity,
					level: ship.level,
					antimatter: ship.antimatter,
					name: 'Constellation Class',
					icon: { file: '/ship_previews_fed_constellationclass' },
					traits: ['federation','explorer'],
					owned: true
				} as Ship;
				ships.push(constellation);
			}
			const myShip = ships.find(s => s.symbol === ship.symbol);
			if (myShip) {
				myShip.id = ship.id;	// VoyageStats needs ship id to identify ship on existing voyage
				myShip.index = { left: (ownedCount-idx+1), right: idx-1 };
				if (idx === 0)
					myShip.index = { left: 1, right: ownedCount-1 };
				else if (idx === 1)
					myShip.index = { left: 0, right: 0 };
			}
		});
		setAllShips(ships);
	}
};

type VoyageMainProps = {
	myCrew: PlayerCrew[];
};

const VoyageMain = (props: VoyageMainProps) => {
	const { myCrew } = props;

	const [voyageData, setVoyageData] = useStateWithStorage<VoyageInfo | undefined>('tools/voyageData', undefined);
	const [voyageConfig, setVoyageConfig] = React.useState<VoyageBase | undefined>(undefined);
	const [showInput, setShowInput] = React.useState(true);

	if (!voyageConfig) {
		if (voyageData) {
			// Voyage started, config will be full voyage data
			if (voyageData.voyage && voyageData.voyage.length > 0) {
				setVoyageConfig(voyageData.voyage[0]);
				setShowInput(false);
			}
			// Voyage awaiting input, config will be input parameters only
			else {
				setVoyageConfig(voyageData.voyage_descriptions[0]);
			}
		}
		else {
			// voyageData not found in cache, config will be blank voyage
			setVoyageConfig({ skills: {} as VoyageSkills} as VoyageBase);
		}
		return (<></>);
	}

	return (
		<React.Fragment>
			{voyageConfig.state && (<VoyageActiveCard voyageConfig={voyageConfig} showInput={showInput} setShowInput={setShowInput} />)}
			{!showInput && (<VoyageActive voyageConfig={voyageConfig} myCrew={myCrew} />)}
			{showInput && (<VoyageInput voyageConfig={voyageConfig} myCrew={myCrew} />)}
		</React.Fragment>
	);
};

const VoyageActiveCard = (props: any) => {
	const { allShips } = React.useContext(VoyageContext);
	const { voyageConfig, showInput, setShowInput } = props;

	const ship = allShips?.find(s => s.id === voyageConfig.ship_id);
	if (!ship) return <></>
	const msgTypes = {
		started: 'has been running for',
		failed: 'failed at',
		recalled: 'ran for',
		completed: 'ran for'
	};
	const voyageDuration = formatTime(voyageConfig.state == 'started' ? voyageConfig.voyage_duration/3600 : voyageConfig.log_index/180);

	return (
		<Card fluid>
			<Card.Content>
				<Image floated='left' src={`${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`} style={{ height: '4em' }} />
				<Card.Header>{voyageConfig.ship_name}{ship.name !== voyageConfig.ship_name ? ` (${ship.name})` : ''}</Card.Header>
				<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', rowGap: '1em' }}>
					<div>
						<p>
							Active voyage: <b>{CONFIG.SKILLS[voyageConfig.skills.primary_skill]}</b> / <b>{CONFIG.SKILLS[voyageConfig.skills.secondary_skill]}</b> / <b>{allTraits.ship_trait_names[voyageConfig.ship_trait] ?? voyageConfig.ship_trait}</b>
						</p>
						<p style={{ marginTop: '.5em' }}>
							Your voyage {msgTypes[voyageConfig.state]} <span style={{ whiteSpace: 'nowrap' }}>{voyageDuration}</span>.
						</p>
					</div>
					<div>
						<Button content={showInput ? 'View active voyage' : 'View crew calculator'}
							icon='exchange'
							size='large'
							onClick={()=> setShowInput(showInput ? false : true)}
						/>
					</div>
				</div>
			</Card.Content>
		</Card>
	);

	function formatTime(time: number): string {
		let hours = Math.floor(time);
		let minutes = Math.floor((time-hours)*60);
		return hours+"h " +minutes+"m";
	}
};

type VoyageActiveProps = {
	voyageConfig: VoyageBase;
	myCrew: PlayerCrew[];
};

const VoyageActive = (props: VoyageActiveProps) => {
	const { allShips, playerData, allCrew, items } = React.useContext(VoyageContext);
	const { voyageConfig, myCrew } = props;

	if (!allShips) return <></>;

	return (
		<React.Fragment>
			<VoyageStats
				voyageData={voyageConfig as Voyage}
				ships={allShips}
				showPanels={voyageConfig.state === 'started' ? ['estimate'] : ['rewards']}
				playerItems={playerData.player.character.items}
				roster={myCrew}
				dbid={playerData.player.dbid}
				allCrew={allCrew}
				allItems={items}
				playerData={playerData}
			/>
			{voyageConfig.state !== 'pending' && <CIVASMessage voyageConfig={voyageConfig} />}
			<CrewHoverStat targetGroup='voyageRewards_crew' />
			<ItemHoverStat targetGroup='voyageRewards_item' />
			
		</React.Fragment>
	)
};

type VoyageInputProps = {
	voyageConfig: VoyageBase;
	myCrew: PlayerCrew[];
};

const VoyageInput = (props: VoyageInputProps) => {
	const { allCrew, allShips, playerData } = React.useContext(VoyageContext);
	const [voyageConfig, setVoyageConfig] = React.useState<Voyage>(JSON.parse(JSON.stringify(props.voyageConfig)));
	const allData = {
		allCrew, allShips, playerData
	};
	return (
		<React.Fragment>
			<Grid columns={2} stackable>
				<Grid.Column width={14}>
					<Card.Group>
						<Card>
							<Card.Content>
								<Image floated='right' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${voyageConfig.skills.primary_skill}.png`} style={{ height: '2em' }} />
								<Card.Header>{CONFIG.SKILLS[voyageConfig.skills.primary_skill]}</Card.Header>
								<p>primary</p>
							</Card.Content>
						</Card>
						<Card>
							<Card.Content>
								<Image floated='right' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${voyageConfig.skills.secondary_skill}.png`} style={{ height: '2em' }} />
								<Card.Header>{CONFIG.SKILLS[voyageConfig.skills.secondary_skill]}</Card.Header>
								<p>secondary</p>
							</Card.Content>
						</Card>
						<Card>
							<Card.Content>
								<Card.Header>{allTraits.ship_trait_names[voyageConfig.ship_trait] ?? voyageConfig.ship_trait}</Card.Header>
								<p>ship trait</p>
							</Card.Content>
						</Card>
					</Card.Group>
				</Grid.Column>
				<Grid.Column width={2} textAlign='right'>
					<ConfigEditor voyageConfig={voyageConfig} updateConfig={setVoyageConfig} />
				</Grid.Column>
			</Grid>
			<Recommender voyageConfig={voyageConfig} myCrew={props.myCrew} allData={allData} />
		</React.Fragment>
	);
};

export default VoyageCalculator;
