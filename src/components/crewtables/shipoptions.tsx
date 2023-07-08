import React, { useEffect } from "react";
import { Form, Dropdown, Rating, Menu, MenuItemProps } from "semantic-ui-react";
import { PlayerData } from "../../model/player";
import { Ship, Schematics } from "../../model/ship";
import { DropDownItem } from "../../utils/misc";
import { ShipPickerFilter, mergeShips, filterBy } from "../../utils/shiputils";
import CONFIG from "../CONFIG";
import { getIconByKey } from "../item_presenters/shipskill";
import { ShipSkillRanking } from "../../utils/crewutils";

export type AbilityUsesProps = {    
    uses: number[];
    zeroText?: string;
	selectedUses: number[];
	setSelectedUses: (rarityFilter: number[]) => void;
	altTitle?: string;
};

export const AbilityUses = (props: AbilityUsesProps) => {
	const zeroText = props.zeroText ?? "Unlimited";
    const abilityUsesOptions = props.uses.map((u) => {
        return {
            key: u ? `${u}x` : zeroText,
            text: u ? `${u}x` : zeroText,
            value: u
        }
    })
    
    // [
	// 	{ key: '1*', value: 1, text: '1* Common' },
	// 	{ key: '2*', value: 2, text: '2* Uncommon' },
	// 	{ key: '3*', value: 3, text: '3* Rare' },
	// 	{ key: '4*', value: 4, text: '4* Super Rare' },
	// 	{ key: '5*', value: 5, text: '5* Legendary' }
	// ];

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? 'Battle uses'} 
				clearable
				multiple
				selection
				options={abilityUsesOptions}
				value={props.selectedUses}
				onChange={(e, { value }) => props.setSelectedUses(value as number[])}
				closeOnChange
			/>
		</Form.Field>
	);
};


export type ShipPickerProps = {
	filter?: ShipPickerFilter;
    playerData?: PlayerData;
	pool?: Ship[];
    selectedShip?: Ship;
    setSelectedShip: (ship: Ship | undefined) => void | React.Dispatch<React.SetStateAction<Ship | undefined>>;
};

