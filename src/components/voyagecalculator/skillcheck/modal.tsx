import React from 'react';
import {
	Button
} from 'semantic-ui-react';

import { IVoyageCalcConfig } from '../../../model/voyage';

import { IDataGridSetup, IEssentialData } from '../../dataset_presenters/model';
import { DataPicker, DataPickerLoading } from '../../dataset_presenters/datapicker';

import { ILineupEditorTrigger } from '../lineupeditor/lineupeditor';

import { SkillDetail } from './skilldetail';
import { getSkillData, ISkillData } from './skilldata';

type SkillCheckModalProps = {
	voyageConfig: IVoyageCalcConfig;
	dismissModal: () => void;
	launchLineupEditor?: (trigger: ILineupEditorTrigger) => void;
};

export const SkillCheckModal = (props: SkillCheckModalProps) => {
	const { voyageConfig, dismissModal, launchLineupEditor } = props;

	const [data, setData] = React.useState<ISkillData[] | undefined>(undefined);

	React.useEffect(() => {
		const data: ISkillData[] = getSkillData(voyageConfig);
		setData([...data]);
	}, [voyageConfig]);

	if (!data) return <DataPickerLoading />;

	const gridSetup: IDataGridSetup = {
		gridProps: {
			centered: true,
			columns: 3,
			stackable: true
		},
		renderGridColumn: (datum: IEssentialData) => (
			<SkillDetail
				voyageConfig={voyageConfig}
				currentData={datum as ISkillData}
			/>
		),
		defaultSort: { id: 'score', firstSort: 'descending' }
	};

	return (
		<DataPicker
			id='skillcheck'
			data={data}
			closePicker={dismissModal}
			title='Lineup Skill Check'
			renderActions={renderActions}
			gridSetup={gridSetup}
		/>
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
