import React from "react";
import { Dropdown, Grid, Icon, SemanticWIDTHS } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { BuffBase, PlayerCollection, Reward } from "../../model/player";
import { EquipmentItem } from "../../model/equipment";
import { checkReward, getCollectionRewards } from "../../utils/itemutils";
import { getImageName } from "../../utils/misc";
import ItemDisplay from "../itemdisplay";
import { RewardsGridNeed } from "../../model/crew";

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
	kind?: 'reward' | 'need';
	needs?: RewardsGridNeed[];
	negative?: boolean;
	targetGroup?: string;
	crewTargetGroup?: string;
	size?: number;
}

export const RewardsGrid = (props: RewardsGridProps) => {

	// props.rewards ??= [];
	// props.needs ??= [];
	// props.kind ??= 'reward';
	// props.maxCols ??= 4;
	// props.wrap ??= false;

	const { kind, needs, wrap, maxCols, targetGroup, crewTargetGroup } = props;
	const rewards = props.rewards ?? [];
	const context = React.useContext(GlobalContext);
	const { playerData } = context.player;
	const { items: tempItems, crew: allCrew } = context.core;
	
	const items = [] as EquipmentItem[];

	if (kind === 'need' && needs?.length) {
		for (let need of needs) {
			let found = tempItems.find(f => f.symbol === need.symbol);
			if (found) {
				items.push({
					... JSON.parse(JSON.stringify(found)),
					needed: need.quantity,
					quantity: need.owned ?? 0
				});
			}
		}
	}

	if (!rewards?.length) {
		if (items.length) {
			for(let i of items) rewards.push({
				... i,
				type: i.type ?? 0,
				id: i.id ?? 0,
				full_name : i.name ?? i.symbol,
				quantity: i.needed ?? 0,
				owned: i.quantity ?? 0,
				icon: { atlas_info: '', file: i.imageUrl }
			});
		}
		else {
			return (<></>);
		}		
	}


	const quantityLabel = (quantity?: number, neg?: boolean, owned?: number) => {

		if (quantity === undefined) return '0';
		if (quantity === 0 || neg){
			if (neg) {
				return <Icon name='close' style={{margin: 0, padding: 0, textAlign: 'center', color:'gray', height:'24px'}} />
			}
			else {
				return <Icon name='check circle' style={{margin: 0, padding: 0, textAlign: 'center', color:'lightgreen', height:'24px'}} />
			}
		}
		
		let qstr = "";
		
		if (quantity >= 10000) {
			qstr = Math.round(quantity/1000).toLocaleString()+'K';
		}
		else {
			qstr = quantity.toLocaleString();
		}
				
		if (owned) {
			qstr = `${owned}/${qstr}`;
		}

		return qstr;
	};
	
	const { negative } = props;

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
							const img = needs?.length ? reward.icon?.file : getImageName(reward);
							checkReward(items, reward, !!needs?.length);
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
										targetGroup={(reward.type === 1 ? (crewTargetGroup ?? 'collectionsTarget') : (targetGroup ?? 'collectionsTarget_item'))}
										itemSymbol={reward.symbol}
										allCrew={allCrew}
										allItems={items}
										playerData={playerData}
										src={`${process.env.GATSBY_ASSETS_URL}${img}`}
										size={props.size ?? 32}
										maxRarity={reward.rarity}
										rarity={reward.rarity}
									/>
									
									<span>{(reward.quantity > 1 || !!needs?.length) && (<div><small>{quantityLabel(reward.quantity, negative, reward.owned)}</small></div>)}</span>
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
	source: PlayerCollection[];
	short?: boolean;
	setShort?: (value: boolean) => void;
	icons?: boolean;
	value?: string[];
	onChange: (value?: string[]) => void;
	placeholder?: string;
	disabled?: boolean;
}

export const RewardPicker = (props: RewardPickerProps) => {
	const { disabled, placeholder, source, icons, setShort, short, value, onChange } = props;
	
    let rewardCol = !source ? [] : getCollectionRewards(source);	
	const rewards = rewardCol.filter((f, idx) => rewardCol.findIndex(fi => fi.id === f.id) === idx).sort((a, b) => a.name?.localeCompare(b.name ?? "") ?? 0);

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
		disabled={disabled}
		style={{width: "22em"}}
		scrolling
		placeholder={placeholder ?? 'Prioritize rewards'}
		options={rrOpts} 
		value={value}
		multiple
		onChange={(e, { value }) => handleChange(value as string[] | undefined) }
		/>
	
	</>)


}