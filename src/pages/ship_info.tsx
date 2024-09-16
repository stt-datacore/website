import React from 'react';
import { Icon, Message, Button } from 'semantic-ui-react';

import { findPotentialCrew, mergeShips, setupShip } from '../utils/shiputils';
import { Ship } from '../model/ship';
import { PlayerCrew } from '../model/player';
import CONFIG from '../components/CONFIG';
import { CrewMember } from '../model/crew';
import { ShipPresenter } from '../components/item_presenters/ship_presenter';
import { GlobalContext } from '../context/globalcontext';
import { navigate } from 'gatsby';
import { ModalOption, OptionGroup, OptionsBase, OptionsModal, OptionsModalProps } from '../components/base/optionsmodal_base';
import { ShipAbilityPicker } from '../components/crewtables/shipoptions';
import CrewPicker from '../components/crewpicker';
import { getShipBonus, getSkills } from '../utils/crewutils';
import { CrewHoverStat, CrewTarget } from '../components/hovering/crewhoverstat';
import { getActionColor, getShipBonusIcon } from '../components/item_presenters/shipskill';
import DataPageLayout from '../components/page/datapagelayout';
import { WorkerProvider } from '../context/workercontext';
import { ShipRosterCalc } from '../components/ship/rostercalc';
import { useStateWithStorage } from '../utils/storage';
import { ShipMultiWorker } from '../components/ship/shipmultiworker';

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

	const [currentStation, setCurrentStation] = React.useState<number | undefined>(undefined);
	const [currentStationCrew, setCurrentStationCrew] = React.useState<(PlayerCrew | CrewMember)[]>([]);
	const [modalOptions, setModalOptions] = useStateWithStorage('ship_info/modalOptions', DEFAULT_SHIP_OPTIONS);
	const [modalOpen, setModalOpen] = React.useState<boolean>(false);

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

	if (!ship || !crew) return context.core.spin(t('spinners.default'));

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

		<CrewHoverStat targetGroup='ship_profile' />
		<div style={{
			display: "flex",
			width: "100%",
			fontSize: "12pt",
			flexDirection: "column",
			justifyContent: "center",
			alignItems: "center"
		}}>
			{/* <Message icon warning>
				<Icon name="exclamation triangle" />
				<Message.Content>
					<Message.Header>{t('global.work_in_progress.title')}</Message.Header>
					{t('global.work_in_progress.heading')}
				</Message.Content>
			</Message> */}

			{!!inputShip && <WorkerProvider>
				<ShipMultiWorker>
					<ShipRosterCalc
						pageId={'shipInfo'}
						crew={crew}
						onlyImmortal={onlyImmortal}
						setOnlyImmortal={setOnlyImmortal}
						ships={[inputShip]}
						crewStations={crewStations}
						setCrewStations={setCrewStations}
						considerFrozen={considerFrozen}
						considerUnowned={considerUnowned}
						ignoreSkills={ignoreSkills}
						setConsiderFrozen={setConsiderFrozen}
						setConsiderUnowned={setConsiderUnowned}
						setIgnoreSkills={setIgnoreSkills}
					/>
				</ShipMultiWorker>
			</WorkerProvider>}

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
								<CrewTarget inputItem={crewStations[idx]} targetGroup='ship_profile'>
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
		if (onlyImmortal) {
			results = results.filter(f => !("immortal" in f) || !!f.immortal);
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

		setCurrentStation(index);
		setCurrentStationCrew(newCrew);
		setModalOpen(true);
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

}

export interface ShipCrewModalOptions extends OptionsBase {
	rarities: number[];
	abilities: string[];
}

export const DEFAULT_SHIP_OPTIONS = {
	rarities: [],
	abilities: [],
} as ShipCrewModalOptions;

export class ShipCrewOptionsModal extends OptionsModal<ShipCrewModalOptions> {
	protected setAbility(abilities: string[]) {
		let opt = { ... this.state.options } as ShipCrewModalOptions;

		if (!('abilities' in opt) || (JSON.stringify(opt['abilities']) != JSON.stringify(abilities))) {
			opt.abilities = abilities;
			this.setState({ ... this.state, options: opt });
		}
	}

	protected getOptionGroups(): OptionGroup[] {
		const abilityOptions = [] as ModalOption[];
		const { t } = this.context.localized;

		const rarityOptions =
			CONFIG.RARITIES.map((r, i) => {
				if (i === 0) return undefined;
				return { key: `${i}*`, value: i, text: `${i}* ${r.name}` }
			}).filter(f => f !== undefined) as ModalOption[];

		Object.keys(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT).forEach((key, idx) => {
			if (idx >= 9) return;
			abilityOptions.push({
				key: key,
				value: key,
				text: CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[key]
			});
		});

		return [
			{
				title: `${t('hints.filter_by_rarity')}:`,
				key: "rarities",
				multi: true,
				options: rarityOptions,
				initialValue: [] as number[]
			},
			{
				title: `${t('hints.filter_by_ship_ability')}:`,
				key: 'abilities',
				options: abilityOptions,
				multi: false,
				initialValue: [] as number[],
				renderContent: () => <div style={{ margin: "0.5em 0px" }}>
					<ShipAbilityPicker fluid selectedAbilities={this.state.options['abilities'] as string[]} setSelectedAbilities={(a) => this.setAbility(a)} />
				</div>

			}]
	}

	protected getDefaultOptions(): ShipCrewModalOptions {
		return DEFAULT_SHIP_OPTIONS;
	}

	constructor(props: OptionsModalProps<ShipCrewModalOptions>) {
		super(props);

		this.state = {
			isDefault: false,
			isDirty: false,
			options: props.options ?? {},
			modalIsOpen: false,
		}
	}

	protected checkState(): boolean {
		const { options } = this.state;

		const j1 = JSON.stringify(options);
		const j2 = JSON.stringify(this.props.options);
		const j3 = JSON.stringify(this.getDefaultOptions());

		const isDirty = j2 !== j1;
		const isDefault = j1 === j3;

		if (this.state.isDefault != isDefault || this.state.isDirty != isDirty) {
			this.setState({ ... this.state, isDefault, isDirty });
			return true;
		}

		return false;
	}


};


export default ShipInfoPage;
