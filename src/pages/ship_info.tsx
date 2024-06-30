import React, { Component } from 'react';
import { Icon, Message, Button, FormInput, Dropdown, Input } from 'semantic-ui-react';

import { findPotentialCrew, mergeShips } from '../utils/shiputils';
import { Ship, ShipWorkerConfig, ShipWorkerItem } from '../model/ship';
import { PlayerCrew } from '../model/player';
import CONFIG from '../components/CONFIG';
import { CrewMember } from '../model/crew';
import { ShipPresenter } from '../components/item_presenters/ship_presenter';
import { GlobalContext } from '../context/globalcontext';
import { navigate } from 'gatsby';
import { ModalOption, OptionGroup, OptionsBase, OptionsModal, OptionsModalProps } from '../components/base/optionsmodal_base';
import { ShipAbilityPicker } from '../components/crewtables/shipoptions';
import CrewPicker from '../components/crewpicker';
import { crewCopy, getShipBonus, getSkills } from '../utils/crewutils';
import { CrewHoverStat, CrewTarget } from '../components/hovering/crewhoverstat';
import { getActionColor, getShipBonusIcon } from '../components/item_presenters/shipskill';
import DataPageLayout from '../components/page/datapagelayout';
import { WorkerProvider } from '../context/workercontext';
import { UnifiedWorker } from '../typings/worker';
import { DEFAULT_MOBILE_WIDTH } from '../components/hovering/hoverstat';
import { ShipRosterCalc } from '../components/ship/rostercalc';

const isWindow = typeof window !== 'undefined';

type ShipProfileProps = {
    ship?: string;
};

type ShipProfileState = {
	ships?: Ship[];
	originals: Ship[];
	activeShip?: Ship | null;
	inputShip?: Ship | null;
	currentStationCrew: (PlayerCrew | CrewMember)[];
	currentStation: number;
	modalOptions: ShipCrewModalOptions;
	crewStations: (PlayerCrew | undefined)[];
	modalOpen: boolean;
	hoverItem?: PlayerCrew | CrewMember;
	considerFrozen: boolean;
	considerUnowned: boolean;
};

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

const ShipInfoPage = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized 	

	return <DataPageLayout pageTitle={t('pages.ship_info')} demands={['ship_schematics', 'battle_stations']}>
		<ShipProfile />
	</DataPageLayout>
	
}

class ShipProfile extends Component<ShipProfileProps, ShipProfileState> {
	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;
	
	private _hasPlayer = false;

	constructor(props: ShipProfileProps) {
		super(props);
		
		this.state = {
			ships: this.loadData(),
			originals: [],
			currentStationCrew: [],
			modalOptions: DEFAULT_SHIP_OPTIONS,
			crewStations: [],
			currentStation: 0,
			modalOpen: false,
			considerFrozen: false,
			considerUnowned: false
		};

		const me = this;
	}

	private readonly getCrew = () => {
		if (!this.context) return [];
		let frozen = this.state.considerFrozen;
		let results = this.context.player.playerData?.player.character.crew.filter(crew => frozen || crew.immortal <= 0) ?? this.context.core.crew;
		if (this.state.considerUnowned && this.context?.player?.playerData) {
			results = results.concat(this.context.player.playerData.player.character.unOwnedCrew ?? []);
		}
		return results;
	}

	private readonly setCrewStations = (crewStations: (PlayerCrew | undefined)[]) => {
		this.setState({...this.state, crewStations });
		setTimeout(() => this.setActiveShip());
	}

	private readonly setModalOpen = (value: boolean) => {
		if (this.state.modalOpen !== value) {
			this.setState({ ... this.state, modalOpen: value });
		}
	}

	private onCrewPick(crew: PlayerCrew | CrewMember): void {
		let stations = [ ... this.state.crewStations ];
		stations[this.state.currentStation] = crew as PlayerCrew;
		this.setState({ ... this.state, crewStations: stations, modalOpen: false, currentStationCrew: [], currentStation: -1 });
		setTimeout(() => this.setActiveShip());
	}

