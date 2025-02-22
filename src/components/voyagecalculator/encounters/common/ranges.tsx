import React from 'react';
import {
	Table
} from 'semantic-ui-react';

import { IContestSkill } from '../model';

type ProficiencyRangesProps = {
	skills: IContestSkill[];
	view?: 'list' | 'table';
	sort?: boolean;
};

export const ProficiencyRanges = (props: ProficiencyRangesProps) => {
	const { skills, view, sort } = props;

	// Table view is a potential alt view; not in use anywhere
	if (view === 'table') {
		return (
			<Table striped compact unstackable>
				<Table.Body>
					{skills.sort((a, b) => sort ? b.range_max - a.range_max : 0).map(skill => (
						<Table.Row key={skill.skill}>
							<Table.Cell textAlign='center'>
								<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.skill}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} className='invertibleIcon' />
							</Table.Cell>
							<Table.Cell textAlign='center' style={{ whiteSpace: 'nowrap' }}>
								{skill.range_min}-{skill.range_max}
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		);
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', rowGap: '.5em' }}>
			{skills.sort((a, b) => sort ? b.range_max - a.range_max : 0).map(skill => (
				<div key={skill.skill} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', columnGap: '.5em' }}>
					<div style={{ width: '2em' }}>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.skill}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} className='invertibleIcon' />
					</div>
					<div>
						{skill.range_max > 0 && <>{skill.range_min}-{skill.range_max}</>}
						{skill.range_max === 0 && <>No skill</>}
					</div>
				</div>
			))}
		</div>
	);
};
