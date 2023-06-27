import React from 'react';
import { Table, Rating, Dropdown, Button, StrictCheckboxProps } from 'semantic-ui-react';
import { Link } from 'gatsby';
import { CrewMember } from '../model/crew';
import { CompactCrew, PlayerCrew, PlayerData } from '../model/player';
import { AvatarIcon } from '../model/game-elements';
import { DropDownItem } from '../utils/misc';
import { Schematics, Ship } from '../model/ship';
import CONFIG from './CONFIG';
import { getIconByKey, getShipBonusIcon } from './item_presenters/shipskill';

type ShipAbilityPickerProps = {
    playerData?: PlayerData;
    availableAbilities?: string[];
    selectedAbilities: string[];
    setSelectedAbilities: (ability: string[]) => void | React.Dispatch<React.SetStateAction<string[]>>;
};

const ShipAbilityPicker = (props: ShipAbilityPickerProps) => {
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

export default ShipAbilityPicker;