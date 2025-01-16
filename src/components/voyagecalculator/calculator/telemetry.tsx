import React from 'react';
import {
	Checkbox,
	Form,
	Message
} from 'semantic-ui-react';
import { Link } from 'gatsby';

import { CrewMember } from '../../../model/crew';
import { PlayerData } from '../../../model/player';
import { IResultProposal, IVoyageInputConfig } from '../../../model/voyage';
import { BuffStatTable } from '../../../utils/voyageutils';
import CONFIG from '../../CONFIG';
import { UserPrefsContext } from './userprefs';

export const TelemetryOptions = () => {
	const userPrefs = React.useContext(UserPrefsContext);
	return (
		<Message style={{ marginTop: '2em' }}>
			<Message.Content>
				<Message.Header>Privacy Notice</Message.Header>
				<p>We use anonymous statistics aggregated from voyage calculations to improve DataCore and power our <b><Link to='/hall_of_fame'>Voyage Hall of Fame</Link></b>.</p>
				<Form>
					<Form.Field
						control={Checkbox}
						label={<label>Permit DataCore to collect anonymous voyage stats</label>}
						checked={userPrefs.telemetryOptIn}
						onChange={(e, { checked }) => userPrefs.setTelemetryOptIn(checked) }
					/>
				</Form>
			</Message.Content>
		</Message>
	);
};

export function sendCalcResultTelemetry(
	voyageConfig: IVoyageInputConfig,
	calculator: string,
	calcResult: IResultProposal,
	allCrew: CrewMember[],
	playerData: PlayerData,
	buffConfig: BuffStatTable | undefined
): void {
	const estimatedDuration = calcResult.estimate.refills[0].result*60*60;

	let allGolds = allCrew.filter(f => f.max_rarity === 5).map(c => c.symbol);
	let maxxedGolds = [ ... new Set(playerData.player.character.crew.filter(f => f.max_rarity === 5 && f.immortal && f.immortal < 0).map(c => c.symbol)) ];
	let frozenGolds = [ ... new Set(playerData.player.character.crew.filter(f => f.max_rarity === 5 && f.immortal && f.immortal > 0).map(c => c.symbol)) ];

	let goldCount = allGolds.length;
	let frozenCount = frozenGolds.filter(c => !maxxedGolds.includes(c)).length;
	let maxxedCount = maxxedGolds.length;

	const immortalRatio = maxxedCount / goldCount;
	const frozenRatio = frozenCount / goldCount;

	const quipment = calcResult.entries.map(entry => entry.choice).map(rc => {
		const pc = playerData.player.character.crew.find(crew => crew.id === rc.id);
		if (pc) return pc;
		return rc;
	}).map(c => {
		if (!c.kwipment) return 0;
		if (typeof c.kwipment[0] === 'number') {
			return c.kwipment;
		}
		else {
			return c.kwipment.map(q => q[1]);
		}
	});

	const telemetryData = {
		voyagers: calcResult.entries.map(entry => entry.choice.symbol),
		estimatedDuration,
		calculator,
		am_traits: voyageConfig.crew_slots.map(cs => cs.trait),
		ship_trait: voyageConfig.ship_trait,
		... voyageConfig.skills,
		extra_stats: {
			immortalRatio,
			frozenRatio,
			quipment,
			buffs: shrinkBuffs(buffConfig)
		}
	};

	try {
		fetch(`${process.env.GATSBY_DATACORE_URL}api/telemetry`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				type: 'voyageCalc',
				data: telemetryData
			})
		});
	}
	catch (err) {
		console.log('An error occurred while sending telemetry', err);
	}
}

function shrinkBuffs(buffs: BuffStatTable | undefined) {
	if (!buffs) return undefined;
	let output = {} as { [key: string]: { core: number, min: number, max: number } };

	CONFIG.SKILLS_SHORT.forEach((skill) => {
		output[skill.short] = {
			core: buffs[`${skill.name}_core`].percent_increase,
			max: buffs[`${skill.name}_range_max`].percent_increase,
			min: buffs[`${skill.name}_range_min`].percent_increase,
		}
	})

	return output;
}
