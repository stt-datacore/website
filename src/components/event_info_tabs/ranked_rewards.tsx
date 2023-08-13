import React from 'react';
import { Table, Image, Label } from 'semantic-ui-react';

import { getIconPath, getRarityColor } from '../../utils/assets';
import { GameEvent } from '../../model/player';
import { EventData } from '../../utils/events';
import { MergedContext } from '../../context/mergedcontext';
import ItemDisplay from '../itemdisplay';

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
	const context = React.useContext(MergedContext);

	return (
		<Table celled striped compact='very'>
			<Table.Body>
				{ranked_brackets.map(row => (
					<Table.Row key={`bracket_${row.first}_${row.last}`}>
						<Table.Cell width={2}>{getBracketLabel(row)}</Table.Cell>
						<Table.Cell width={14}>
							{row.rewards.map(reward => (
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
										src={getIconPath(reward.icon)}
										size={48}
										rarity={reward.rarity ?? 0}
										maxRarity={reward.rarity ?? 0}		
										allCrew={context.allCrew}
										playerData={context.playerData}
										allItems={context.items}
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
							))}
						</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table>
	);}

export default RankedRewardsTab;
