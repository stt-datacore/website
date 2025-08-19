import React from 'react';
import {
	Label,
	Segment
} from 'semantic-ui-react';

import { WorfleContext } from './context';
import { DEFAULT_GUESSES } from './game';

export const GameInstructions = () => {
	const { roster } = React.useContext(WorfleContext);

	const exactStyle: React.CSSProperties = {
		backgroundColor: 'green',
		color: 'white',
		padding: '3px .5em'
	};

	const adjacentStyle: React.CSSProperties = {
		backgroundColor: 'yellow',
		color: 'black',
		padding: '3px .5em'
	};

	return (
		<React.Fragment>
			<p>How well do you know the characters from Star Trek Timelines? We pick one mystery crew member every day. Guess who it is, using your knowledge of <b>Variants</b>, <b>Series</b>, <b>Rarity</b>, <b>Skills</b>, and <b>Traits</b> to help narrow the possibilities. You have <b>{DEFAULT_GUESSES} tries</b> to guess the mystery crew.</p>
			<p>Only crew who are currently <b>available in the time portal</b> will be used as mystery crew.</p>
			<p>Anything <span style={exactStyle}>highlighted green</span> indicates an exact match between your guess and the mystery crew on one or more of these criteria: series, rarity, or skills.</p>
			<p>A <span style={adjacentStyle}>yellow crew name</span> indicates the mystery crew is a variant* of your guess.</p>
			<p>A <span style={adjacentStyle}>yellow series</span> indicates the mystery crew is from a different series** in the same production era as your guess. The possible eras are:</p>
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
			<p>* All information used here comes directly from the Star Trek Timelines game data. Variants and traits may not always be what you expect; please see <a href='https://forum.wickedrealmgames.com/stt/discussion/18700/trait-audit-thread'>this thread</a> for known issues.</p>
			<p>** Some crew will be excluded as mystery crew because their in-game traits are misleading. The crew known to have misleading traits are:</p>
			<Segment>
				<Label.Group>
					{roster.filter(crew => crew.gamified_series === 'n/a').map(crew => (
						<Label key={crew.symbol}>{crew.name}</Label>
					))}
				</Label.Group>
			</Segment>
		</React.Fragment>
	);
};
