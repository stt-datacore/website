import React from 'react';
import {
	Button,
	Header,
	Modal
} from 'semantic-ui-react';

import { IVoyageCalcConfig } from '../../../model/voyage';
import { ILineupEditorTrigger } from '../lineupeditor/lineupeditor';
import { ProficiencyCheck } from './proficiencycheck';
import { SkillCheck } from './skillcheck';

type SkillCheckModalProps = {
	voyageConfig: IVoyageCalcConfig;
	dismissModal: () => void;
	launchLineupEditor?: (trigger: ILineupEditorTrigger) => void;
};

export const SkillCheckModal = (props: SkillCheckModalProps) => {
	const { voyageConfig, dismissModal, launchLineupEditor } = props;

	return (
		<Modal
			open={true}
			onClose={() => dismissModal()}
			centered={false}
		>
			<Modal.Header	/* Lineup Skill Check */>
				Lineup Skill Check
			</Modal.Header>
			<Modal.Content scrolling>
				<SkillCheck
					id='result/skillcheck'
					voyageConfig={voyageConfig}
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
			</Modal.Content>
			<Modal.Actions>
				{renderActions()}
			</Modal.Actions>
		</Modal>
	);

	function renderActions(): JSX.Element {
		return (
			<React.Fragment>
				{launchLineupEditor && (
					<Button /* Edit lineup */
						content='Edit lineup'
						icon='pencil'
						onClick={() => {
							launchLineupEditor({ view: 'crewpicker' });
							dismissModal();
						}}
					/>
				)}
				<Button	/* Close */
					content='Close'
					onClick={dismissModal}
				/>
			</React.Fragment>
		);
	}
};