export const ShipPicker = (props: ShipPickerProps) => {
	const { selectedShip, setSelectedShip, filter } = props;
	
	enum OptionsState {
		Uninitialized,
		Initializing,
		Initialized,
	};

    const [availableShips, setAvailableShips] = React.useState<Ship[] | undefined>(props.pool);
    const [filteredShips, setFilteredShips] = React.useState<Ship[] | undefined>(props.pool);
	const [selection, setSelection] = React.useState(selectedShip?.symbol);
	const [options, setOptions] = React.useState({
		state: OptionsState.Uninitialized,
		list: [] as DropDownItem[] 
	});

	if (!availableShips || availableShips.length === 0) {
        if (!props.playerData) return <></>;        
        let pd = props.playerData;

        fetch('/structured/ship_schematics.json')
            .then(response => response.json())
            .then((ship_schematics: Schematics[]) => {
                let data = mergeShips(ship_schematics, pd.player.character.ships);
                setAvailableShips(data);
            });
    }

	const placeholder = options.state === OptionsState.Initializing ? 'Loading. Please wait...' : 'Select Ship';

    React.useEffect(() => {
        setShip();
    }, [selection, filteredShips]);

    React.useEffect(() => {
        populateOptions();
    }, [filteredShips]);

    React.useEffect(() => {
        if (availableShips && filter) {			
			setFilteredShips(filterBy(availableShips, filter));			
		}
		else {
			setFilteredShips(availableShips);
		}
    }, [availableShips, filter]);
	
	return (
		<React.Fragment>
			<Dropdown 
                search 
                selection 
                clearable                
                fluid
				placeholder={placeholder}
				options={options.list}                
				value={selection}				
				onFocus={() => { if (options.state === OptionsState.Uninitialized) populateOptions(); }}
				onChange={(e, { value }) => setSelection(value as string | undefined)}
			/>
		</React.Fragment>
	);

	function populateOptions(): void {
		setOptions({
			state: OptionsState.Initializing,
			list: []
		});
		// Populate inside a timeout so that UI can update with a "Loading" placeholder first
		setTimeout(() => {            
			const populatePromise = new Promise<DropDownItem[] | undefined>((resolve, reject) => {
				const poolList = filteredShips?.map((c) => (
					{
						key: c.symbol,
						value: c.symbol,
						image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.icon?.file.slice(1).replace('/', '_')}.png` },
						text: c.name,
                        title: CONFIG.RARITIES[c.rarity].name + ` Ship / Attack ${c.attack.toLocaleString()} / Shields ${c.shields.toLocaleString()} / Hull ${c.hull.toLocaleString()}`
					} as DropDownItem
				));
				resolve(poolList);
			});
			populatePromise.then((poolList) => {
				setOptions({
					state: OptionsState.Initialized,
					list: poolList ?? []
				});
			});
		}, 0);
	}

	function setShip(): void {
		if (selection == '')  {
			setSelectedShip(undefined);
			return;
		}
		let valid = filteredShips?.find((c) => c.symbol == selection);
		if (valid) {
			setSelectedShip(valid);
		}
        else {
            setSelectedShip(undefined);
        }		
	}
};
export type ShipAbilityPickerProps = {
    playerData?: PlayerData;
    availableAbilities?: string[];
    selectedAbilities: string[];
    setSelectedAbilities: (ability: string[]) => void | React.Dispatch<React.SetStateAction<string[]>>;
};

export const ShipAbilityPicker = (props: ShipAbilityPickerProps) => {
	const { selectedAbilities, setSelectedAbilities } = props;
    const availableAbilities = props.availableAbilities && props.availableAbilities.length ? props.availableAbilities : Object.keys(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE);

	enum OptionsState {
		Uninitialized,
		Initializing,
		Initialized,
	};

	const [selection, setSelection] = React.useState(selectedAbilities.map(a => a.toString()));
	const [options, setOptions] = React.useState({
		state: OptionsState.Uninitialized,
		list: [] as DropDownItem[]
	});

	const placeholder = options.state === OptionsState.Initializing ? 'Loading. Please wait...' : 'Select Ship Abilities';
	

    React.useEffect(() => {
        setSelectedAbilities(selection);
    }, [selection]);

	return (
		<React.Fragment>
			<Dropdown 
                search 
                selection 
                clearable                
                fluid
                multiple
				placeholder={placeholder}
				options={options.list}                
				value={selection}				
				onFocus={() => { if (options.state === OptionsState.Uninitialized) populateOptions(); }}
				onChange={(e, { value }) => setSelection(value as string[])}
			/>
		</React.Fragment>
	);

	function populateOptions(): void {
		setOptions({
			state: OptionsState.Initializing,
			list: []
		});
		// Populate inside a timeout so that UI can update with a "Loading" placeholder first
		setTimeout(() => {            
			const populatePromise = new Promise<DropDownItem[]>((resolve, reject) => {
				const poolList = availableAbilities?.map((c) => (
					{
						key: c,
						value: c,
						content: (<>
							<div style={{
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
								
							}}>
								{getIconByKey(CONFIG.SHIP_BATTLE_ABILITY_ICON[c]) &&
									<img style={{width: "1.25em", margin: "0.25em"}} src={getIconByKey(CONFIG.SHIP_BATTLE_ABILITY_ICON[c])} />
								}
								<span style={{margin: "0.25em"}}>{CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[c]}</span>
							</div>
							</>),
						text: CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[c],
                        title: CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[c]
					} as DropDownItem
				)) ?? [];
				resolve(poolList);
			});
			populatePromise.then((poolList) => {
				setOptions({
					state: OptionsState.Initialized,
					list: poolList
				});
			});
		}, 0);
	}
};



export type ShipAbilityRankPickerProps = {
    playerData?: PlayerData;
    availableRankings?: ShipSkillRanking[];
    selectedRankings: string[];
    setSelectedRankings: (abilityRank: string[]) => void | React.Dispatch<React.SetStateAction<string[]>>;
};

export const ShipAbilityRankPicker = (props: ShipAbilityRankPickerProps) => {
	const { selectedRankings: selectedAbilities, setSelectedRankings: setSelectedAbilities } = props;
    const availableAbilities = props.availableRankings;

	enum OptionsState {
		Uninitialized,
		Initializing,
		Initialized,
	};

	const [selection, setSelection] = React.useState(selectedAbilities.map(a => a.toString()));
	const [options, setOptions] = React.useState({
		state: OptionsState.Uninitialized,
		list: [] as DropDownItem[]
	});

	const placeholder = options.state === OptionsState.Initializing ? 'Loading. Please wait...' : 'Select Ship Ability Amount';

    React.useEffect(() => {
        populateOptions();
    }, [availableAbilities]);

    React.useEffect(() => {
        setSelectedAbilities(selection);
    }, [selection]);

	return (
		<React.Fragment>
			<Dropdown 
                search 
                selection 
                clearable                
                fluid
                multiple
				placeholder={placeholder}
				options={options.list}                
				value={selection}				
				onFocus={() => { if (options.state === OptionsState.Uninitialized) populateOptions(); }}
				onChange={(e, { value }) => setSelection(value as string[])}
			/>
		</React.Fragment>
	);
	
	function populateOptions(): void {
		setOptions({
			state: OptionsState.Initializing,
			list: []
		});
		const rankToRating = (rank: number): number => {
			switch(rank) {
				case 1:
					return 5;
				case 2:
					return 4;
				case 3:
					return 3;
				case 4:
					return 2;
				case 5:
					return 1;
				default:
					return 0;
			}
		}
		// Populate inside a timeout so that UI can update with a "Loading" placeholder first
		setTimeout(() => {            
			const populatePromise = new Promise<DropDownItem[]>((resolve, reject) => {
				const poolList = availableAbilities?.map((c) => (
					{
						key: c.key,
						value: c.key,
						content: (<>
						<div style={{
							display: "flex",
							flexDirection: "row",
							alignItems: 'center'
						}}>
							<img style={{width: "1.25em", margin: "0.25em"}} src={getIconByKey(CONFIG.SHIP_BATTLE_ABILITY_ICON[c.type])} />
							<div style={{display:"block", margin: "0.25em"}}><Rating icon='star' disabled={true} maxRating={5} rating={rankToRating(c.rank)} /></div>
							<span style={{margin: "0.25em"}}>{CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[c.type].replace("%VAL%", c.value.toString())}</span>
						</div>
						</>),
						//image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}atlas/icon_${c}.png` },
						text: CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[c.type].replace("%VAL%", c.value.toString()),
                        title: CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[c.type].replace("%VAL%", c.value.toString())
					} as DropDownItem
				)) ?? [];
				resolve(poolList);
			});
			populatePromise.then((poolList) => {
				setOptions({
					state: OptionsState.Initialized,
					list: poolList
				});
			});
		}, 0);
	}
};


