import React from "react"
import { Button } from "semantic-ui-react"
import CrewPicker from "../crewpicker"
import { CrewHoverStat, CrewTarget } from "../hovering/crewhoverstat"
import { ShipPresenter } from "../item_presenters/ship_presenter"
import { GlobalContext } from "../../context/globalcontext"
import { CrewMember } from "../../model/crew"
import { PlayerCrew } from "../../model/player"
import { BattleStation, Ship } from "../../model/ship"
import { findPotentialCrew, mergeRefShips } from "../../utils/shiputils"
import { useStateWithStorage } from "../../utils/storage"
import { OptionsPanelFlexColumn } from "../stats/utils"
import { getShipBonus, getSkills } from "../../utils/crewutils"
import CONFIG from "../CONFIG"
import { getActionColor, getShipBonusIcon } from "../item_presenters/shipskill"
import { ShipPicker } from "../crewtables/shipoptions"
import { navigate } from "gatsby"
import { DEFAULT_SHIP_OPTIONS, ShipCrewOptionsModal } from "./shipcrewmodal"

export interface ShipStaffingProps {
    ship?: Ship;
    setShip: (value?: Ship) => void;
    considerFrozen: boolean;
    considerUnowned: boolean;
    ignoreSkills: boolean;
    onlyImmortal: boolean;
    isOpponent?: boolean;
    crewStations: (PlayerCrew | CrewMember | undefined)[];
    setCrewStations: (value: (PlayerCrew | CrewMember | undefined)[]) => void;
    showLineupManager?: boolean;
    pageId?: string;
    boss?: Ship;
}

