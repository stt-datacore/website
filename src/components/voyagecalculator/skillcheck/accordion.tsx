import React from 'react';
import {
	Accordion,
	Button,
	Header,
	Icon,
	Segment,
	SemanticICONS
} from 'semantic-ui-react';

import { IVoyageCalcConfig, IVoyageCrew } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';
import { ILineupEditorTrigger } from '../lineupeditor/lineupeditor';
import { ProficiencyCheck } from '../encounters/proficiencycheck/proficiencycheck';
import { SkillCheck } from './skillcheck';

type SkillCheckAccordionProps = {
	voyageConfig: IVoyageCalcConfig;
	roster: IVoyageCrew[];
	launchLineupEditor?: (trigger: ILineupEditorTrigger) => void;
	highlightedSkills?: string[];
	setHighlightedSkills?: (value: string[]) => void
};

export const SkillCheckAccordion = (props: SkillCheckAccordionProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { voyageConfig, roster, launchLineupEditor } = props;

	const [isActive, setIsActive] = React.useState<boolean>(false);

	const [highlightedSkills, setHighlightedSkills] = React.useMemo(() => {
		if (props.highlightedSkills && props.setHighlightedSkills) {
			return [props.highlightedSkills, props.setHighlightedSkills];
		}
		else return [[], () => false];
	}, [props.highlightedSkills, props.setHighlightedSkills]);

	return (
		<Accordion>
			<Accordion.Title	/* Skill check */
				active={isActive}
				onClick={() => setIsActive(!isActive)}
			>
				<Icon name={isActive ? 'caret down' : 'caret right' as SemanticICONS} />
				{t('voyage.skill_check.title')}
			</Accordion.Title>
			<Accordion.Content active={isActive}>
				{isActive && (
					<Segment>
						<SkillCheck
							highlightedSkills={highlightedSkills}
							setHighlightedSkills={setHighlightedSkills}
							id='result/skillcheck'
							voyageConfig={voyageConfig}
						/>
						{voyageConfig.voyage_type === 'encounter' && (
							<React.Fragment>
								<Header	/* Proficiency */
									as='h4'
								>
									{t('base.proficiency')}
								</Header>
								<ProficiencyCheck
									id='result/proficiencycheck'
									voyageConfig={voyageConfig}
									roster={roster}
								/>
							</React.Fragment>
						)}
						{launchLineupEditor && (
							<div style={{ marginTop: '2em', textAlign: 'right' }}>
								<Button /* Edit lineup */
									content={t('voyage.results.actions.edit')}
									icon='pencil'
									onClick={() => launchLineupEditor({ view: 'summary' })}
								/>
							</div>
						)}
					</Segment>
				)}
			</Accordion.Content>
		</Accordion>
	);
};
