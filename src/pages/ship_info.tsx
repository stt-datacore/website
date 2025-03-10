import React from 'react';

import { mergeShips, setupShip } from '../utils/shiputils';
import { BattleMode, Ship } from '../model/ship';
import { PlayerCrew } from '../model/player';
import { CrewMember } from '../model/crew';
import { GlobalContext } from '../context/globalcontext';
import { navigate } from 'gatsby';
import DataPageLayout from '../components/page/datapagelayout';
import { WorkerProvider } from '../context/workercontext';
import { ShipRosterCalc } from '../components/ship/rostercalc';
import { useStateWithStorage } from '../utils/storage';
import { ShipMultiWorker } from '../components/ship/shipmultiworker';
import { ShipStaffingView } from '../components/ship/staffingview';
import { Step } from 'semantic-ui-react';

const ShipInfoPage = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized

	const [shipKey, setShipKey] = React.useState<string | undefined>();

	React.useEffect(() => {
		let ship_key: string | undefined = undefined;
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('ship')) {
			ship_key = urlParams.get('ship') ?? undefined;
		}
		if (!ship_key) {
			navigate('/ships');
			return;
		}
		setShipKey(ship_key);
	}, []);

	return <DataPageLayout pageTitle={t('pages.ship_info')} demands={['ship_schematics', 'battle_stations']}>
		<div>
			{!!shipKey && <ShipViewer ship={shipKey} setShip={setShipKey} />}
			{!shipKey && globalContext.core.spin(t('spinners.default'))}

			{/* <ShipProfile /> */}
		</div>
	</DataPageLayout>

}

interface ShipViewerProps {
	ship: string,
	setShip: (value: string) => void;
}