export type ShipSeatPickerProps = {
    playerData?: PlayerData;
	pool?: Ship[];
    availableSeats?: string[];
    selectedSeats: string[];
    setSelectedSeats: (seat: string[]) => void | React.Dispatch<React.SetStateAction<string[]>>;
};

export const ShipSeatPicker = (props: ShipSeatPickerProps) => {
	const { selectedSeats, setSelectedSeats } = props;
    const availableSeats = props.availableSeats && props.availableSeats.length ? props.availableSeats : Object.keys(CONFIG.SKILLS);

	enum OptionsState {
		Uninitialized,
		Initializing,
		Initialized,
	};

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, data: MenuItemProps) => {
		if (!data.name) return;
		let newSeats = [...selectedSeats ?? []];
		if (newSeats.includes(data.name)) {
			if (newSeats.length === 1) newSeats = [];
			else newSeats = newSeats.splice(newSeats.indexOf(data.name));		
		}
		else {
			newSeats.push(data.name);
		}
		setSelectedSeats(newSeats);
	};

	useEffect (() => {
		let newSeats = [...selectedSeats ?? []];
		
		for (let sel of selectedSeats) {
			if (!availableSeats.includes(sel)) {
				if (newSeats.length === 1) newSeats = [];
				else newSeats = newSeats.splice(newSeats.indexOf(sel));
			}
		}

		if (newSeats.length !== selectedSeats.length) {
			setSelectedSeats(newSeats);
		}
	}, [availableSeats])

	return (
		<React.Fragment>
			<Menu fluid>
				{availableSeats.map((c, key) => (
					<Menu.Item
						as="a"
						name={c}
						key={key}
						index={key}
						onClick={handleClick}						
						active={selectedSeats.includes(c)}
                        title={CONFIG.SKILLS[c]}
					>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${c}.png`} style={{width: "1em"}} />
					</Menu.Item>)
				)}
			</Menu>
		</React.Fragment>
	);

};
