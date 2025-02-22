import React from 'react';
import { Checkbox, Form, Grid, Header, Message, Segment } from 'semantic-ui-react';

import { EquipmentCommon } from '../model/equipment';
import { PlayerCrew } from '../model/player';
import { Ship } from '../model/ship';
import { GlobalContext } from '../context/globalcontext';
import { ItemHoverStat } from './hovering/itemhoverstat';
import ItemDisplay from '../components/itemdisplay';

import { mergeItems } from '../utils/itemutils';
import CONFIG from './CONFIG';
import { AvatarView } from './item_presenters/avatarview';

export const UnneededItems = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { playerData } = globalContext.player;

	const [playerItems, setPlayeritem] = React.useState<EquipmentCommon[]>([]);

	React.useEffect(() => {
		const playerItems: EquipmentCommon[] = mergeItems(playerData?.player.character.items ?? [], globalContext.core.items)
			.filter(item => item.type !== 14 && item.type !== 15);
		console.log(playerItems.filter(item => (item.quantity ?? 0)  > 32000));
		setPlayeritem([...playerItems]);
	}, [playerData]);

	if (!playerData) return <></>;

	const itemCount: number = playerItems.length;
	const itemLimit: number = playerData.player.character.item_limit ?? 1000;
	const thresholdWarning: number = .975 * itemLimit;

	return (
		<React.Fragment>
			<p>{tfmt('items_unneeded.summary', { n: <b>{itemCount}</b> })}</p>
			{itemCount > thresholdWarning && renderWarning()}
			<ItemHoverStat targetGroup='unneeded_items' />
			<SchematicFuel playerSchematics={playerItems.filter(item => item.type === 8)} />
			<EquipmentFuel playerEquipment={playerItems.filter(item => item.type === 2)} />
		</React.Fragment>
	);

	function renderWarning(): JSX.Element {
		return (
			<Message warning>
				<Message.Header>{t('items_unneeded.limit_warning.title')}</Message.Header>
				<p>
					{t('items_unneeded.limit_warning.description', { n: `${itemLimit}`})}
				</p>
			</Message>
		);
	}
};

type SchematicFuelProps = {
	playerSchematics: EquipmentCommon[];
};

const SchematicFuel = (props: SchematicFuelProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { playerData, playerShips } = globalContext.player;

	if (!playerData || !playerShips) return <></>;

	const allPlayerShips: Ship[] = playerShips.slice();
	// Core ships is missing the default ship (1* Constellation Class), so manually account for it here
	const defaultShip: Ship | undefined = playerData.player.character.ships.find(ship => ship.symbol === 'constellation_ship');
	if (defaultShip) allPlayerShips.push(defaultShip);

	// Calculate unneeded schematics
	const maxedShips: Ship[] = allPlayerShips.filter(
		ship => ship.level === ship.max_level
	);
	const fuelList: EquipmentCommon[] = props.playerSchematics.filter(item =>
		maxedShips.some(ship => {
			if (item.symbol === `${ship.symbol}_schematic`) {
				item.rarity = ship.rarity;	// Use ship rarity instead of schematic item rarity
				return true;
			}
		})
	).sort((a, b) => {
		if (a.rarity === b.rarity)
			return a.name.localeCompare(b.name);

		return b.rarity - a.rarity;
	});

	if (fuelList.length === 0) return <></>;

	return (
		<React.Fragment>
			<Header as='h3'>{CONFIG.REWARDS_ITEM_TYPE[8]} ({fuelList.length})</Header>
			<p>{tfmt('items_unneeded.ships_maxed_info', { max_text: <b>{t('items_unneeded.ships_maxed')}</b>})}</p>
			<FuelGrid fuelList={fuelList} items={props.playerSchematics} />
		</React.Fragment>
	);
};

interface IFodder {
	itemSymbol: string;
	singleUse: boolean;
	potentialCrew: string[];
};

type EquipmentFuelProps = {
	playerEquipment: EquipmentCommon[];
};

