import React from "react";
import { Dropdown, Grid, SemanticWIDTHS } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { PlayerCollection, Reward } from "../../model/player";
import { EquipmentItem } from "../../model/equipment";
import { checkReward, getCollectionRewards } from "../../utils/itemutils";
import { getImageName } from "../../utils/misc";
import ItemDisplay from "../itemdisplay";

export const rewardOptions = [
	{ key: 'roAnyr', value: '*any', text: 'Any reward' },
	{ key: 'roBuff', value: '*buffs', text: 'Buffs' },
	{ key: 'roEner', value: 'energy', text: 'Chronitons' },
	{ key: 'roCred', value: 'nonpremium', text: 'Credits' },
	{ key: 'roCrew', value: '=_crew$', text: 'Crew' },
	{ key: 'roDili', value: 'premium_purchasable', text: 'Dilithium' },
	{ key: 'roHono', value: 'honor', text: 'Honor' },
	{ key: 'roMeri', value: 'premium_earnable', text: 'Merits' },
	{ key: 'roPort', value: '=premium_\\d+x_bundle', text: 'Portals' },
	{ key: 'roRepl', value: '=^replicator_fuel', text: 'Replicator Fuel' },
	{ key: 'roSche', value: '=_ship_schematic$', text: 'Ship schematics' },
	{ key: 'roBoos', value: '=minor_consumables_\\d+x_bundle', text: 'Shuttle boosts' },
	{ key: 'roTrai', value: '=_production_training$', text: 'Training' }
];

export interface RewardsGridProps {
	rewards?: Reward[];
	wrap?: boolean;
	maxCols?: number;
}

export const RewardsGrid = (props: RewardsGridProps) => {
	const { rewards, wrap, maxCols } = props;
	const context = React.useContext(GlobalContext);
	const { playerData } = context.player;
	const { items: tempItems, crew: allCrew } = context.core;

	const items = [] as EquipmentItem[];

	if (!rewards?.length) return (<></>);

	const quantityLabel = (quantity) => {
		if (quantity >= 10000)
			return quantity/1000+'K';
		return quantity;
	};

	const rewardRows = [] as Reward[][];
	rewardRows.push([]);
	let cols = !wrap ? rewards.length : ((maxCols && maxCols >= 4) ? maxCols : 4);
	if (rewards.length < cols) cols = rewards.length;

	if (wrap) {

		let idx = 0;
		let cidx = 0;
		
		for (let reward of rewards) {
			rewardRows[cidx].push(reward);
			if (idx++ >= cols - 1) {
				rewardRows.push([]);
				idx = 0;
				cidx++;
			}
		}
	}
	else {
		rewardRows[0] = rewards;
	}
	
	return (
		<Grid columns={cols as SemanticWIDTHS}>
			{rewardRows.map((row, rowIdx) => {
				return (
					<Grid.Row key={rowIdx + "_rowreward"}>

					{row.map((reward, idx) => {
							const img = getImageName(reward);
							checkReward(items, reward);
							return (
								<Grid.Column key={idx + "_rowcolreward"}>
									<div style={{
										display: "flex",
										flexDirection: "column",
										justifyContent: "center",
										alignItems: "center"
									}}>
									<ItemDisplay
										quantity={reward.quantity}
										targetGroup={reward.type === 1 ? 'collectionsTarget' : 'collectionsTarget_item'}
										itemSymbol={reward.symbol}
										allCrew={allCrew}
										allItems={items}
										playerData={playerData}
										src={`${process.env.GATSBY_ASSETS_URL}${img}`}
										size={32}
										maxRarity={reward.rarity}
										rarity={reward.rarity}
									/>
									<span>{reward.quantity > 1 && (<div><small>{quantityLabel(reward.quantity)}</small></div>)}</span>
									</div>
								</Grid.Column>
							);
						})}

					</Grid.Row>
				)
			})}
		</Grid>
	);
};

export interface RewardPickerProps {
	rewards: Reward[];
	short?: boolean;
	setShort?: (value: boolean) => void;
	icons?: boolean;
	value?: string[];
	onChange: (value?: string[]) => void;
}

export const RewardPicker = (props: RewardPickerProps) => {
	const { rewards, icons, setShort, short, value, onChange } = props;
	const rrOpts = short ? [ ... rewardOptions ] : rewards.map((reward) => {
		return {
			key: reward.symbol,
			value: reward.symbol,
			text: reward.name,
			content: !icons ? undefined : (<div title={reward.full_name ?? reward.name} style={{ display: "flex", flexDirection: "row", width: "24px", alignItems:"center"}}>
				<img src={`${process.env.GATSBY_ASSETS_URL}${getImageName(reward)}`} style={{ height: "24px", marginRight:"0.25em"}} />
				{reward.full_name ?? reward.name}
			</div>)
		}
	});
	
	if (setShort) {
		rrOpts.push({ 
			key: short ? 'long' : 'short',
			value: short ? 'long' : 'short',
			text: short ? "Show more ..." : "Show less ...",
			content: undefined
		});
	}

	const handleChange = (value: string[] | undefined) => {
		
		if (setShort && value?.includes('short')) {
			setShort(true);
			onChange([] as string[]);			
		}
		else if (setShort && value?.includes('long')) {
			setShort(false);
			onChange([] as string[]);			
		}
		else {
			onChange(value as string[] | undefined);
		}
		
	}

	return (<>
	
	<Dropdown 
		style={{width: "22em"}}
		scrolling
		placeholder={'Priortize rewards'}
		options={rrOpts} 
		value={value}
		multiple
		onChange={(e, { value }) => handleChange(value as string[] | undefined) }
		/>
	
	</>)


}