	private clearStation(index?: number) {
		let stations = [ ... this.state.crewStations ];
		if (index !== undefined) {
			stations[index] = undefined;
		}
		else {
			stations = stations.map(sta => undefined);
		}		
		this.setState({ ... this.state, crewStations: stations, modalOpen: false, currentStationCrew: [], currentStation: -1 });
		setTimeout(() => this.setActiveShip());
	}

	private clickStation(index: number, skill: string) {
		const { inputShip } = this.state;

		let newCrew: (PlayerCrew | CrewMember)[] = this.getCrew().filter((crew) => getSkills(crew).includes(skill)) ?? [];
		if (inputShip) newCrew = findPotentialCrew(inputShip, newCrew, false);
		this.setState({ ... this.state, modalOpen: true, currentStationCrew: newCrew, currentStation: index });
	}

	private setConsiderFrozen = (value: boolean) => {
		this.setState({ ...this.state, considerFrozen: value });
	}

	private setConsiderUnowned = (value: boolean) => {
		this.setState({ ...this.state, considerUnowned: value });
	}

	private setOptions(options: ShipCrewModalOptions) {
		this.setState({ ... this.state, modalOptions: options });
	}

	private readonly filterCrew = (crew: (PlayerCrew | CrewMember)[], searchFilter?: string): (PlayerCrew | CrewMember)[] => {
		const { crewStations } = this.state;

		const myFilter = searchFilter ??= '';
		const query = (input: string) => input.toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(myFilter.toLowerCase().replace(/[^a-z0-9]/g, '')) >= 0;


		let ships = crew.filter(crew => {
			return (!crewStations.some((c) => {
					if (!c) return false;
					if (c?.id) {
						return c?.id === crew?.id;
					}
					else {
						return c?.symbol === crew?.symbol
					}
				}))
				&& (searchFilter === '' || (query(crew.name) || query(crew.short_name)))
				&& (!this.state?.modalOptions?.rarities?.length || this.state?.modalOptions?.rarities?.some((r) => crew.max_rarity === r))
				&& (!this.state?.modalOptions?.abilities?.length || this.state?.modalOptions?.abilities?.some((a) => crew.action.ability?.type.toString() === a));
		});

		ships.sort((a, b) => {
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
		return ships;
	}

	private readonly setActiveShip = () => {
		const { crewStations, inputShip: ship } = this.state;

		if (!ship || !crewStations?.length) return;

		for (let action of ship.actions ?? []) {
			action.source = ship.name;
		}

		let newship = JSON.parse(JSON.stringify(ship)) as Ship;

		for (let crew of crewStations) {
			if (crew === undefined) continue;
			newship.crit_bonus ??= 0;
			newship.crit_bonus += crew.ship_battle.crit_bonus ?? 0;

			newship.crit_chance ??= 0;
			newship.crit_chance += crew.ship_battle.crit_chance ?? 0;

			newship.evasion ??= 0;
			newship.evasion += crew.ship_battle.evasion ?? 0;


			newship.accuracy ??= 0;
			newship.accuracy += crew.ship_battle.accuracy ?? 0;

			newship.actions ??= [];
			crew.action.source = crew.name;
			newship.actions.push(crew.action);
		}

		this.setState({ ... this.state, activeShip: newship });
	}
	
	private readonly loadData = () => {
		if (!this.context) return [];
		return this.context?.player?.playerShips ?? mergeShips(this.context.core.ship_schematics, []) ?? [];
	}

	componentDidMount(): void {
		let newHasPlayer = !!this.context?.player?.playerData;		
		if (!this.context) return;
		if (!this.state?.ships?.length || this._hasPlayer !== newHasPlayer) {			
			this._hasPlayer = newHasPlayer;
			this.setState({ ...this.state, ships: this.loadData() });
		}
	}

	componentDidUpdate() {
		let newHasPlayer = !!this.context?.player?.playerData;		
		if (this._hasPlayer === newHasPlayer && this.state.inputShip) return;
		this._hasPlayer = newHasPlayer;

		let ship_key: string | undefined = this.props.ship;

        if (!ship_key) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('ship')) {
                ship_key = urlParams.get('ship') ?? undefined;
            }
        }

		if (!ship_key) {
			navigate('/ships');
		}

		if (!this.context) return;

		const ships = this.loadData();
		const ship = ships.find(d => d.symbol === ship_key);

		if (ship) {
			if (ship !== this.state.activeShip) {
				let n = [] as (PlayerCrew | undefined)[];
				for (let i = 0; i < (ship.battle_stations?.length ?? 0); i++){
					n.push(undefined);
				}
	
				this.setState({ ... this.state, inputShip: ship, crewStations: n, ships, originals: this.context.core.ships ?? []});
				if (isWindow) window.setTimeout(() => this.setActiveShip());				
			}
		}
	}

