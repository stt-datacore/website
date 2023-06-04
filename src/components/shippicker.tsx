import React from 'react';
import { Table, Rating, Dropdown, Button, StrictCheckboxProps } from 'semantic-ui-react';
import { Link } from 'gatsby';
import { CrewMember } from '../model/crew';
import { CompactCrew, PlayerCrew, PlayerData } from '../model/player';
import { AvatarIcon } from '../model/game-elements';
import { DropDownItem } from '../utils/misc';
import { Schematics, Ship } from '../model/ship';
import { mergeShips } from '../utils/shiputils';
import CONFIG from './CONFIG';

type ShipPickerProps = {
	rarityFilter?: number[];
    playerData?: PlayerData;
	pool?: Ship[];
    selectedShip?: Ship;
    setSelectedShip: (ship: Ship | undefined) => void | React.Dispatch<React.SetStateAction<Ship | undefined>>;
};

const ShipPicker = (props: ShipPickerProps) => {
	const { selectedShip, setSelectedShip, rarityFilter } = props;

	enum OptionsState {
		Uninitialized,
		Initializing,
		Initialized,
	};

    const [availableShips, setAvailableShips] = React.useState<Ship[] | undefined>(props.pool);
	const [selection, setSelection] = React.useState(selectedShip?.symbol);
	const [options, setOptions] = React.useState({
		state: OptionsState.Uninitialized,
		list: [] as DropDownItem[] | undefined
	});

	if (!availableShips || availableShips.length === 0) {
        if (!props.playerData) return <></>;        
        let pd = props.playerData;

        fetch('/structured/ship_schematics.json')
            .then(response => response.json())
            .then((ship_schematics: Schematics[]) => {
                let data = mergeShips(ship_schematics, pd.player.character.ships);
				// if (rarityFilter) {
				// 	data = data.filter((ship => rarityFilter.includes(ship.rarity)));
				// }
                setAvailableShips(data);
            });
    }

	const placeholder = options.state === OptionsState.Initializing ? 'Loading. Please wait...' : 'Select Ship';

    React.useEffect(() => {
        setShip();
    }, [selection]);

    React.useEffect(() => {
        populateOptions();
    }, [availableShips]);

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
				const poolList = availableShips?.map((c) => (
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
					list: poolList
				});
			});
		}, 0);
	}

	function setShip(): void {
		if (selection == '') return;
		let valid = availableShips?.find((c) => c.symbol == selection);
		if (valid) {
			setSelectedShip(valid);
		}
        else {
            setSelectedShip(undefined);
        }		
	}
};

export default ShipPicker;