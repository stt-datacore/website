import React from 'react';
import {
	Icon,
	Popup
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';
import { GlobalContext } from '../../../context/globalcontext';
import { POPUP_DELAY } from '../utils';
import { ISkillsRank } from './model';

export type CrewFinderProps = {
	crew: PlayerCrew;
	bestRank: ISkillsRank | undefined;
};

export const CrewFinder = (props: CrewFinderProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { crew, bestRank } = props;

	let popup = { content: '', trigger: <></> };

	if (crew.immortal > 0) {
		popup = {
			content: t('voyage.crew_finder_hints.unfreeze_crew'),
			trigger: <div style={{textAlign: 'center' }}><Icon name='snowflake' /></div>
		};
	}
	else if (crew.active_status === 2) {
		popup = {
			content: t('voyage.crew_finder_hints.on_shuttle'),
			trigger: <div style={{textAlign: 'center' }}><Icon name='space shuttle' /></div>
		};
	}
	else if (crew.active_status === 3) {
		popup = {
			content: t('voyage.crew_finder_hints.on_voyage'),
			trigger: <div style={{textAlign: 'center' }}><Icon name='rocket' /></div>
		};
	}
	else if (bestRank) {
		let content: string = '';
		if (bestRank.skills.length === 0)
			content = `Select the ${bestRank.rank === 1 ? 'top crew' : addPostfix(bestRank.rank) + ' crew from the top'} for this seat`;
		else {
			content = `Filter by these skills, then select the ${bestRank.rank === 1 ? 'top crew' : addPostfix(bestRank.rank) + ' crew from the top'}`;
		}
		popup = {
			content,
			trigger:
				<span style={{ whiteSpace: 'nowrap' }}>
					{bestRank.skills.map(skill => (
						<img key={skill} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1em', verticalAlign: 'middle' }} />
					))}
					{` `}<span style={{ verticalAlign: 'middle' }}>{bestRank.rank}</span>
				</span>
		};
	}

	return (
		<Popup content={popup.content} mouseEnterDelay={POPUP_DELAY} trigger={
			<span style={{ cursor: 'help' }}>
				{popup.trigger}
			</span>
		} />
	);

	function addPostfix(pos: number): string {
		const POSITION_POSTFIX: string[] = [
			'th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'
		];
		if (pos > 3 && pos < 21) return `${pos}th`;
		return `${pos}${POSITION_POSTFIX[pos%10]}`;
	}
};
