import React from 'react';
import { Table, Rating, Dropdown, Button, StrictCheckboxProps } from 'semantic-ui-react';
import { Link } from 'gatsby';
import { CrewMember } from '../model/crew';
import { CompactCrew, PlayerCrew, PlayerData } from '../model/player';
import { AvatarIcon } from '../model/game-elements';
import { DropDownItem } from '../utils/misc';
import { Schematics, Ship } from '../model/ship';
import CONFIG from './CONFIG';
import { ShipSkillRanking } from '../utils/crewutils';

type ShipAbilityRankPickerProps = {
    playerData?: PlayerData;
    availableRankings?: ShipSkillRanking[];
    selectedRankings: string[];
    setSelectedRankings: (abilityRank: string[]) => void | React.Dispatch<React.SetStateAction<string[]>>;
};

const ShipAbilityRankPicker = (props: ShipAbilityRankPickerProps) => {
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
		// Populate inside a timeout so that UI can update with a "Loading" placeholder first
		setTimeout(() => {            
			const populatePromise = new Promise<DropDownItem[]>((resolve, reject) => {
				const poolList = availableAbilities?.map((c) => (
					{
						key: c.key,
						value: c.key,
						//image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}atlas/icon_${c}.png` },
						text: `(Rank #${c.rank}) ` + CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[c.type].replace("%VAL%", c.value.toString()),
                        title:`(Rank #${c.rank}) ` +  CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[c.type].replace("%VAL%", c.value.toString())
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

export default ShipAbilityRankPicker;