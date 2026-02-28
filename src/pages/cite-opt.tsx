import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import { CiteOptComponent } from '../components/optimizer/citeopt';
import { GlobalContext } from '../context/globalcontext';


const CiteOptimizerPage = () => {
    const { t } = React.useContext(GlobalContext).localized;

    return <DataPageLayout playerPromptType='require' pageTitle={t('menu.tools.citation_optimizer')} demands={['collections', 'event_instances']}>
        <CiteOptComponent />
    </DataPageLayout>
}

export default CiteOptimizerPage;

