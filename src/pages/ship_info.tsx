import React from 'react';

import { mergeShips, setupShip } from '../utils/shiputils';
import { Ship } from '../model/ship';
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
	});

	return <DataPageLayout pageTitle={t('pages.ship_info')} demands={['ship_schematics', 'battle_stations']}>
		<div>
			{!!shipKey && <ShipViewer ship={shipKey} />}
			{!shipKey && globalContext.core.spin(t('spinners.default'))}

			{/* <ShipProfile /> */}
		</div>
	</DataPageLayout>

}

interface ShipViewerProps {
	ship: string,
}

const ShipViewer = (props: ShipViewerProps) => {
	const context = React.useContext(GlobalContext);
	const { t } = context.localized;
	const { ship: shipKey } = props;
	const { playerShips, playerData } = context.player;
	const { crew: coreCrew } = context.core;
	const [ships, setShips] = React.useState<Ship[]>(loadShips());
	const [inputShip, setInputShip] = React.useState<Ship>();
	const [ship, setShip] = React.useState<Ship>();
	const [crew, setCrew] = React.useState<(PlayerCrew | CrewMember)[] | undefined>(undefined);
	const [crewStations, setCrewStations] = React.useState<(PlayerCrew | CrewMember | undefined)[]>([]);

	const [considerFrozen, setConsiderFrozen] = useStateWithStorage('ship_info/considerFrozen', false);
	const [considerUnowned, setConsiderUnowned] = useStateWithStorage('ship_info/considerFrozen', false);
    const [ignoreSkills, setIgnoreSkills] = useStateWithStorage<boolean>(`ship_info/ignoreSkills`, false);
    const [onlyImmortal, setOnlyImmortal] = useStateWithStorage<boolean>(`ship_info/onlyImmortal`, false);

	React.useEffect(() => {
		if (inputShip && crewStations?.length && inputShip.battle_stations?.length === crewStations.length) {
			setShip(setupShip(inputShip, crewStations) || JSON.parse(JSON.stringify(inputShip)));
		}
		else if (inputShip && crewStations?.length !== inputShip.battle_stations?.length) {
			setCrewStations(inputShip.battle_stations?.map(b => undefined as PlayerCrew | CrewMember | undefined) ?? []);
		}
	}, [crewStations, inputShip]);

	React.useEffect(() => {
		setShips(loadShips());
	}, [playerShips]);

	React.useEffect(() => {
		setCrew(getCrew());
	}, [playerData, coreCrew, considerFrozen, considerUnowned])

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
				setShip={setInputShip}
				showLineupManager={false}
				/>
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
