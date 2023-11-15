


import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import CiteOptimizer from '../components/citeoptimizer';
import { ContinuumComponent } from '../components/continuum_helper';
import { GlobalContext } from '../context/globalcontext';


const ContinuumPage = () => {

    const context = React.useContext(GlobalContext);
    const { crew } = context.player.playerData ? context.player.playerData.player.character : context.core;

    return <DataPageLayout playerPromptType='recommend' pageTitle='Continuum Mission Helper' demands={['missionsfull', 'continuum_missions']}>
        <ContinuumComponent roster={crew} />
    </DataPageLayout>
}

export default ContinuumPage;

