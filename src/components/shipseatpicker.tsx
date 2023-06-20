import React, { useEffect } from 'react';
import { Table, Rating, Dropdown, Button, StrictCheckboxProps, Menu, MenuItem, Image, MenuItemProps } from 'semantic-ui-react';
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

export default ShipSeatPicker;