const EquipmentFuel = (props: EquipmentFuelProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { playerData } = globalContext.player;

	const [fodder, setFodder] = React.useState<IFodder[]>([]);
	const [fuelList, setFuelList] = React.useState<EquipmentCommon[]>([]);

	const [hideEfficient, setHideEfficient] = React.useState<boolean>(true);
	const [hideGeneric, setHideGeneric] = React.useState<boolean>(true);
	const [hidePotential, setHidePotential] = React.useState<boolean>(true);

	// Calculate all potential fodder
	React.useEffect(() => {
		if (!playerData) {
			setFodder([]);
			return;
		}

		const crewOwned: Set<string> = new Set();
		const equipmentUsed: Set<string> = new Set();
		const equipmentNeeded: Set<string> = new Set();
		playerData.player.character.crew.forEach(crew => crewOwned.add(crew.symbol));
		crewOwned.forEach(crewSymbol => {
			// Handle dupes as either all fully-equipped or as all needing items
			const crewList: PlayerCrew[] = playerData.player.character.crew.filter(crew => crew.symbol === crewSymbol);
			let allFullyEquipped: boolean = true;
			crewList.forEach(crew => {
				if (crew.level < 99 || (crew.equipment && crew.equipment?.length < 4))
					allFullyEquipped = false;
			});
			const crew: PlayerCrew = crewList[0];
			crew.equipment_slots.forEach(equipment => {
				if (allFullyEquipped)
					equipmentUsed.add(equipment.symbol);
				else
					equipmentNeeded.add(equipment.symbol);
			});
		});

		// Assume needed if a higher quality item of same name is needed
		const needsHigherQuality = (symbol: string, rarity: number): boolean => {
			let needsHigher: boolean = false;
			for (let i = rarity + 1; i <= 5; i++) {
				if (equipmentNeeded.has(symbol.replace(/quality\d/, 'quality'+i))) {
					needsHigher = true;
					break;
				}
			}
			return needsHigher;
		};

		// Only consider equipment of fully-equipped crew as potential fodder
		//	Assume all equipment items of other owned crew are still needed
		//	Also keep track of unowned crew that could still use equipment or higher quality equipment
		const fodder: IFodder[] = [];
		props.playerEquipment.filter(item =>
			equipmentUsed.has(item.symbol)
				&& !equipmentNeeded.has(item.symbol)
				&& !needsHigherQuality(item.symbol, item.rarity)
		).forEach(item => {
			const higherRarities: string[] = [];
			for (let i = item.rarity + 1; i <= 5; i++) {
				higherRarities.push(item.symbol.replace(/quality\d/, 'quality'+i));
			}
			const usefulCrew: string[] = globalContext.core.crew.filter(crew =>
				crew.equipment_slots.find(equipment =>
					equipment.symbol === item.symbol
						|| higherRarities.includes(equipment.symbol)
				)
			).map(crew => crew.symbol);
			fodder.push({
				itemSymbol: item.symbol,
				singleUse: usefulCrew.length === 1,
				potentialCrew: usefulCrew.filter(crewSymbol => !crewOwned.has(crewSymbol))
			});
		});
		setFodder([...fodder]);
	}, [props.playerEquipment]);

	// Filter fodder
	React.useEffect(() => {
		const fuelList: EquipmentCommon[] = props.playerEquipment.filter(item => {
			return (!!fodder.find(f =>
				f.itemSymbol === item.symbol
					&& (!hideEfficient || ((item.quantity ?? 0) < 5))
					&& (!hidePotential || f.potentialCrew.length === 0)
					&& (!hideGeneric || f.singleUse)
			));
		}).sort((a, b) => {
			if (a.rarity == b.rarity)
				return a.name.localeCompare(b.name);
			return b.rarity - a.rarity;
		});
		setFuelList([...fuelList]);
	}, [fodder, hideEfficient, hidePotential, hideGeneric]);

	if (!playerData) return <></>;

	return (
		<React.Fragment>
			<Header as='h3'>{CONFIG.REWARDS_ITEM_TYPE[2]} ({fuelList.length})</Header>
			<p>{tfmt('items_unneeded.dispose_candidate', { reason: <b>{t('items_unneeded.dispose_candidate_reason')}</b> })}</p>
			<Form>
				<Form.Group grouped>
					<Form.Field
						control={Checkbox}
						label={t('items_unneeded.options.inefficient')}
						checked={hideEfficient}
						onChange={(e, { checked }) => setHideEfficient(checked)}
					/>
					<Form.Field
						control={Checkbox}
						label={t('items_unneeded.options.single_use')}
						checked={hideGeneric}
						onChange={(e, { checked }) => setHideGeneric(checked)}
					/>
					{!hideGeneric && (
						<Form.Field
							control={Checkbox}
							label={t('items_unneeded.options.hide_generic')}
							checked={hidePotential}
							onChange={(e, { checked }) => setHidePotential(checked)}
						/>
					)}
				</Form.Group>
			</Form>
			<FuelGrid fuelList={fuelList} items={props.playerEquipment} linkToWiki={true} />
		</React.Fragment>
	);
};

