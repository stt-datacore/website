import React from 'react';
import { Table, Image, Label } from 'semantic-ui-react';

import { getIconPath, getRarityColor } from '../../utils/assets';
import { AtlasIcon, GameEvent } from '../../model/player';
import { EventData } from '../../utils/events';
import ItemDisplay from '../itemdisplay';
import { GlobalContext } from '../../context/globalcontext';
import { getImageName } from '../../utils/misc';
import { checkReward } from '../../utils/itemutils';

function ThresholdRewardsTab(props: {eventData: GameEvent | EventData}) {
	const {threshold_rewards} = props.eventData;
	const context = React.useContext(GlobalContext);
	const { items } = context.core;
	
	return (
		<Table celled striped compact='very'>
			<Table.Body>
				{threshold_rewards.map(row => (
					<Table.Row key={row.points}>
						<Table.Cell>{row.points}</Table.Cell>
						<Table.Cell>
							{row.rewards.map(reward => {								
								checkReward(items, reward);								
								return (
								reward && reward.icon &&
								<Label
									key={`reward_${reward.id}`} color="black" title={reward.full_name}>
									<div 									style={{
										display: "flex",
										flexDirection: "row",
										justifyContent:"center",
										alignItems: "center"
									}}>
									<ItemDisplay
										quantity={reward.quantity}
										src={getIconPath(reward.icon)}
										size={48}
										rarity={reward.rarity}
										maxRarity={reward.rarity}		
										allCrew={context.core.crew}
										allItems={context.core.items}
										playerData={context.player.playerData}
										itemSymbol={reward.symbol}
										targetGroup={reward.type === 1 ? 'event_info' : 'event_info_items'}
										style={{
											marginRight: "1em"
										}}
										// style={{
										// 	borderColor: getRarityColor(reward.rarity),
										// 	maxWidth: '27px',
										// 	maxHeight: '27px'
										// }}
										
									/>
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
	);
}

export default ThresholdRewardsTab;
