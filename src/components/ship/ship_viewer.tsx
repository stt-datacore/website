import React from 'react';

import { CrewMember } from '../../model/crew';
import { PlayerCrew } from '../../model/player';
import { Ship, SelectedShipConfig } from '../../model/ship';
import { navigate } from 'gatsby';
import { Button } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';
import { getShipBonus, getSkills } from '../../utils/crewutils';
import { setupShip, mergeShips, findPotentialCrew } from '../../utils/shiputils';
import { useStateWithStorage } from '../../utils/storage';
import CONFIG from '../CONFIG';
import CrewPicker from '../crewpicker';
import { CrewHoverStat, CrewTarget } from '../hovering/crewhoverstat';
import { ShipPresenter } from '../item_presenters/ship_presenter';
import { getActionColor, getShipBonusIcon } from '../item_presenters/shipskill';
import { DEFAULT_SHIP_OPTIONS, ShipCrewOptionsModal } from './ship_crew_modal';

export interface ShipViewerProps {
    crewTargetGroup?: string;
    inputShip: Ship;
    considerFrozen: boolean;
    considerUnowned: boolean;
    ignoreSkills: boolean;
    shipConfig?: SelectedShipConfig;
    setShipConfig: (value?: SelectedShipConfig) => void;
}

export const ShipViewer = (props: ShipViewerProps) => {
    const context = React.useContext(GlobalContext);
	const { t } = context.localized;
	const { inputShip, considerFrozen, considerUnowned, ignoreSkills, setShipConfig, shipConfig } = props;
	const { playerShips, playerData } = context.player;
	const { crew: coreCrew } = context.core;
	const [ships, setShips] = React.useState<Ship[]>(loadShips());

	const [ship, setShip] = React.useState<Ship>();
	const [crew, setCrew] = React.useState<(PlayerCrew | CrewMember)[] | undefined>(undefined);
	const [crewStations, setCrewStations] = React.useState<(PlayerCrew | CrewMember | undefined)[]>([]);

	const [currentStation, setCurrentStation] = React.useState<number | undefined>(undefined);
	const [currentStationCrew, setCurrentStationCrew] = React.useState<(PlayerCrew | CrewMember)[]>([]);
	const [modalOptions, setModalOptions] = useStateWithStorage('ship_info/modalOptions', DEFAULT_SHIP_OPTIONS);
	const [modalOpen, setModalOpen] = React.useState<boolean>(false);

    const [crewTarget, customTarget] = configCrewTarget();

	React.useEffect(() => {
		if (inputShip && crewStations?.length && inputShip.battle_stations?.length === crewStations.length) {
			setShip(setupShip(inputShip, crewStations) || JSON.parse(JSON.stringify(inputShip)));
		}
		else if (inputShip && crewStations?.length !== inputShip.battle_stations?.length) {
			setCrewStations(inputShip.battle_stations?.map(b => undefined as PlayerCrew | CrewMember | undefined) ?? []);
		}
	}, [crewStations, inputShip]);

    React.useEffect(() => {
        if (!!ship && crewStations?.every(cs => !!cs)) {
            setShipConfig({
                ship,
                crewStations
            });
        }
        else if (shipConfig !== undefined) {
            setShipConfig(undefined);
        }
    }, [crewStations, ship]);

	React.useEffect(() => {
		setShips(loadShips());
	}, [playerShips]);

	React.useEffect(() => {
		setCrew(getCrew());
	}, [playerData, coreCrew, considerFrozen, considerUnowned])

	if (!ship || !crew) return <>{t('global.no_data')}</>;

	return (<>
		<div>
			<CrewPicker
				renderCrewCaption={renderCrewCaption}
				isOpen={modalOpen}
				setIsOpen={setModalOpen}
				filterCrew={filterCrew}
				renderTrigger={() => <div></div>}
				crewList={currentStationCrew}
				defaultOptions={DEFAULT_SHIP_OPTIONS}
				pickerModal={ShipCrewOptionsModal}
				options={modalOptions}
				setOptions={(opt) => setModalOptions(opt)}
				handleSelect={(crew) => onCrewPick(crew)}
			/>

		</div>

        {!customTarget &&
		    <CrewHoverStat targetGroup={crewTarget} />}

		<div style={{
			display: "flex",
			width: "100%",
			fontSize: "12pt",
			flexDirection: "column",
			justifyContent: "center",
			alignItems: "center"
		}}>
			<h3>{t('ship.battle_stations')}</h3>

			<div style={{
				display: "flex",
				flexDirection: "row",
				justifyContent: "center",
				alignItems: "center",
				padding: 0,
				marginBottom: '2em'
			}}>
				{ship.battle_stations?.map((bs, idx) => (
					<div key={idx} style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center"
					}}>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${bs.skill}.png`} style={{ height: "32px", margin: '1em' }} />
						<div
							onClick={(e) => clickStation(idx, bs.skill)}
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
								<CrewTarget inputItem={crewStations[idx]} targetGroup={crewTarget}>
									<img src={`${process.env.GATSBY_ASSETS_URL}${crewStations[idx]?.imageUrlPortrait}`} style={{ height: "128px" }} />
								</CrewTarget>
							) ||
								<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${bs.skill}.png`} style={{ height: "64px" }} />
							}
						</div>
						<div>
							<Button disabled={!crewStations[idx]} onClick={(e) => clearStation(idx)}>{t('ship.clear_station')}</Button>
						</div>
					</div>
				))}
			</div>

			<div>
				<Button disabled={crewStations.every(cs => !cs)} onClick={(e) => clearStation()}>{t('global.clear_all')}</Button>
			</div>

			<ShipPresenter hover={false} ship={ship ?? inputShip} showIcon={true} storeName='shipProfile' />
		</div>

	</>)

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
		return [...results];
	}

	function loadShips() {
		if (!context) return [];
		let ships = context?.player?.playerShips ?? mergeShips(context.core.ship_schematics, []) ?? [];
		return [...ships];
	}

	function clickStation(index: number, skill: string) {
		const inputShip = ship;

		let newCrew: (PlayerCrew | CrewMember)[] = getCrew().filter((crew) => ignoreSkills || getSkills(crew).includes(skill)) ?? [];
		if (inputShip) newCrew = findPotentialCrew(inputShip, newCrew, false);
		setModalOpen(true);
		setCurrentStationCrew(newCrew);
		setCurrentStation(index);
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
		setModalOpen(false);
		setCurrentStationCrew([]);
		setCurrentStation(undefined);
	}

    function configCrewTarget(): [string, boolean] {
        if (props.crewTargetGroup) {
            return [props.crewTargetGroup, true];
        }
        else {
            return ['ship_crew_target', false];
        }
    }

}