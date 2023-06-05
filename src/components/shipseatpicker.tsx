import React from 'react';
import { Table, Rating, Dropdown, Button, StrictCheckboxProps } from 'semantic-ui-react';
import { Link } from 'gatsby';
import { CrewMember } from '../model/crew';
import { CompactCrew, PlayerCrew, PlayerData } from '../model/player';
import { AvatarIcon } from '../model/game-elements';
import { DropDownItem } from '../utils/misc';
import { Schematics, Ship } from '../model/ship';
import CONFIG from './CONFIG';

type ShipSeatPickerProps = {
    playerData?: PlayerData;
	pool?: Ship[];
    availableSeats?: string[];
    selectedSeats: string[];
    setSelectedSeats: (seat: string[]) => void | React.Dispatch<React.SetStateAction<string[]>>;
};

const ShipSeatPicker = (props: ShipSeatPickerProps) => {
	const { selectedSeats, setSelectedSeats } = props;
    const availableSeats = props.availableSeats && props.availableSeats.length ? props.availableSeats : Object.keys(CONFIG.SKILLS);

	enum OptionsState {
		Uninitialized,
		Initializing,
		Initialized,
	};

	const [selection, setSelection] = React.useState(selectedSeats);
	const [options, setOptions] = React.useState({
		state: OptionsState.Uninitialized,
		list: [] as DropDownItem[]
	});

	const placeholder = options.state === OptionsState.Initializing ? 'Loading. Please wait...' : 'Select Skills';

    React.useEffect(() => {
        populateOptions();
    }, [availableSeats]);

    React.useEffect(() => {
        setSelectedSeats(selection);
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
				const poolList = availableSeats?.map((c) => (
					{
						key: c,
						value: c,
						image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}atlas/icon_${c}.png` },
						text: CONFIG.SKILLS[c],
                        title: CONFIG.SKILLS[c]
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

export default ShipSeatPicker;