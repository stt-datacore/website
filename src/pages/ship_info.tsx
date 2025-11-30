import React from 'react';

import { getShipDivision, mergeRefShips, setupShip } from '../utils/shiputils';
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
		if (!ship_key && urlParams.has('symbol')) {
			ship_key = urlParams.get('symbol') ?? undefined;
		}
		if (!ship_key) {
			navigate('/ships');
			return;
		}
		setShipKey(ship_key);
	}, []);

	return <DataPageLayout pageTitle={t('pages.ship_info')}>
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
	const [asMaxed, setAsMaxed] = useStateWithStorage<boolean>(`ship_info/asMaxed`, false, { rememberForever: true });

	const [useOpponents, setUseOpponents] = React.useState<BattleMode | false>(false);

	const [activeTabIndex, setActiveTabIndex] = React.useState<number>(0);
	const [oldMaxed, setOldMaxed] = React.useState(false);

	React.useEffect(() => {
		if (inputShip) {
			if ((inputShip.battle_stations?.length !== crewStations?.length)) {
				setCrewStations(inputShip?.battle_stations?.map(b => undefined) ?? [])
			}
			else {
				setCrewStations([...crewStations]);
			}
		}
	}, [inputShip]);

	React.useEffect(() => {
		const c = inputShip?.battle_stations?.length ?? 0;
		if (inputShip && crewStations) {
			if (asMaxed === oldMaxed && ship && ship.battle_stations?.length === crewStations?.length && crewStations.every((cs, i) => cs == ship.battle_stations![i].crew)) return;
			setShip(setupShip(inputShip, crewStations));
			setOldMaxed(asMaxed);
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
			if (shipKey.startsWith("_")) {
				setShipKey(shipKey.slice(1));
				return;
			}
			let input_ship = ships.find(f => f.symbol === shipKey);
			// if (!!newship && !!inputShip && newship?.id === inputShip?.id) return;
			if (input_ship) {
				if (input_ship.owned && asMaxed) {
					let new_ship = mergeRefShips(context.core.all_ships.filter(f => f.symbol === input_ship.symbol), [], context.localized.SHIP_TRAIT_NAMES, false, false, context.player.buffConfig)[0];
					new_ship.owned = true;
					new_ship.id = input_ship.id;
					new_ship.level = new_ship.max_level!;
					new_ship.battle_stations = input_ship.battle_stations;
					setInputShip(new_ship);
				}
				else {
					setInputShip(input_ship);
				}
			}
			else {
				navigate("/ships");
			}
		}
	}, [ships, shipKey]);

	React.useEffect(() => {
		let sk = shipKey;
		setShipKey("_" + sk);
	}, [asMaxed]);

	const division = React.useMemo(() => {
		if (ship) {
			return (getShipDivision(ship.rarity) + 2) as 3 | 4 | 5;
		}
		return undefined;
	}, [ship]);

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
						asMaxed={asMaxed}
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
						setAsMaxed={setAsMaxed}
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
				asMaxed={asMaxed}
				considerFrozen={considerFrozen}
				considerUnowned={considerUnowned}
				crewStations={crewStations}
				ignoreSkills={ignoreSkills}
				isOpponent={false}
				onlyImmortal={onlyImmortal}
				pageId={'shipInfo'}
				setCrewStations={setCrewStations}
				division={division}
				ship={ship}
				setShip={(ship) => ship?.symbol ? setShipKey(ship.symbol) : false}
				/>}

			{activeTabIndex === 1 &&
			<ShipStaffingView
				asMaxed={false}
				considerFrozen={considerFrozen}
				considerUnowned={considerUnowned}
				crewStations={opponentStations}
				ignoreSkills={ignoreSkills}
				isOpponent={true}
				onlyImmortal={onlyImmortal}
				pageId={'opponentInfo'}
				setCrewStations={setOpponentStations}
				division={division}
				ship={opponentShip}
				setShip={(ship) => setOpponentShip(ship)}
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
		const { SHIP_TRAIT_NAMES } = context.localized;
		const all_ships = [...context.core.all_ships];
		let ships = mergeRefShips(all_ships, context.player.playerData?.player.character.ships ?? [], SHIP_TRAIT_NAMES) ?? [];
		return [...ships];
	}

}

export default ShipInfoPage;
