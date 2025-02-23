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
	const { localized } = React.useContext(GlobalContext);
	const { t, language } = localized;
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
		const top: string = bestRank.rank === 1
			? t('voyage.crew_finder_hints.best_rank.top')
			: t('voyage.crew_finder_hints.best_rank.top_ordinal', { ordinal: addPostfix(bestRank.rank, language) });
		let content: string = '';
		if (bestRank.skills.length === 0)
			content = t('voyage.crew_finder_hints.best_rank.optimal', { top });
		else
			content = t('voyage.crew_finder_hints.best_rank.prefilter', { top });
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

	function addPostfix(pos: number, lang: string): string {
		if (lang === 'sp') return `${pos}o`;
		else if (lang === 'de') return `${pos}.`;
		else if (lang === 'fr') {
			if ((pos % 10) == 1) return `${pos}er`;
			else return `${pos}ème`;

		}
		const POSITION_POSTFIX: string[] = [
			'th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'
		];
		if (pos > 3 && pos < 21) return `${pos}th`;
		return `${pos}${POSITION_POSTFIX[pos%10]}`;
	}
};
