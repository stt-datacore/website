import React from 'react';
import { Table, Image, Label } from 'semantic-ui-react';

import { getIconPath, getRarityColor } from '../../utils/assets';
import { AtlasIcon, GameEvent } from '../../model/player';
import { GlobalContext } from '../../context/globalcontext';
import ItemDisplay from '../itemdisplay';
import { getImageName } from '../../utils/misc';
import { checkReward } from '../../utils/itemutils';
import { AvatarView, AvatarViewMode, BasicItem } from '../item_presenters/avatarview';

function getBracketLabel(bracket) {
	if (bracket.first === bracket.last) { // top brackets aren't really a range
		return bracket.first;
	}
	if (bracket.last === -1) { // last rank is any score above
		return `${bracket.first} and above`
	}

	return `${bracket.first} - ${bracket.last}`;
}

function RankedRewardsTab(props: {eventData: GameEvent}) {
	const { ranked_brackets } = props.eventData;
	const context = React.useContext(GlobalContext);
	const { items } = context.core;
	const { ITEM_ARCHETYPES } = context.localized;

	return (
		<Table celled striped compact='very'>
			<Table.Body>
				{ranked_brackets.map(row => (
					<Table.Row key={`bracket_${row.first}_${row.last}`}>
						<Table.Cell width={2}>{getBracketLabel(row)}</Table.Cell>
						<Table.Cell width={14}>
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
									<Label key={`reward_${reward.id}`} style={{marginBottom: "0.25em"}}
										color="black" title={reward.full_name}>
										<div style={{
											display: "flex",
											flexDirection: "row",
											justifyContent:"center",
											alignItems: "center"
										}}>
										{reward.icon &&
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
										}
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