const ShipViewer = (props: ShipViewerProps) => {
	const context = React.useContext(GlobalContext);
	const { t } = context.localized;
	const { ship: shipKey, setShip: setShipKey } = props;
	const { playerShips, playerData } = context.player;
	const { crew: coreCrew } = context.core;
	const [ships, setShips] = React.useState<Ship[]>([]);
	const [inputShip, setInputShip] = React.useState<Ship>();
	const [ship, setShip] = React.useState<Ship>();
	const [crew, setCrew] = React.useState<(PlayerCrew | CrewMember)[] | undefined>(undefined);

	const [crewStations, setCrewStations] = React.useState<(PlayerCrew | CrewMember | undefined)[]>([]);

	const [opponentStations, setOpponentStations] = useStateWithStorage<(PlayerCrew | CrewMember | undefined)[]>(`ship_info/opponent_stations`, [], { rememberForever: true });
	const [opponentShip, setOpponentShip] = useStateWithStorage<Ship | undefined>('ship_info/opponent_ship', undefined, { rememberForever: true });

	const [considerFrozen, setConsiderFrozen] = useStateWithStorage('ship_info/considerFrozen', false);
	const [considerUnowned, setConsiderUnowned] = useStateWithStorage('ship_info/considerFrozen', false);
    const [ignoreSkills, setIgnoreSkills] = useStateWithStorage<boolean>(`ship_info/ignoreSkills`, false);
    const [onlyImmortal, setOnlyImmortal] = useStateWithStorage<boolean>(`ship_info/onlyImmortal`, false);

	const [useOpponents, setUseOpponents] = React.useState<BattleMode | false>(false);

	const [activeTabIndex, setActiveTabIndex] = React.useState<number>(0);

	React.useEffect(() => {
		if (inputShip && crewStations.length !== inputShip.battle_stations?.length) {
			setCrewStations(inputShip.battle_stations?.map(b => undefined as PlayerCrew | CrewMember | undefined) ?? []);
		}
	}, [inputShip]);

	React.useEffect(() => {
		const c = inputShip?.battle_stations?.length ?? 0;
		if (inputShip && !!inputShip.battle_stations?.length && crewStations.length === inputShip.battle_stations.length) {
			let i = 0;
			if (ship?.battle_stations?.length && ship.battle_stations?.length === crewStations.length) {
				for (i = 0; i < c; i++) {
					if (ship.battle_stations[i].crew?.id !== crewStations[i]?.id) break;
				}
			}

			if (i < c) {
				setShip(setupShip(inputShip, crewStations));
			}
		}
	}, [crewStations]);

	React.useEffect(() => {
		setShips(loadShips());
	}, [playerShips]);

	React.useEffect(() => {
		setCrew(getCrew());
	}, [playerData, coreCrew, considerFrozen, considerUnowned])

	React.useEffect(() => {
		if (!useOpponents && activeTabIndex > 0) {
			setActiveTabIndex(0);
		}
	}, [useOpponents]);

	React.useEffect(() => {
		if (ships?.length && shipKey) {
			let newship = ships.find(f => f.symbol === shipKey);
			if (!!newship && !!inputShip && newship?.id === inputShip?.id) return;
			if (newship) {
				setInputShip(newship);
			}
			else {
				navigate("/ships");
			}
		}
	}, [ships, shipKey]);

	return (<>
		<div style={{
			display: "flex",
			width: "100%",
			fontSize: "12pt",
			flexDirection: "column",
			justifyContent: "center",
			alignItems: "center"
		}}>
			{!!inputShip && !!crew && <WorkerProvider>
				<ShipMultiWorker>
					<ShipRosterCalc
						opponentShip={opponentShip}
						opponentStations={opponentStations}
						useOpponents={useOpponents}
						setUseOpponents={setUseOpponents}
						considerFrozen={considerFrozen}
						considerUnowned={considerUnowned}
						crew={crew}
						crewStations={crewStations}
						ignoreSkills={ignoreSkills}
						onlyImmortal={onlyImmortal}
						pageId={'shipInfo'}
						setConsiderFrozen={setConsiderFrozen}
						setConsiderUnowned={setConsiderUnowned}
						setCrewStations={setCrewStations}
						setIgnoreSkills={setIgnoreSkills}
						setOnlyImmortal={setOnlyImmortal}
						ships={[inputShip]}
					/>
				</ShipMultiWorker>
			</WorkerProvider>}

			{!!useOpponents && <>
				<Step.Group style={{width: "70%"}}>
				<Step active={activeTabIndex === 0} onClick={() => setActiveTabIndex(0)}>
					<Step.Content>
						<Step.Title>{t('ship.tabs.player.title')}</Step.Title>
						<Step.Description>{t('ship.tabs.player.header')}</Step.Description>
					</Step.Content>
				</Step>
				<Step active={activeTabIndex === 1} onClick={() => setActiveTabIndex(1)}>
					<Step.Content>
						<Step.Title>{t('ship.tabs.opponent.title')}</Step.Title>
						<Step.Description>{t('ship.tabs.opponent.header')}</Step.Description>
					</Step.Content>
				</Step>
			</Step.Group>

			</>}
			{activeTabIndex === 0 &&
			<ShipStaffingView
				considerFrozen={considerFrozen}
				considerUnowned={considerUnowned}
				crewStations={crewStations}
				ignoreSkills={ignoreSkills}
				isOpponent={false}
				onlyImmortal={onlyImmortal}
				pageId={'shipInfo'}
				setCrewStations={setCrewStations}
				ship={ship}
				setShip={(ship) => ship ? setShipKey(ship.symbol) : null}
				showLineupManager={false}
				/>}

			{activeTabIndex === 1 &&
			<ShipStaffingView
				considerFrozen={considerFrozen}
				considerUnowned={considerUnowned}
				crewStations={opponentStations}
				ignoreSkills={ignoreSkills}
				isOpponent={true}
				onlyImmortal={onlyImmortal}
				pageId={'opponentInfo'}
				setCrewStations={setOpponentStations}
				ship={opponentShip}
				setShip={(ship) => setOpponentShip(ship)}
				showLineupManager={true}
				/>}
		</div>
	</>)

	function getCrew() {
		if (!context) return [];
		let frozen = considerFrozen;
		let results = context.player.playerData?.player.character.crew.filter(crew => frozen || crew.immortal <= 0) ?? context.core.crew;
		if (considerUnowned && context?.player?.playerData) {
			results = results.concat(context.player.playerData.player.character.unOwnedCrew ?? []);
		}
		if (onlyImmortal) {
			results = results.filter(f => !("immortal" in f) || !!f.immortal);
		}
		return [...results];
	}

	function loadShips() {
		if (!context) return [];
		const schematics = [...context.core.ship_schematics];

		const constellation = {
			symbol: 'constellation_ship',
			rarity: 1,
			max_level: 5,
			antimatter: 1250,
			name: 'Constellation Class',
			icon: { file: '/ship_previews_fed_constellationclass' },
			traits: ['federation','explorer'],
			battle_stations: [
				{
					skill: 'command_skill'
				},
				{
					skill: 'diplomacy_skill'
				}
			],
			owned: true
		} as Ship;

		schematics.push({
			ship: constellation,
			rarity: constellation.rarity,
			cost: 0,
			id: 1,
			icon: constellation.icon!
		});

		let ships = mergeShips(schematics, context.player.playerData?.player.character.ships ?? []) ?? [];
		return [...ships];
	}

}


export default ShipInfoPage;
