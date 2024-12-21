import React from 'react';
import { Table, Image, Label } from 'semantic-ui-react';

import { getIconPath, getRarityColor } from '../../utils/assets';
import { AtlasIcon, GameEvent } from '../../model/player';
import ItemDisplay from '../itemdisplay';
import { GlobalContext } from '../../context/globalcontext';
import { getImageName } from '../../utils/misc';
import { checkReward } from '../../utils/itemutils';
import { AvatarView, AvatarViewMode, BasicItem } from '../item_presenters/avatarview';

function ThresholdRewardsTab(props: {eventData: GameEvent}) {
	const { threshold_rewards } = props.eventData;
	const context = React.useContext(GlobalContext);
	const { items } = context.core;
	const { ITEM_ARCHETYPES } = context.localized;

	return (
		<Table celled striped compact='very'>
			<Table.Body>
				{threshold_rewards.map(row => (
					<Table.Row key={row.points}>
						<Table.Cell>{row.points}</Table.Cell>
						<Table.Cell>
							{row.rewards.map(reward => {
								checkReward(items, reward);
								if (reward.symbol) {
									const archetype = ITEM_ARCHETYPES[reward.symbol];
									if (archetype) {
										reward.full_name = archetype.name;
										reward.flavor = archetype.flavor;
									}
								}
								let rewardTarget = reward.type === 1 ? 'event_info' : reward.type === 8 ? 'event_info_ships' : 'event_info_items';
								return (
								reward && reward.icon &&
								<Label
									key={`reward_${reward.id}`} color="black" title={reward.full_name}>
									<div
										style={{
											display: "flex",
											flexDirection: "row",
											justifyContent:"center",
											alignItems: "center"
									}}>
										<AvatarView
											mode={reward.type}
											symbol={reward.symbol}
											quantity={reward.quantity}
											src={getIconPath(reward.icon)}
											targetGroup={rewardTarget}
											size={48}
											style={{
												marginRight: "1em"
											}}
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
