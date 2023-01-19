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

const AllDataContext = React.createContext();

type VoyageCalculatorProps = {
	playerData: any;
	allCrew: any;
};

const VoyageCalculator = (props: VoyageCalculatorProps) => {
	const { playerData, allCrew } = props;

	const [activeCrew, setActiveCrew] = useStateWithStorage('tools/activeCrew', undefined);
	const [allShips, setAllShips] = React.useState(undefined);

	if (!allShips) {
		fetchAllShips();
		return (<><Icon loading name='spinner' /> Loading...</>);
	}

	// Create fake ids for active crew based on rarity, level, and equipped status
	const activeCrewIds = activeCrew.map(ac => {
		return {
			id: ac.symbol+','+ac.rarity+','+ac.level+','+ac.equipment.join(''),
			active_status: ac.active_status
		};
	});

	const myCrew = JSON.parse(JSON.stringify(playerData.player.character.crew));
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
		if (crew.immortal === 0) {
			const activeCrewId = crew.symbol+','+crew.rarity+','+crew.level+','+crew.equipment.join('');
			const active = activeCrewIds.find(ac => ac.id === activeCrewId);
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
		allCrew, allShips, playerData
	};

	return (
		<AllDataContext.Provider value={allData}>
			<VoyageMain myCrew={myCrew} />
		</AllDataContext.Provider>
	);

	async function fetchAllShips() {
		const [shipsResponse] = await Promise.all([
			fetch('/structured/ship_schematics.json')
		]);
		const allships = await shipsResponse.json();
		const ships = mergeShips(allships, playerData.player.character.ships);

		const ownedCount = playerData.player.character.ships.length;
		playerData.player.character.ships.sort((a, b) => a.archetype_id - b.archetype_id).forEach((ship, idx) => {
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
				};
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
	myCrew: any[];
};

const VoyageMain = (props: VoyageMainProps) => {
	const { myCrew } = props;

	const [voyageData, setVoyageData] = useStateWithStorage('tools/voyageData', undefined);
	const [voyageConfig, setVoyageConfig] = React.useState(undefined);
	const [voyageState, setVoyageState] = React.useState('input');	// input or from voyageData: started, recalled

	if (!voyageConfig) {
		if (voyageData) {
			// Voyage started, config will be full voyage data
			if (voyageData.voyage && voyageData.voyage.length > 0) {
				setVoyageConfig(voyageData.voyage[0]);
				setVoyageState(voyageData.voyage[0].state);
			}
			// Voyage awaiting input, config will be input parameters only
			else {
				setVoyageConfig(voyageData.voyage_descriptions[0]);
			}
		}
		else {
			// voyageData not found in cache, config will be blank voyage
			setVoyageConfig({ skills: {} });
		}
		return (<></>);
	}

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
					{voyageState === 'input' &&
						<ConfigEditor voyageConfig={voyageConfig} updateConfig={updateConfig} />
					}
				</Grid.Column>
			</Grid>
			<div style={{ marginTop: '1em' }}>
				{voyageState !== 'input' && (<VoyageExisting voyageConfig={voyageConfig} useCalc={() => setVoyageState('input')} roster={myCrew} />)}
				{voyageState === 'input' && (<VoyageInput voyageConfig={voyageConfig} myCrew={myCrew} useInVoyage={() => setVoyageState(voyageConfig.state)} />)}
			</div>
		</React.Fragment>
	);

	function updateConfig(voyageConfig: any): void {
		setVoyageConfig({...voyageConfig});
		// Update stored voyageData with new voyageConfig
		setVoyageData({
			voyage_descriptions: [{...voyageConfig}],
			voyage: []
		});
		setVoyageState('input');
	}
};

type VoyageExistingProps = {
	voyageConfig: any;
	useCalc: () => void;
	roster: any[];
};

const VoyageExisting = (props: VoyageExistingProps) => {
	const { allShips, playerData } = React.useContext(AllDataContext);
	const { voyageConfig, useCalc, roster } = props;

	return (
		<React.Fragment>
			<VoyageStats
				voyageData={voyageConfig}
				ships={allShips}
				showPanels={voyageConfig.state === 'started' ? ['estimate'] : ['rewards']}
				playerItems={playerData.player.character.items}
				roster={roster}
			/>
			{voyageConfig.state !== 'pending' && <CIVASMessage voyageConfig={voyageConfig} />}
			<Button content='Return to crew calculator'
				icon='exchange'
				size='large'
				onClick={()=> useCalc()}
				style={{ marginTop: '2em' }}
			/>
		</React.Fragment>
	)
};

type VoyageInputProps = {
	voyageConfig: any;
	myCrew: any[];
	useInVoyage: () => void;
};

const VoyageInput = (props: VoyageInputProps) => {
	const { allCrew, allShips, playerData } = React.useContext(AllDataContext);
	const { voyageConfig } = props;
	const allData = {
		allCrew, allShips, playerData
	};
	return (
		<React.Fragment>
			<Recommender voyageConfig={props.voyageConfig} myCrew={props.myCrew} allData={allData} />
			{voyageConfig.state &&
				<Button content='Return to current voyage'
					icon='exchange'
					size='large'
					onClick={()=> props.useInVoyage()}
					style={{ marginTop: '2em' }}
				/>
			}
		</React.Fragment>
	);
};

export default VoyageCalculator;
