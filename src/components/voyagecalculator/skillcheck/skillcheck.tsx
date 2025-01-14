import React from 'react';
import {

} from 'semantic-ui-react';

import { IVoyageCalcConfig } from '../../../model/voyage';

import { IDataGridSetup, IEssentialData } from '../../dataset_presenters/model';
import { DataGrid } from '../../dataset_presenters/datagrid';

import { IProspectiveConfig } from '../lineupeditor/model';

import { getSkillData, ISkillData } from './skilldata';
import { SkillDetail } from './skilldetail';

type SkillCheckProps = {
	id: string;
	voyageConfig: IVoyageCalcConfig | IProspectiveConfig;
	baselineConfig?: IVoyageCalcConfig;
};

export const SkillCheck = (props: SkillCheckProps) => {
	const { id, voyageConfig, baselineConfig } = props;

	const data = React.useMemo<ISkillData[]>(() => {
		return getSkillData(voyageConfig);
	}, [voyageConfig]);

	const baselineData = React.useMemo<ISkillData[] | undefined>(() => {
		if (!baselineConfig) return;
		return getSkillData(baselineConfig);
	}, [baselineConfig]);

	const gridSetup: IDataGridSetup = {
		gridProps: {
			centered: true,
			columns: 3,
			stackable: true
		},
		renderGridColumn: (datum: IEssentialData) => renderSkill(datum as ISkillData),
		defaultSort: { id: 'score', firstSort: 'descending' }
	};

	return (
		<DataGrid
			id={`${id}/datagrid`}
			data={data}
			setup={gridSetup}
		/>
	);

	function renderSkill(skillData: ISkillData): JSX.Element {
		const baselineSkillData: ISkillData | undefined = baselineData?.find(od =>
			od.skill === skillData.skill
		);
		return (
			<SkillDetail
				voyageConfig={voyageConfig}
				currentData={skillData}
				baselineData={baselineSkillData}
			/>
		);
	}
};
