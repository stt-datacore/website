import React, { useEffect } from "react";
import { Form, Dropdown, Rating, Menu, MenuItemProps } from "semantic-ui-react";
import { PlayerData } from "../../model/player";
import { Ship, Schematics } from "../../model/ship";
import { DropDownItem } from "../../utils/misc";
import { ShipPickerFilter, filterBy, mergeRefShips } from "../../utils/shiputils";
import CONFIG from "../CONFIG";
import { getIconByKey } from "../item_presenters/shipskill";
import { ShipSkillRanking } from "../../utils/crewutils";
import { GlobalContext } from "../../context/globalcontext";
import { ShipAdvantage } from "./views/shipabilities";

export type AbilityUsesProps = {
    uses: number[];
    zeroText?: string;
	selectedUses: number[];
	setSelectedUses: (rarityFilter: number[]) => void;
	altTitle?: string;
};

export const AbilityUses = (props: AbilityUsesProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { selectedUses, setSelectedUses } = props;

	const zeroText = props.zeroText ?? t('ship.unlimited');
    const abilityUsesOptions = props.uses.map((u) => {
        return {
            key: u ? `${u}x` : zeroText,
            text: u ? `${u}x` : zeroText,
            value: u
        }
    })

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? t('ship.uses_per_battle')}
				clearable
				multiple
				selection
				options={abilityUsesOptions}
				value={selectedUses}
				onChange={(e, { value }) => setSelectedUses(value as number[])}
				closeOnChange
			/>
		</Form.Field>
	);
};


export type ShipPickerProps = {
	clearable?: boolean;
	filter?: ShipPickerFilter;
    playerData?: PlayerData;
	pool?: Ship[];
    selectedShip?: Ship;
    setSelectedShip: (ship: Ship | undefined) => void | React.Dispatch<React.SetStateAction<Ship | undefined>>;
};

