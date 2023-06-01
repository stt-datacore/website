import React from 'react';
import { Table, Image, Label } from 'semantic-ui-react';

import { getIconPath, getRarityColor } from '../../utils/assets';
import { Event } from '../../model/player';
import { EventData } from '../../utils/events';

function getBracketLabel(bracket) {
	if (bracket.first === bracket.last) { // top brackets aren't really a range
		return bracket.first;
	}
	if (bracket.last === -1) { // last rank is any score above
		return `${bracket.first} and above`
	}

	return `${bracket.first} - ${bracket.last}`;
}

function RankedRewardsTab(props: {eventData: Event | EventData}) {
	const {ranked_brackets} = props.eventData;

	return (
		<Table celled striped compact='very'>
			<Table.Body>
				{ranked_brackets.map(row => (
					<Table.Row key={`bracket_${row.first}_${row.last}`}>
						<Table.Cell width={2}>{getBracketLabel(row)}</Table.Cell>
						<Table.Cell width={14}>
							{row.rewards.map(reward => (
								<Label key={`reward_${reward.id}`} color="black">
									{reward.icon &&
									<Image
										src={getIconPath(reward.icon)}
										size="small"
										inline
										spaced="right"
										bordered
										style={{
											borderColor: getRarityColor(reward.rarity ?? 0),
											maxWidth: '27px',
											maxHeight: '27px'
										}}
										alt={reward.full_name}
									/>}
									{reward.full_name}
									{reward.quantity > 1 ? ` x ${reward.quantity}` : ''}
								</Label>
							))}
						</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table>
	);}

export default RankedRewardsTab;