export const ShipStaffingView = (props: ShipStaffingProps) => {
    const context = React.useContext(GlobalContext);
	const { t } = context.localized;
	const {
        pageId: targetGroup,
        ship,
        setShip,
        isOpponent,
        boss,
        considerFrozen,
        considerUnowned,
        onlyImmortal,
        ignoreSkills,
        crewStations,
        setCrewStations
    } = props;
	const { playerShips, playerData } = context.player;
	const { crew: coreCrew, all_ships: coreShips } = context.core;

    const [ships, setShips] = React.useState<Ship[]>(loadShips());
	const [crew, setCrew] = React.useState<(PlayerCrew | CrewMember)[] | undefined>(undefined);

	const [currentStation, setCurrentStation] = React.useState<number | undefined>(undefined);
	const [currentStationCrew, setCurrentStationCrew] = React.useState<(PlayerCrew | CrewMember)[]>([]);
	const [modalOptions, setModalOptions] = useStateWithStorage('ship_info/modalOptions', DEFAULT_SHIP_OPTIONS);

	React.useEffect(() => {
		setShips(loadShips());
	}, [playerShips, coreShips]);

	React.useEffect(() => {
		setCrew(getCrew());
	}, [playerData, coreCrew, considerFrozen, considerUnowned])

	React.useEffect(() => {
		if (ship?.battle_stations) {
			crewStations.length = ship.battle_stations.length;
			setCrewStations([...crewStations]);
		}
		else {
			setCrewStations([]);
		}
	}, [ship]);

	const flexCol = OptionsPanelFlexColumn;

    if ((!ship && !isOpponent) || !crew) return context.core.spin(t('spinners.default'));

    return (
        <React.Fragment>

        <CrewHoverStat targetGroup={`${targetGroup || 'ship_profile'}`} />

		<div style={{
			display: "flex",
			width: "100%",
			fontSize: "12pt",
			flexDirection: "column",
			justifyContent: "center",
			alignItems: "center"
		}}>
            <div style={{width: '70%'}}>
            {!!ships?.length && <ShipPicker clearable={isOpponent} pool={ships} selectedShip={ship} setSelectedShip={navigateToShip} />}
            </div>
			<h3>{t('ship.battle_stations')}</h3>

			<div style={{
				display: "flex",
				flexDirection: "row",
				justifyContent: "center",
				alignItems: "center",
				padding: 0,
				marginBottom: '2em'
			}}>
				{!!ship && ship.battle_stations?.map((bs, idx) => (
					<div key={`${isOpponent ? 'opponent_' : ''}ship_battle_station_${idx}_${bs.skill}`} style={flexCol}>
						<CrewPicker
							renderCrewCaption={renderCrewCaption}
							// isOpen={modalOpen}
							// setIsOpen={setModalOpen}
							filterCrew={filterCrew}
							contextData={bs}
							renderTrigger={() => renderBattleStation(bs, idx)}
							beforeOpen={(d, o) => clickStation(idx, d.skill)}
							crewList={currentStationCrew}
							defaultOptions={DEFAULT_SHIP_OPTIONS}
							pickerModal={ShipCrewOptionsModal}
							options={modalOptions}
							setOptions={(opt) => setModalOptions(opt)}
							handleSelect={(crew) => onCrewPick(crew)}
						/>
						<div>
							<Button
								disabled={!crewStations[idx]}
								onClick={(e) => clearStation(idx)}>
								{t('ship.clear_station')}
							</Button>
						</div>
					</div>
				))}
			</div>

			{!!ship && <div>
				<Button disabled={crewStations.every(cs => !cs)} onClick={(e) => clearStation()}>{t('global.clear_all')}</Button>
			</div>}

			{!!ship && <ShipPresenter hover={false} ship={ship} showIcon={true} storeName='shipProfile' />}
		</div>

        </React.Fragment>
    )

    function renderBattleStation(bs: BattleStation, idx: number) {
		return (<div key={idx} style={{
			display: "flex",
			flexDirection: "column",
			justifyContent: "center",
			alignItems: "center"
		}}>
			<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${bs.skill}.png`} style={{ height: "32px", margin: '1em' }} />
			<div
				className="ui segment button"
				style={{
					margin: "2em",
					display: "flex",
					flexDirection: "row",
					width: "128px",
					height: "128px",
					padding: "1em",
					justifyContent: "center",
					alignItems: "center"
				}}>
				{crewStations[idx] && (
					<CrewTarget inputItem={crewStations[idx]} targetGroup={`${targetGroup || 'ship_profile'}`}>
						<img src={`${process.env.GATSBY_ASSETS_URL}${crewStations[idx]?.imageUrlPortrait}`} style={{ height: "128px" }} />
					</CrewTarget>
				) ||
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${bs.skill}.png`} style={{ height: "64px" }} />
				}
			</div>

		</div>)

	}


	function renderCrewCaption(crew: PlayerCrew | CrewMember) {
		return (
			<div style={{
				display: "flex",
				justifyContent: "center",
				flexDirection: "column",
				alignItems: "center"
			}}>
				<div>{crew.name}</div>
				<div style={{
					color: getActionColor(crew.action.bonus_type)
				}}>
					{t('ship.boosts_x_by_y', {
						x: CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type],
						y: `${crew.action.bonus_amount}`
					})}
				</div>
				<div style={{
					display: "flex",
					flexDirection: "row",
					justifyContent: "center",
					alignItems: "center"
				}}>
					<img style={{
						margin: "0.25em 0.25em 0.25em 0.25em",
						maxWidth: "2em",
						maxHeight: "1.5em"
					}}
						src={getShipBonusIcon(crew.action)}
					/>
					<span style={{ lineHeight: "1.3em" }}>
						{getShipBonus(t, crew.action, undefined, true)}
					</span>
				</div>
				<div>
					{crew.action.initial_cooldown}s {crew.action.duration}s {crew.action.cooldown}s
				</div>
			</div>)
	}


    function filterCrew(crew: (PlayerCrew | CrewMember)[], searchFilter?: string): (PlayerCrew | CrewMember)[] {
		const myFilter = searchFilter ??= '';
		const query = (input: string) => input.toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(myFilter.toLowerCase().replace(/[^a-z0-9]/g, '')) >= 0;

		let filteredcrew = crew.filter(crew => {
			return (!crewStations?.some((c) => {
				if (!c) return false;
				if (c?.id) {
					return c?.id === crew?.id;
				}
				else {
					return c?.symbol === crew?.symbol
				}
			}))
				&& (searchFilter === '' || (query(crew.name) || query(crew.short_name)))
				&& (!modalOptions?.rarities?.length || modalOptions?.rarities?.some((r) => crew.max_rarity === r))
				&& (!modalOptions?.abilities?.length || modalOptions?.abilities?.some((a) => crew.action.ability?.type.toString() === a));
		});

		filteredcrew.sort((a, b) => {
			let r = b.action.bonus_amount - a.action.bonus_amount;

			if (!r) {
				if (b.action.ability !== undefined && a.action.ability === undefined) return 1;
				else if (a.action.ability !== undefined && b.action.ability === undefined) return -1;

				if (a.action.ability?.amount && b.action.ability?.amount) {
					r = b.action.ability.amount - a.action.ability.amount;
				}
				if (r) return r;

				r = b.action.initial_cooldown - a.action.initial_cooldown;
				if (r) return r;

				if (!a.action.limit && b.action.limit) return -1;
				else if (!b.action.limit && a.action.limit) return 1;
			}

			return r;
		})
		return filteredcrew;
	}

	function onCrewPick(crew: PlayerCrew | CrewMember): void {
		if (!crewStations?.length || currentStation === undefined) return;
		let stations = [...crewStations];
		stations[currentStation] = crew as PlayerCrew;
		setCrewStations(stations);
		setCurrentStation(-1);
	}

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
		const all_ships = [...context.core.all_ships];
		let ships = mergeRefShips(all_ships, context.player.playerData?.player.character.ships ?? [], context.localized.SHIP_TRAIT_NAMES) ?? [];
		return [...ships];
	}

	function clickStation(index: number, skill: string) {
		const inputShip = ship;

		let newCrew: (PlayerCrew | CrewMember)[] = getCrew().filter((crew) => ignoreSkills || getSkills(crew).includes(skill)) ?? [];
		if (inputShip) newCrew = findPotentialCrew(inputShip, newCrew, false, undefined, boss?.id);

		setCurrentStation(index);
		setCurrentStationCrew(newCrew);
	}

	function clearStation(index?: number) {
		let stations = [...crewStations];
		if (index !== undefined) {
			stations[index] = undefined;
		}
		else {
			stations = stations.map(sta => undefined);
		}
		setCrewStations(stations);
		setCurrentStationCrew([]);
		setCurrentStation(undefined);
	}

    function navigateToShip(ship?: Ship) {
		setShip(ship);
        // if (!ship) return;
		// if (isOpponent) {
		// 	setShip(ship);
		// }
		// else {
		// 	let url = `/ship_info/?ship=${ship.symbol}`;
		// 	navigate(url);
		// 	setShip(ship);
		// }
    }
}
