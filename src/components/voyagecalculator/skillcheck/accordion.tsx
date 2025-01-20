import React from 'react';
import {
	Accordion,
	Button,
	Header,
	Icon,
	Segment,
	SemanticICONS
} from 'semantic-ui-react';

import { IVoyageCalcConfig } from '../../../model/voyage';
import { ILineupEditorTrigger } from '../lineupeditor/lineupeditor';
import { ProficiencyCheck } from './proficiencycheck';
import { SkillCheck } from './skillcheck';

type SkillCheckAccordionProps = {
	voyageConfig: IVoyageCalcConfig;
	launchLineupEditor?: (trigger: ILineupEditorTrigger) => void;
};

export const SkillCheckAccordion = (props: SkillCheckAccordionProps) => {
	const { voyageConfig, launchLineupEditor } = props;

	const [isActive, setIsActive] = React.useState<boolean>(false);

	return (
		<Accordion>
			<Accordion.Title
				active={isActive}
				onClick={() => setIsActive(!isActive)}
			>
				<Icon name={isActive ? 'caret down' : 'caret right' as SemanticICONS} />
				Skill check
			</Accordion.Title>
			<Accordion.Content active={isActive}>
				{isActive && (
					<Segment>
						<SkillCheck
							id='result/skillcheck'
							voyageConfig={voyageConfig}
							highlightedSkills={[]}
							setHighlightedSkills={() => {}}
						/>
						{voyageConfig.voyage_type === 'encounter' && (
							<React.Fragment>
								<Header as='h4'>
									Proficiency
								</Header>
								<ProficiencyCheck
									id='result/proficiencycheck'
									voyageConfig={voyageConfig}
								/>
							</React.Fragment>
						)}
						{launchLineupEditor && (
							<div style={{ marginTop: '2em', textAlign: 'right' }}>
								<Button /* Edit lineup */
									content='Edit lineup'
									icon='pencil'
									onClick={() => launchLineupEditor({ view: 'crewpicker' })}
								/>
							</div>
						)}
					</Segment>
				)}
			</Accordion.Content>
		</Accordion>
	);
};
