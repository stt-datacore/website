import React from 'react';
import { Message, Table } from 'semantic-ui-react';

import { getIconPath } from '../../utils/assets';

function LeaderboardTab({leaderboard}) {
	return (
		<>
			<Message>
				If this event is currently active, the leaderboard below might be out of date.
				(Data is updated only a couple of times a week)
			</Message>
			<Table celled striped compact='very'>
				<Table.Body>
					{leaderboard.map(member => (
						<Table.Row key={member.dbid}>
							<Table.Cell style={{ fontSize: '1.25em' }}>
								Rank: {member.rank}
							</Table.Cell>
							<Table.Cell>
								<div
									style={{
										display: 'grid',
										gridTemplateColumns: '60px auto',
										gridTemplateAreas: `'icon stats' 'icon description'`,
										gridGap: '1px'
									}}>
									<div style={{ gridArea: 'icon' }}>
										<img
											width={48}
											src={member.avatar ? getIconPath(member.avatar) : `${process.env.GATSBY_ASSETS_URL}crew_portraits_cm_empty_sm.png`}
										/>
									</div>
									<div style={{ gridArea: 'stats' }}>
										<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
											{member.display_name}
										</span>
									</div>
									<div style={{ gridArea: 'description' }}>
										Level {member.level}
									</div>
								</div>
							</Table.Cell>
							<Table.Cell style={{ fontSize: '1.25em' }}>
								Score: {member.score}
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		</>
	);
}

export default LeaderboardTab;