// Classic is deprecated in favor of new EquipmentFuel component
//	Keeping this here for now for comparison purposes only
const EquipmentFuelClassic = (props: EquipmentFuelProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	if (!playerData) return <></>;

	// Only consider equipment of fully-equipped crew as potential fodder
	//	Assume all equipment items of other crew are still needed
	const equipmentUsed: Set<string> = new Set();
	const equipmentNeeded: Set<string> = new Set();
	// Handle dupes as either all fully-equipped or as all needing items
	const crewBySymbol: string[] = [];
	playerData.player.character.crew.forEach(crew => {
		if (!crewBySymbol.includes(crew.symbol)) crewBySymbol.push(crew.symbol);
	});
	crewBySymbol.forEach(crewSymbol => {
		const crewList: PlayerCrew[] = playerData.player.character.crew.filter(crew => crew.symbol === crewSymbol);
		let allFullyEquipped: boolean = true;
		crewList.forEach(crew => {
			if (crew.level < 99 || (crew.equipment && crew.equipment?.length < 4))
				allFullyEquipped = false;
		});
		const crew: PlayerCrew = crewList[0];
		crew.equipment_slots.forEach(equipment => {
			if (allFullyEquipped)
				equipmentUsed.add(equipment.symbol);
			else
				equipmentNeeded.add(equipment.symbol);
		});
	});

	// Calculate all replicator fodder
	const fuelList: EquipmentCommon[] = props.playerEquipment.filter(item =>
		equipmentUsed.has(item.symbol)
			&& !equipmentNeeded.has(item.symbol)
	).sort((a, b) => {
		if (a.rarity == b.rarity)
			return a.name.localeCompare(b.name);
		return b.rarity - a.rarity;
	});

	// Should probably regex this
	//	Fancy apostrophe check needed for some crew
	const isSpecificItem = (name: string): boolean =>
		name.indexOf(`'s `) > 0
			|| name.indexOf(`s' `) > 0
			|| name.indexOf(`’s `) > 0
			|| name.indexOf(`s’ `) > 0;

	// Assume needed if a higher quality item of same name is needed
	const needsHigherQuality = (symbol: string, rarity: number): boolean => {
		let needsHigher: boolean = false;
		for (let i = rarity + 1; i <= 5; i++) {
			if (equipmentNeeded.has(symbol.replace(/quality\d/, 'quality'+i))) {
				needsHigher = true;
				break;
			}
		}
		return needsHigher;
	};

	// Filter crew-specific items
	const specificList: EquipmentCommon[] = fuelList.filter(item =>
		isSpecificItem(item.name)
			&& !needsHigherQuality(item.symbol, item.rarity)
	);

	// Filter generic items
	const genericList: EquipmentCommon[] = fuelList.filter(item =>
		item.quantity === 1
			&& item.rarity > 1
			&& !isSpecificItem(item.name)
			&& !needsHigherQuality(item.symbol, item.rarity)
	);

	if (specificList.length === 0 && genericList.length === 0)
		return <></>;

	return (
		<React.Fragment>
			{specificList.length > 0 && (
				<React.Fragment>
					<Header as='h3'>Crew-Specific Equipment ({specificList.length})</Header>
					<p>The following equipment items are good candidates to discard as they are used to equip <b>specific crew you have already fully equipped</b>. Note: some items listed here might be useful for crew who are not on your current roster, or as building blocks of other needed equipment. Tap an item name to consult the wiki for more information about the equipment.</p>
					<FuelGrid fuelList={specificList} items={props.playerEquipment} linkToWiki={true} />
				</React.Fragment>
			)}
			{genericList.length > 0 && (
				<React.Fragment>
					<Header as='h3'>Other Equipment ({genericList.length})</Header>
					<p>The following equipment items are other candidates to discard as they are <b>no longer needed for any crew on your current roster</b>. Note: some items listed here might be useful for crew who are not on your current roster, or as building blocks of other needed equipment. Tap an item name to consult the wiki for more information about the equipment.</p>
					<FuelGrid fuelList={genericList} items={props.playerEquipment} linkToWiki={true} />
				</React.Fragment>
			)}
		</React.Fragment>
	);
};

type FuelGridProps = {
	fuelList: EquipmentCommon[];
	items: EquipmentCommon[];
	linkToWiki?: boolean;
};

const FuelGrid = (props: FuelGridProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData } = globalContext.player;
	const { fuelList, items, linkToWiki } = props;

	if (fuelList.length === 0) return <></>;

	return (
		<Segment>
			<Grid columns={5} centered padded doubling>
				{fuelList.map((item, idx) => (
					<Grid.Column key={idx} rel={item.archetype_id} textAlign='center'>
						<div style={{
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'top',
							alignItems: 'center',
						}}>
							<AvatarView
								mode='item'
								targetGroup='unneeded_items'
								item={item}
								useDirect={true}
								size={64}
							/>
							<p>
								{linkToWiki ? renderLink(item.name, item.name_english) : item.name}
								<br />({t('items.n_owned', { n: `${item.quantity}`})})
							</p>
						</div>
					</Grid.Column>
				))}
			</Grid>
		</Segment>
	);

	function renderLink(itemName: string, itemEnglish?: string): JSX.Element {
		const itemUrl: string = 'https://sttwiki.org/wiki/'+(itemEnglish ?? itemName).replace(/\s/g,'_').replace(/’/g,'\'');
		return <a href={itemUrl}>{itemName}</a>;
	};
}
