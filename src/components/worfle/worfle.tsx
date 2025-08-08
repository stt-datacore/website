import React from 'react';
import {
	Icon,
	Menu
} from 'semantic-ui-react';

import { CrewMember } from '../../model/crew';
import { PlayerCrew } from '../../model/player';
import { GlobalContext } from '../../context/globalcontext';

import { PortalCrewContext } from './context';
import { DEFAULT_GUESSES } from './game';
import { DailyGame } from './dailygame';
import { PracticeGame } from './practicegame';

export const Worfle = () => {
	const [portalCrew, setPortalCrew] = React.useState<CrewMember[]>([]);
	const context = React.useContext(GlobalContext);

	function fetchAllCrew() {
		const allcrew = context.core.crew;
		// Sort here to ensure consistency for seedrandom
		const portalcrew = allcrew.filter(crew => crew.in_portal).sort((a, b) => a.name.localeCompare(b.name));
		// Fix incorrect series; changes here are consistent with unofficial Trait Audit thread:
		//	https://forum.wickedrealmgames.com/stt/discussion/18700/trait-audit-thread
		const fixes = [
			/* Missing series */
			{ symbol: 'data_mirror_crew', series: 'tng', audit: '+' },
			/* Incorrect series */
			{ symbol: 'cartwright_crew', series: 'tos', audit: '-tng' },
			{ symbol: 'chang_general_crew', series: 'tos', audit: '-tng' },
			{ symbol: 'earp_wyatt_crew', series: 'tos', audit: '-tng' },
			{ symbol: 'janeway_admiral_crew', series: 'tng', audit: '-voy' },
			{ symbol: 'jarok_crew', series: 'tng', audit: '-ds9' },
			{ symbol: 'keiko_bride_crew', series: 'tng', audit: '-ds9' },
			{ symbol: 'kirk_generations_crew', series: 'tng', audit: '-tos' },
			{ symbol: 'laforge_captain_crew', series: 'voy', audit: '-tng' },
			{ symbol: 'marcus_wok_crew', series: 'tos', audit: '-tng' },
			{ symbol: 'scott_movievest_crew', series: 'tng', audit: '-tos' },
			{ symbol: 'spock_ambassador_crew', series: 'tng', audit: '-tos' },
			{ symbol: 'sulu_demora_ensign_crew', series: 'tng', audit: '-tos' },
			{ symbol: 'trul_subcommander_crew', series: 'ds9', audit: '-tng' },
			{ symbol: 'worf_midwife_crew', series: 'tng', audit: '-ds9' }
		];
		fixes.forEach(fix => {
			const pc = portalcrew.find(crew => crew.symbol === fix.symbol);
			if (pc) pc.series = fix.series;	// Not everyone is in the portal
		});
		setPortalCrew(portalcrew);
	}

	React.useEffect(() => {
		fetchAllCrew();
	}, [context]);

	if (!portalCrew) return <></>;

	return (
		<PortalCrewContext.Provider value={portalCrew as PlayerCrew[]}>
			<WorfleTabs />
		</PortalCrewContext.Provider>
	);
};

const WorfleTabs = () => {
	const [activeItem, setActiveItem] = React.useState('daily');

	const menuItems = [
		{ name: 'daily', title: 'Daily Game' },
		{ name: 'practice', title: 'Practice Game' },
		{ name: 'instructions', title: <span><Icon name='question circle outline' /> How to Play</span> }
	];

	return (
		<React.Fragment>
			<Menu>
				{menuItems.map(item => (
					<Menu.Item key={item.name} name={item.name} active={activeItem === item.name} onClick={() => setActiveItem(item.name)}>
						{item.title}
					</Menu.Item>
				))}
			</Menu>
			{activeItem === 'daily' && <DailyGame />}
			{activeItem === 'practice' && <PracticeGame />}
			{activeItem === 'instructions' && renderInstructions()}
		</React.Fragment>
	);

	function renderInstructions(): JSX.Element {
		const adjacentStyle = { backgroundColor: 'yellow', color: 'black', padding: '3px .5em' };

		return (
			<React.Fragment>
				<p>How well do you know the characters from Star Trek Timelines? We pick one mystery crew member every day. Guess who it is, using your knowledge of <b>Variants</b>, <b>Series</b>, <b>Rarity</b>, <b>Skills</b>, and <b>Traits</b> to help narrow the possibilities. You have <b>{DEFAULT_GUESSES} tries</b> to guess the mystery crew.</p>
				<p>Only crew that are currently <b>available in the time portal</b> will be used as mystery crew and valid guesses.</p>
				<p>Anything <span style={{ backgroundColor: 'green', padding: '3px .5em' }}>highlighted green</span> indicates an exact match between your guess and the mystery crew on one or more of these criteria: series, rarity, or skills.</p>
				<p>A <span style={adjacentStyle}>yellow crew name</span> indicates the mystery crew is a variant* of your guess.</p>
				<p>A <span style={adjacentStyle}>yellow series</span> indicates the mystery crew is from a different series* in the same production era as your guess. The possible eras are:</p>
				<ol>
					<li>The Original Series, The Animated Series, and the first 6 films</li>
					<li>The Next Generation, Deep Space Nine, Voyager, Enterprise, and the 4 TNG films</li>
					<li>Discovery, Picard, and other shows from the current streaming era</li>
					<li>Star Trek Timelines Originals (non-canonical crew)</li>
				</ol>
				<p>A <span style={adjacentStyle}>yellow rarity</span> indicates the mystery crew has a max rarity that is either 1 star higher or 1 star lower than your guess.</p>
				<p>"<b>Skill Order</b>" lists the guessed crew's skills from highest to lowest base value. A <span style={adjacentStyle}>yellow skill</span> indicates the mystery crew has that skill, but not in the same position as your guess.</p>
				<p>"<b>Traits in Common</b>" identify the traits* your guess and the mystery crew share in common.</p>
				<p>If you need a little help, feel free to use the "Show hints" button on the crew picker. Hints identify a crew's series, rarity, and number of skills.</p>
				<p>* All information used here comes directly from the Star Trek Timelines game data. Variants, series, and traits may not always be what you expect; please see <a href='https://forum.wickedrealmgames.com/stt/discussion/18700/trait-audit-thread'>this thread</a> for known issues.</p>
			</React.Fragment>
		);
	}
};
