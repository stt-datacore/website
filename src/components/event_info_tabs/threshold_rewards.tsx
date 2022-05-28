import React from 'react';
import { Table, Image, Label } from 'semantic-ui-react';

import { getIconPath, getRarityColor } from '../../utils/assets';

function ThresholdRewardsTab({eventData}) {
	const {threshold_rewards} = eventData;

	return (
		<Table celled striped compact='very'>
			<Table.Body>
				{threshold_rewards.map(row => (
					<Table.Row key={row.points}>
						<Table.Cell>{row.points}</Table.Cell>
						<Table.Cell>
							{row.rewards.map(reward => (
								<Label key={`reward_${reward.id}`} color="black">
									<Image
										src={getIconPath(reward.icon)}
										size="small"
										inline
										spaced="right"
										bordered
										style={{
											borderColor: getRarityColor(reward.rarity),
											maxWidth: '27px',
											maxHeight: '27px'
										}}
										alt={reward.full_name}
									/>
									{reward.full_name}
									{reward.quantity > 1 ? ` x ${reward.quantity}` : ''}
								</Label>
							))}
						</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table>
	);
}

export default ThresholdRewardsTab;
