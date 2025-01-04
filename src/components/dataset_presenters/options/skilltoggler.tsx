import React from 'react';
import {
	Button,
	Form
} from 'semantic-ui-react';

import CONFIG from '../../CONFIG';
import { PlayerCrew } from '../../../model/player';

type SkillTogglerProps = {
	value: string[];
	setValue: (skills: string[]) => void;
};

export const SkillToggler = (props: SkillTogglerProps) => {
	const { value, setValue } = props;

	return (
		<Form.Field inline>
			<label>Filter by skills:</label>
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
		if (addSkill && value.length === 3) return;
		const skills: string[] = value.filter(s => s !== skill);
		if (addSkill) skills.push(skill);
		setValue([...skills]);
	}
};

export function crewMatchesSkillFilter(crew: PlayerCrew, skillFilter: string[]): boolean {
	if (skillFilter.length === 0) return true;
	return skillFilter.every(skill => Object.keys(crew.base_skills).includes(skill));
}
