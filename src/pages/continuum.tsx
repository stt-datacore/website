import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import { ContinuumComponent } from '../components/missions/continuum_helper';
import { GlobalContext } from '../context/globalcontext';
import ContinuumTool from '../components/missions/continuum/continuum_tool';
import { MissionProvider } from '../components/missions/mission_provider';

const ContinuumPage = () => {

    const context = React.useContext(GlobalContext);
    const { t } = context.localized;

    return <DataPageLayout playerPromptType='require' pageTitle={t('menu.tools.continuum_helper')} demands={['items', 'missionsfull', 'continuum_missions']}>
        <MissionProvider continuum>
            <ContinuumTool />
        </MissionProvider>
    </DataPageLayout>
}

export default ContinuumPage;

