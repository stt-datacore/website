import React from 'react';
import { Message, Table } from 'semantic-ui-react';

import { getIconPath } from '../../utils/assets';
import { GlobalContext } from '../../context/globalcontext';
import { glob } from 'fs';
import { Leaderboard } from '../../model/events';

type LiveType = 'na' | 'live' | 'not_live';

function LeaderboardTab(props: { leaderboard: Leaderboard[], instanceId?: number }) {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { instanceId } = props;
	const { playerData, ephemeral } = globalContext.player;
	const [leaderboard, setLeaderboard] = React.useState<Leaderboard[]>(props.leaderboard);
	const [isLive, setIsLive] = React.useState<LiveType>('na');
	React.useEffect(() => {
		if (ephemeral?.events) {
			let f = ephemeral.events.find(f => !!instanceId && f.instance_id === instanceId && f.seconds_to_start === 0 && f.seconds_to_end > 0);
			if (f) {
				fetch(`https://datacore.app/api/leaderboard?instance_id=${f.instance_id}`)
					.then(result => result.json())
					.then((lb) => {
						setLeaderboard(lb.leaderboard);
						setIsLive('live');
					})
					.catch(e => {
						setIsLive('not_live');
						console.log(e)
					});
			}
		}
	}, [ephemeral]);

	return (
		<>
			{(!playerData || isLive === 'not_live') && <Message>
				{t('event_info.active_event_lag_warn')}
			</Message>}
			{isLive === 'live' && <Message positive>
				{t('event_info.active_event')}
			</Message>}
			{!leaderboard?.length && <Message>
				{t('global.no_items_found')}
			</Message>}
			<Table celled striped compact='very'>
				<Table.Body>
					{leaderboard.map(member => (
						<Table.Row key={member.dbid}>
							<Table.Cell style={{ fontSize: '1.25em' }}>
								{t('event_info.rank')}: {member.rank}
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
										{t('base.level')} {member.level}
									</div>
								</div>
							</Table.Cell>
							<Table.Cell style={{ fontSize: '1.25em' }}>
								{t('event_info.score')}: {member.score}
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		</>
	);
}

export default LeaderboardTab;
