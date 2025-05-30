import React from 'react';
import {
	Card,
	Header,
	Icon,
	Label,
	Message,
	Table
} from 'semantic-ui-react';

import { VoyageRefreshEncounter } from '../../../../model/voyage';
import { GlobalContext } from '../../../../context/globalcontext';

type EncounterCardProps = {
	encounterData: VoyageRefreshEncounter;
};

export const EncounterCard = (props: EncounterCardProps) => {
	const { t, TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { encounterData } = props;

	const inProgress: boolean = encounterData.contests_data.some(contest => contest.state !== 'unresolved');

	interface ICardGroup {
		key: string;
		header: string;
		content: string | JSX.Element;
	};

	const cardGroups: ICardGroup[] = [
		{
			key: 'contests',
			header: `Contests (${encounterData.contests_count})`,
			content: (
				<Label.Group>
					{encounterData.contests_data.map((contest, idx) => {
						const isBoss: boolean = !!contest.boss_min_prof && contest.boss_min_prof > 0;
						return (
							<Label key={idx} color={isBoss ? 'pink' : undefined}>
								<div style={{ display: 'flex', alignItems: 'center', columnGap: '.3em' }}>
									{Object.keys(contest.skills).map(skillKey => (
										<img
											key={contest.skills[skillKey]}
											src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${contest.skills[skillKey]}.png`}
											style={{ height: isBoss ? '1.8em' : '1.5em', verticalAlign: 'middle' }}
											className='invertibleIcon'
										/>
									))}
								</div>
							</Label>
						);
					})}
				</Label.Group>
			)
		},
		{
			key: 'crits',
			header: t('voyage.encounter_traits'),
			content: (
				<Label.Group>
					{encounterData.traits.sort((a, b) => TRAIT_NAMES[a].localeCompare(TRAIT_NAMES[b])).map(critTrait => (
						<Label key={critTrait} content={TRAIT_NAMES[critTrait]} />
					))}
				</Label.Group>
			)
		},
		{
			key: 'multiplier',
			header: 'VP Multiplier',
			content: <Label>x{encounterData.encounter_vp_multiplier}</Label>
		}
	];

	return (
		<Card fluid>
			<Card.Content>
				<Table basic='very' collapsing compact='very'>
					{cardGroups.map(group => (
						<Table.Row key={group.key}>
							<Table.Cell>
								<Header as='h5'>
									{group.header}{t('global.colon')}
								</Header>
							</Table.Cell>
							<Table.Cell>
								{group.content}
							</Table.Cell>
						</Table.Row>
					))}
				</Table>
				{inProgress && (
					<Message>
						<Icon name='warning sign' />
						This tool is unable to see the crew used for any contests you have already completed in-game. You must manually assign successful crew to the contests below to get a more accurate representation of viable skills for the remaining contests.
					</Message>
				)}
			</Card.Content>
		</Card>
	);
};