export const ShipPicker = (props: ShipPickerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, SHIP_TRAIT_NAMES } = globalContext.localized;
	const { pool } = props;
	const { clearable, selectedShip, setSelectedShip, filter } = props;
	const { playerShips } = globalContext.player;
    const [filteredShips, setFilteredShips] = React.useState<Ship[] | undefined>(props.pool);

	const availableShips = React.useMemo(() => {
		if (pool) return pool;
		const { all_ships } = globalContext.core;
		if (playerShips) {
			return playerShips;
		}
		else {
			let data = mergeRefShips(all_ships, [], SHIP_TRAIT_NAMES);
			return data;
		}
	}, [pool, playerShips]);

	const placeholder = t('hints.select_ship');

    React.useEffect(() => {
        setShip(selectedShip?.symbol ?? '');
    }, [filteredShips]);

    const poolList = filteredShips?.map((c) => (
		{
			key: c.symbol,
			value: c.symbol,
			image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.icon?.file.slice(1).replace('/', '_')}.png` },
			text: c.name,
			title: CONFIG.RARITIES[c.rarity].name + ` ${t('ship.ship')} / ${t('ship.attack')} ${c.attack?.toLocaleString()} / ${t('ship.shields')} ${c.shields?.toLocaleString()} / ${t('ship.hull')} ${c.hull?.toLocaleString()}`
		} as DropDownItem
	));

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
                clearable={clearable}
                fluid
				placeholder={placeholder}
				options={poolList}
				value={selectedShip?.symbol ?? ''}
				onChange={(e, { value }) => setShip(value as string)}
			/>
		</React.Fragment>
	);

	function setShip(value: string): void {
		if (value == '' || value === undefined)  {
			setSelectedShip(undefined);
			return;
		}
		let valid = filteredShips?.find((c) => c.symbol === value);

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
	ship?: boolean;
	fluid?: boolean;
};

export const ShipAbilityPicker = (props: ShipAbilityPickerProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { selectedAbilities, setSelectedAbilities, fluid } = props;
    const availableAbilities = props.availableAbilities && props.availableAbilities.length ? props.availableAbilities : Object.keys(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE).slice(0, props.ship ? 13 : 9);

	const [ability, setAbility] = React.useState(selectedAbilities);

	const placeholder = t('hints.select_ship_abilities');
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

    React.useEffect(() => {
        setSelectedAbilities(ability);
    }, [ability]);

	return (
		<React.Fragment>
			<Dropdown
                search
                selection
                clearable
                fluid={fluid}
                multiple
				placeholder={placeholder}
				options={poolList}
				value={selectedAbilities}
				onChange={(e, { value }) => setAbility(value as string[])}
			/>
		</React.Fragment>
	);

};

export type ShipAbilityRankPickerProps = {
    playerData?: PlayerData;
    availableRankings?: ShipSkillRanking[];
    selectedRankings: string[];
    setSelectedRankings: (abilityRank: string[]) => void | React.Dispatch<React.SetStateAction<string[]>>;
};

export const ShipAbilityRankPicker = (props: ShipAbilityRankPickerProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { selectedRankings: selectedAbilities, setSelectedRankings: setSelectedAbilities } = props;
    const availableAbilities = props.availableRankings;

	const [selection, setSelection] = React.useState(selectedAbilities ?? []);

	const placeholder = t('hints.select_ship_ability_amount');

    React.useEffect(() => {
        setSelectedAbilities(selection);
    }, [selection]);

	const rankToRating = (rank: number): number => {
		return rank <= 5 ? 6 - rank : 0;
	}

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
		} as DropDownItem))

	return (
		<React.Fragment>
			<Dropdown
                search
                selection
                clearable
                fluid
                multiple
				placeholder={placeholder}
				options={poolList}
				value={selectedAbilities}
				onChange={(e, { value }) => setSelection(value as string[])}
			/>
		</React.Fragment>
	);
};

export type ShipSeatPickerProps = {
    availableSeats?: string[];
    selectedSeats: string[];
	formatTitle?: (value: string, state: boolean) => string;
    setSelectedSeats: (seat: string[]) => void | React.Dispatch<React.SetStateAction<string[]>>;
	fluid?: boolean;
};

export const ShipSeatPicker = (props: ShipSeatPickerProps) => {
	const { selectedSeats, setSelectedSeats, fluid, formatTitle } = props;
    const availableSeats = props.availableSeats && props.availableSeats.length ? props.availableSeats : Object.keys(CONFIG.SKILLS);

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, data: MenuItemProps) => {
		if (!data.name) return;
		let newSeats = [...selectedSeats ?? []];
		if (newSeats.includes(data.name)) {
			if (newSeats.length === 1) newSeats = [];
			else newSeats.splice(newSeats.indexOf(data.name), 1);
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
			<Menu fluid={fluid !== false}>
				{availableSeats.map((c, key) => (
					<Menu.Item
						as="a"
						name={c}
						key={'seatindex_' + key}
						onClick={handleClick}
						active={selectedSeats.includes(c)}
                        title={formatTitle ? formatTitle(c, selectedSeats.includes(c)) : CONFIG.SKILLS[c]}
					>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${c}.png`} style={{width: "1em"}} />
					</Menu.Item>)
				)}
			</Menu>
		</React.Fragment>
	);

};


export type TriggerPickerProps = {
    triggers?: string[] | number[];
    zeroText?: string;
	selectedTriggers?: string[] | number[];
	setSelectedTriggers: (triggers: string[] | number[]) => void;
	altTitle?: string;
	grants?: boolean;
};

export const TriggerPicker = (props: TriggerPickerProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { grants, selectedTriggers, setSelectedTriggers } = props;

	const [triggers, setTriggers] = React.useState<string[] | number[]>(selectedTriggers ?? []);

    const triggerOptions = props.triggers?.map((u) => {
        return {
            key: u,
            text: u,
            value: CONFIG.CREW_SHIP_BATTLE_TRIGGER[u]
        }
    }) ?? (grants ?
		Object.keys(CONFIG.SHIP_BATTLE_GRANTS).map((dt) => {
			return {
				key: dt,
				value: dt,
				text: CONFIG.SHIP_BATTLE_GRANTS[dt]
			}
		})
		: Object.keys(CONFIG.CREW_SHIP_BATTLE_TRIGGER).map((dt) => {
		return {
			key: dt,
			value: dt,
			text: CONFIG.CREW_SHIP_BATTLE_TRIGGER[dt]
		}
	}));

	React.useEffect(() => {
		setSelectedTriggers(triggers);
	}, [triggers])

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? (grants ? t('ship.grants') : t('ship.triggers'))}
				clearable
				multiple
				selection
				options={triggerOptions}
				value={selectedTriggers ?? []}
				onChange={(e, { value }) => setTriggers(value as string[])}
				closeOnChange
			/>
		</Form.Field>
	);
};


