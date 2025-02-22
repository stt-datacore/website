import React from 'react';
import {
	Button,
	Form
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';
import { GlobalContext } from '../../../context/globalcontext';
import CONFIG from '../../CONFIG';

type SkillTogglerProps = {
	value: string[];
	setValue: (skills: string[]) => void;
	maxSkills?: number;
};

export const SkillToggler = (props: SkillTogglerProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { value, setValue } = props;

	const maxSkills: number = props.maxSkills ?? 3;

	return (
		<Form.Field inline>
			<label>{t('hints.filter_by_skill')}{t('global.colon')}</label>
			<Button.Group>
				{Object.keys(CONFIG.SKILLS).map(skill => (
					<Button
						key={skill}
						color={value.includes(skill) ? 'blue' : undefined}
						onClick={() => toggleSkill(skill)}
					>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} style={{ height: '1.1em' }} />
					</Button>
				))}
			</Button.Group>
		</Form.Field>
	);

	function toggleSkill(skill: string): void {
		const addSkill: boolean = !value.includes(skill);
		let skills: string[] = [];
		// Toggle skill if only 1 skill allowed
		if (maxSkills === 1) {
			if (addSkill) skills = [skill];
		}
		// Otherwise toggle skill until maxSkills is reached
		else {
			if (addSkill && value.length === maxSkills) return;
			skills = value.filter(s => s !== skill);
			if (addSkill) skills.push(skill);
		}
		setValue([...skills]);
	}
};

export function crewMatchesSkillFilter(crew: PlayerCrew, skillFilter: string[]): boolean {
	if (skillFilter.length === 0) return true;
	return skillFilter.every(skill => Object.keys(crew.base_skills).includes(skill));
}
