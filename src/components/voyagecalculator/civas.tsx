import React from 'react';
import {
	Button,
	Popup,
	Message
} from 'semantic-ui-react';

import { Voyage } from '../../model/player';
import { Estimate, IVoyageCalcConfig } from '../../model/voyage';
import { UnifiedWorker } from '../../typings/worker';
import CONFIG from '../CONFIG';

type CIVASMessageProps = {
	voyageConfig: IVoyageCalcConfig | Voyage;
	estimate?: Estimate;
	activeDetails?: {
		created_at: string;
		log_index: number;
		hp: number;
	}
};

export const CIVASMessage = (props: CIVASMessageProps) => {
	const CIVASLink = 'https://docs.google.com/spreadsheets/d/1utIuwIgIRO7mwYMSP3P9eWEygf1YT9k24A8BZ_l4pOw/edit?usp=sharing';
	const CIVASVer = '2.1';

	enum ExportState {
		None,
		InProgress,
		Ready,
		Done
	};

	const { voyageConfig, activeDetails } = props;
	const [estimate, setEstimate] = React.useState<Estimate | undefined>(undefined);
	const [exportState, setExportState] = React.useState(ExportState.None);

	React.useEffect(() => {
		if (props.estimate) setEstimate(props.estimate);
	}, [props.estimate]);

	React.useEffect(() => {
		if (exportState === ExportState.Ready) copyToClipboard();
	}, [exportState]);

	if (!navigator.clipboard) return (<></>);

	return (
		<React.Fragment>
			<Message style={{ marginTop: '2em' }}>
				<Message.Content>
					<Message.Header>Captain Idol's Voyage Analysis Sheet</Message.Header>
					<p>Pro tip: use <b><a href={CIVASLink} target='_blank'>Captain Idol's Voyage Analysis Sheet</a></b> to help you keep track of your voyagers, runtimes, and estimates. Click the button below to copy the details of {voyageConfig.state !== 'pending' ? 'your active voyage' : 'this recommendation'} to the clipboard so that the relevant data can be pasted directly into your CIVAS Google Sheet (currently v{CIVASVer}).</p>
					<Popup
						content={exportState === ExportState.Done ? 'Copied!' : 'Please wait...'}
						on='click'
						position='right center'
						size='tiny'
						trigger={
							<Button icon='clipboard' content='Copy details to clipboard' onClick={() => exportData()} />
						}
					/>
				</Message.Content>
			</Message>
		</React.Fragment>
	);

	function exportData(): void {
		if (exportState === ExportState.InProgress) return;
		if (estimate) {
			copyToClipboard();
			return;
		}

		setExportState(ExportState.InProgress);
		const config = {
			startAm: voyageConfig.max_hp,
			ps: voyageConfig.skill_aggregates[voyageConfig.skills['primary_skill']],
			ss: voyageConfig.skill_aggregates[voyageConfig.skills['secondary_skill']],
			others: Object.values(voyageConfig.skill_aggregates).filter(s => !Object.values(voyageConfig.skills).includes(s.skill))
		};
		const VoyageEstConfig = {
			config,
			worker: 'voyageEstimate'
		};
		const worker = new UnifiedWorker();
		worker.addEventListener('message', message => {
			if (!message.data.inProgress) {
				setEstimate(message.data.result);
				setExportState(ExportState.Ready);
			}
		});
		worker.postMessage(VoyageEstConfig);
	}

	function copyToClipboard(): void {
		const hoursToTime = (hours: number) => {
			let wholeHours = Math.floor(hours);
			return `${wholeHours}:${Math.floor((hours-wholeHours)*60).toString().padStart(2, '0')}`
		};

		const skillToShort = (skillName: string) => CONFIG.SKILLS_SHORT.find(skill => skill.name === skillName)?.short ?? '';
		// Pending voyages don't have a created_date yet
		const createdAt = activeDetails ? new Date(activeDetails.created_at) : new Date();

		let values = [
			skillToShort(voyageConfig.skills['primary_skill'])+'/'+skillToShort(voyageConfig.skills['secondary_skill']),
			createdAt.toISOString().split('T')[0],
			estimate ? hoursToTime(estimate.refills[0].result) : ''
		] as string[];
		values.push(voyageConfig.state === 'recalled' && activeDetails ? hoursToTime(activeDetails.log_index/180) : '');
		values.push(voyageConfig.state === 'recalled' && activeDetails ? `${activeDetails.hp}` : '');
		values = values.concat(voyageConfig
			.crew_slots
			.sort((s1, s2) => CONFIG.VOYAGE_CREW_SLOTS.indexOf(s1.symbol) - CONFIG.VOYAGE_CREW_SLOTS.indexOf(s2.symbol))
			.map(s => s.crew.name)
		);

		navigator.clipboard.writeText(values.join('\t'));
		setExportState(ExportState.Done);
	}
};