export type BonusPickerProps = {
    bonuses?: string[];
    zeroText?: string;
	selectedBonuses?: number[];
	setSelectedBonuses: (triggers: number[] | undefined) => void;
	altTitle?: string;
};

export const BonusPicker = (props: BonusPickerProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { selectedBonuses, setSelectedBonuses } = props;

	const [bonsuses, setBonuses] = React.useState(selectedBonuses);

    const bonusOptions = props.bonuses?.map((u) => {
        return {
            key: Number.parseInt(u),
            text: CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[u],
			value: Number.parseInt(u),
        }
    }) ?? Object.keys(CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE).slice(0, 3).map((dt) => {
		return {
			key: Number.parseInt(dt),
			value: Number.parseInt(dt),
			text: CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[dt]
		}
	});

	React.useEffect(() => {
		setSelectedBonuses(bonsuses);
	}, [bonsuses])

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? t('global.bonuses')}
				clearable
				multiple
				selection
				options={bonusOptions}
				value={selectedBonuses ?? []}
				onChange={(e, { value }) => setBonuses(value as number[])}
				closeOnChange
			/>
		</Form.Field>
	);
};


export type TraitPickerProps = {
    trait_list?: string[];
	ship?: boolean;
    zeroText?: string;
	selectedTraits?: string[];
	setSelectedTraits: (traits: string[] | undefined) => void;
	altTitle?: string;
};

export const TraitPicker = (props: TraitPickerProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES, SHIP_TRAIT_NAMES } = globalContext.localized;
	const { selectedTraits, setSelectedTraits, ship } = props;
	const [traits, setTraits] = React.useState(selectedTraits);

	const useTraits = props.trait_list ?? (ship ? Object.keys(SHIP_TRAIT_NAMES) : Object.keys(TRAIT_NAMES));

    const traitOptions = useTraits.map((u) => {
        return {
            key: u,
			value: u,
            text: ship ? SHIP_TRAIT_NAMES[u] : TRAIT_NAMES[u],
        }
    });

	traitOptions.sort((a, b) => a.text.localeCompare(b.text));

	React.useEffect(() => {
		setSelectedTraits(traits);
	}, [traits])

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? t('hints.traits')}
				clearable
				multiple
				selection
				options={traitOptions}
				value={selectedTraits ?? []}
				onChange={(e, { value }) => setTraits(value as string[])}
				closeOnChange
			/>
		</Form.Field>
	);
};

export interface ShipOwnershipProps {
	selectedValue?: 'owned' | 'unowned';
	setSelectedValue: (value?: 'owned' | 'unowned') => void;
	altTitle?: string;
}

export const ShipOwnership = (props: ShipOwnershipProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { selectedValue: selectedValue, setSelectedValue: setSelectedUses } = props;

    const ownershipOptions = ['owned', 'unowned'].map((u) => {
        return {
            key: u,
            value: u,
            text: t(`ship_ownership.${u}`)
        }
    })

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? t('hints.filter_by_owned_status')}
				clearable
				selection
				options={ownershipOptions}
				value={selectedValue}
				onChange={(e, { value }) => setSelectedUses(value as any)}
				closeOnChange
			/>
		</Form.Field>
	);
};



export type AdvantagePickerProps = {
	selectedAdvantage?: ShipAdvantage;
	setSelectedAdvantage: (value?: ShipAdvantage) => void;
	altTitle?: string;
};

export const AdvantagePicker = (props: AdvantagePickerProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { selectedAdvantage, setSelectedAdvantage } = props;

	const [advantage, setAdvantage] = React.useState(selectedAdvantage);

    const advantageOptions = ['offense', 'defense'].map((u) => {
        return {
            key: u,
            text: t(`rank_names.advantage.${u}`),
			value: u,
        }
    }) ?? Object.keys(CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE).slice(0, 3).map((dt) => {
		return {
			key: Number.parseInt(dt),
			value: Number.parseInt(dt),
			text: CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[dt]
		}
	});

	React.useEffect(() => {
		setSelectedAdvantage(advantage);
	}, [advantage])

	return (
		<Form.Field>
			<Dropdown
				placeholder={props.altTitle ?? t('rank_names.advantage.select')}
				clearable
				selection
				options={advantageOptions}
				value={selectedAdvantage ?? []}
				onChange={(e, { value }) => setAdvantage(value as ShipAdvantage | undefined)}
				closeOnChange
			/>
		</Form.Field>
	);
};