	render() {
		const { t } = this.context.localized;
    	const { considerFrozen, ships, currentStationCrew, crewStations, modalOptions, modalOpen, activeShip, hoverItem } = this.state;
        let ship_key: string | undefined = this.props.ship;

        if (!ship_key) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('ship')) {
                ship_key = urlParams.get('ship') ?? undefined;
            }
        }
		if (isWindow && window.location.href.includes("ship")) {
			if (!ship_key || !ships) {
				navigate('/ships');
			}
		}

		const renderCrewCaption = (crew: PlayerCrew | CrewMember) => {
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
					<span style={{ lineHeight: "1.3em"}}>
						{getShipBonus(crew.action, undefined, true)}
					</span>
				</div>
			</div>)
		}

        const ship = ships?.find(d => d.symbol === ship_key);
        if (!ship) {			
			return <></>;
		}
		
		const crew = this.getCrew();
		
		return (<>
			<div>
			<CrewPicker
					renderCrewCaption={renderCrewCaption}
					isOpen={modalOpen}
					setIsOpen={this.setModalOpen}
					filterCrew={this.filterCrew}
					renderTrigger={() => <div></div>}
					crewList={currentStationCrew}
					defaultOptions={DEFAULT_SHIP_OPTIONS}
					pickerModal={ShipCrewOptionsModal}
					options={modalOptions}
					setOptions={(opt) => this.setOptions(opt)}
					handleSelect={(crew) => this.onCrewPick(crew)}
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


				<Message icon warning>
					<Icon name="exclamation triangle" />
					<Message.Content>
						<Message.Header>{t('global.work_in_progress.title')}</Message.Header>
							{t('global.work_in_progress.heading')}
						</Message.Content>
					</Message>

				<WorkerProvider>
					<ShipRosterCalc 
						pageId={'shipInfo'}
						crew={crew} 
						ships={[ship]} 
						crewStations={crewStations} 
						setCrewStations={this.setCrewStations} 
						considerFrozen={this.state.considerFrozen}
						considerUnowned={this.state.considerUnowned}
						setConsiderFrozen={this.setConsiderFrozen}
						setConsiderUnowned={this.setConsiderUnowned}
						/>
				</WorkerProvider>

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
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${bs.skill}.png`} style={{ height: "32px", margin: '1em'}} />
						<div
							onClick={(e) => this.clickStation(idx, bs.skill)}
							className="ui segment button"
							style={{
								margin: "2em",
								display: "flex",
								flexDirection: "row",
								width: "128px",
								height: "128px",
								padding: "1em",
								justifyContent: "center",
								alignItems: "center"}}>
							{crewStations[idx] && (
								<CrewTarget inputItem={crewStations[idx]}  targetGroup='ship_profile'>
								<img src={`${process.env.GATSBY_ASSETS_URL}${crewStations[idx]?.imageUrlPortrait}`} style={{ height: "128px"}} />
								</CrewTarget>
							) ||
								<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${bs.skill}.png`} style={{ height: "64px"}} />
							}
						</div>
						<div>
							<Button disabled={!crewStations[idx]} onClick={(e) => this.clearStation(idx)}>{t('ship.clear_station')}</Button>
						</div>
					</div>
					))}
				</div>

				<div>
					<Button disabled={crewStations.every(cs => !cs)} onClick={(e) => this.clearStation()}>{t('global.clear_all')}</Button>
				</div>

                <ShipPresenter hover={false} ship={activeShip ?? ship} showIcon={true} storeName='shipProfile' />

            </div>
			</>);
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
		let opt = { ... this.state.options }  as ShipCrewModalOptions;

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
				return  { key: `${i}*`, value: i, text: `${i}* ${r.name}` }
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
				renderContent: () => <div style={{margin: "0.5em 0px"}}>
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
