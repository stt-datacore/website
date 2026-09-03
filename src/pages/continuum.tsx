import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import { ContinuumComponentNew } from '../components/missions/continuum_new';
import { GlobalContext } from '../context/globalcontext';
import ContinuumTool from '../components/missions/continuum/continuum_tool';
import { MissionProvider } from '../components/missions/mission_provider';

const ContinuumPage = () => {

    const context = React.useContext(GlobalContext);
    const { t } = context.localized;
    const { playerData } = context.player;
    const { crew } = context.core;
    return <DataPageLayout playerPromptType='require' pageTitle={t('menu.tools.continuum_helper')} demands={['items', 'missionsfull', 'continuum_missions', 'maincast']}>
        <ContinuumComponentNew roster={playerData?.player.character.crew ?? crew} />
    </DataPageLayout>
}

export default ContinuumPage;

