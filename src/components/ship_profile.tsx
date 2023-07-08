import React, { Component } from 'react';
import { Table, Icon, Pagination, Dropdown, Message, Button } from 'semantic-ui-react';

import { findPotentialCrew, mergeShips } from '../utils/shiputils';
import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';
import { Ship, Schematics, Ability, ShipBonus } from '../model/ship';
import { PlayerCrew, PlayerData } from '../model/player';
import CONFIG from './CONFIG';
import { ShipHoverStat, ShipTarget } from './hovering/shiphoverstat';
import { CrewMember } from '../model/crew';
import { ShipPresenter } from './item_presenters/ship_presenter';
import { MergedContext } from '../context/mergedcontext';
import { navigate } from 'gatsby';
import { ModalOption, OptionGroup, OptionsBase, OptionsModal, OptionsModalProps, OptionsModalState } from './base/optionsmodal_base';
import { BeholdOptionsModal } from '../pages/behold';
import { ShipAbilityPicker } from './crewtables/shipoptions';
import CrewPicker from './crewpicker';
import { getSkills } from '../utils/crewutils';

type ShipProfileProps = {
    ship?: string;
};

type ShipProfileState = {
	data: Ship[];
	originals: Ship[];
	activeShip?: Ship | null;
	currentStationCrew: PlayerCrew[];
	currentStation: number;
	modalOptions: ShipCrewModalOptions;
	crewStations: (PlayerCrew | undefined)[];
	modalOpen: boolean;	
};

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

class ShipProfile extends Component<ShipProfileProps, ShipProfileState> {
	static contextType = MergedContext;
	context!: React.ContextType<typeof MergedContext>;

	constructor(props: ShipProfileProps) {
		super(props);

		this.state = {
			data: [],
			originals: [],
			currentStationCrew: [],
			modalOptions: DEFAULT_SHIP_OPTIONS,
			crewStations: [],
			currentStation: 0,
			modalOpen: false
		};
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
	}

	private clearStation(index: number) {
		let stations = [ ... this.state.crewStations ];
		stations[index] = undefined;

		this.setState({ ... this.state, crewStations: stations, modalOpen: false, currentStationCrew: [], currentStation: -1 });
	}

	private clickStation(index: number, skill: string) {

		let newCrew = this.context.playerData.player.character.crew.filter((crew) => getSkills(crew).includes(skill));

		this.setState({ ... this.state, modalOpen: true, currentStationCrew: newCrew, currentStation: index });
	}

	private setOptions(options: ShipCrewModalOptions) {
		this.setState({ ... this.state, modalOptions: options });
	}

	private readonly filterCrew = (crew: (PlayerCrew | CrewMember)[], searchFilter?: string): (PlayerCrew | CrewMember)[] => {
		
		const myFilter = searchFilter ??= '';
		const query = (input: string) => input.toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(myFilter.toLowerCase().replace(/[^a-z0-9]/g, '')) >= 0;
		let data = crew.filter(crew =>
			true
				&& (searchFilter === '' || (query(crew.name) || query(crew.short_name)))
				&& (!this.state.modalOptions.rarities?.length || this.state.modalOptions.rarities.some((r) => crew.max_rarity === r))
				&& (!this.state.modalOptions.abilities?.length || this.state.modalOptions.abilities.some((a) => crew.action.ability?.type.toString() === a))
		);

		return data;
	}

	componentDidMount() {
		let ship_key: string | undefined = this.props.ship;

        if (!ship_key) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('ship')) {
                ship_key = urlParams.get('ship') ?? undefined;
            }
        }
		if (window.location.href.includes("ship")) {
			if (!ship_key || !this.context.playerShips) {
				navigate('/playertools?tool=ships');
			}		
		}
        
		const ship = this.context.playerShips?.find(d => d.symbol === ship_key);

		if (ship) {
			if (ship !== this.state.activeShip) {
				let n = [] as (PlayerCrew | undefined)[];
				for (let i = 0; i < (ship.battle_stations?.length ?? 0); i++){
					n.push(undefined);
				}
	
				this.setState({ ... this.state, activeShip: ship, crewStations: n, data: this.context.playerShips ?? [], originals: this.context.allShips ?? []});
			}
		}
	}

	render() {
    	const { data, currentStationCrew, crewStations, modalOptions, modalOpen, activeShip } = this.state;
        let ship_key: string | undefined = this.props.ship;

        if (!ship_key) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('ship')) {
                ship_key = urlParams.get('ship') ?? undefined;
            }
        }
		if (window.location.href.includes("ship")) {
			if (!ship_key || !data) {
				navigate('/playertools?tool=ships');
			}		
		}
        const ship = data.find(d => d.symbol === ship_key);
        if (!ship) return <></>

		return (<>
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
						<Message.Header>Work in progress!</Message.Header>
							This section is under development and not fully functional yet.
						</Message.Content>
					</Message>

                <ShipPresenter hover={false} ship={activeShip ?? ship} storeName='shipProfile' />

				<h3>Battle Stations</h3>
				<div style={{
					display: "flex",
					flexDirection: "row",
					justifyContent: "center",
					alignItems: "center",
					padding: 0
				}}>
					{ship.battle_stations?.map((bs, idx) => (
						<div>
						<div key={idx} 
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
								<img src={`${process.env.GATSBY_ASSETS_URL}${crewStations[idx]?.imageUrlPortrait}`} style={{ height: "64px"}} />
							) ||
								<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${bs.skill}.png`} style={{ height: "64px"}} />
							}
						</div>
						<div>
							{crewStations[idx] && (
							<Button onClick={(e) => this.clearStation(idx)}>Clear Station</Button>
							)}
						</div>
					</div>
					))}
				</div>

				<CrewPicker 
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

		Object.keys(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT).map((key, idx) => {
			if (idx >= 9) return;
			abilityOptions.push({
				key: key,
				value: key,				
				text: CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[key]
			});
		});

		return [
			{
                title: "Filter by rarity:",
                key: "rarities",
                multi: true,
                options: ShipCrewOptionsModal.rarityOptions,
				initialValue: [] as number[]
            },
            {
                title: "Filter by ship ability:",
                key: 'abilities',
                options: abilityOptions,
                multi: false,
				initialValue: [] as number[],
				renderContent: () => <div style={{margin: "0.25em 0px"}}>
					<ShipAbilityPicker selectedAbilities={this.state.options['abilities'] as string[]} setSelectedAbilities={(a) => this.setAbility(a)} />
					</div>
				
            }]
    }

    protected getDefaultOptions(): ShipCrewModalOptions {
        return DEFAULT_SHIP_OPTIONS;
    }

	static readonly rarityOptions = [
		{ key: '1*', value: 1, text: '1* Common' },
		{ key: '2*', value: 2, text: '2* Uncommon' },
		{ key: '3*', value: 3, text: '3* Rare' },
		{ key: '4*', value: 4, text: '4* Super Rare' },
		{ key: '5*', value: 5, text: '5* Legendary' }
	];

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


export default ShipProfile;
