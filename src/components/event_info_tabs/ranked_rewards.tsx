import React from 'react';
import { Table, Image, Label } from 'semantic-ui-react';

import { getIconPath, getRarityColor } from '../../utils/assets';
import { AtlasIcon, GameEvent } from '../../model/player';
import { EventData } from '../../utils/events';
import { GlobalContext } from '../../context/globalcontext';
import ItemDisplay from '../itemdisplay';
import { getImageName } from '../../utils/misc';
import { checkReward } from '../../utils/itemutils';

function getBracketLabel(bracket) {
	if (bracket.first === bracket.last) { // top brackets aren't really a range
		return bracket.first;
	}
	if (bracket.last === -1) { // last rank is any score above
		return `${bracket.first} and above`
	}

	return `${bracket.first} - ${bracket.last}`;
}

function RankedRewardsTab(props: {eventData: GameEvent | EventData}) {
	const {ranked_brackets} = props.eventData;
	const context = React.useContext(GlobalContext);
	const { items } = context.core;

	return (
		<Table celled striped compact='very'>
			<Table.Body>
				{ranked_brackets.map(row => (
					<Table.Row key={`bracket_${row.first}_${row.last}`}>
						<Table.Cell width={2}>{getBracketLabel(row)}</Table.Cell>
						<Table.Cell width={14}>
							{row.rewards.map(reward => {								
								checkReward(items, reward);
								return (
									<Label key={`reward_${reward.id}`} style={{marginBottom: "0.25em"}} 
										color="black" title={reward.full_name}>
										<div style={{
											display: "flex",
											flexDirection: "row",
											justifyContent:"center",
											alignItems: "center"
										}}>
										{reward.icon &&
										<ItemDisplay
											quantity={reward.quantity}
											src={getIconPath(reward.icon)}
											size={48}
											rarity={reward.rarity ?? 0}
											maxRarity={reward.rarity ?? 0}		
											allCrew={context.core.crew}
											playerData={context.player.playerData}
											allItems={context.core.items}
											itemSymbol={reward.symbol}
											targetGroup={reward.type === 1 ? 'event_info' : 'event_info_items'}
											style={{
												marginRight: "1em"
											}}
											
										/>}
										{reward.full_name}
										{reward.quantity > 1 ? ` x ${reward.quantity}` : ''}
										</div>
									</Label>
							)}
						)}
						</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table>
	);}

export default RankedRewardsTab;
