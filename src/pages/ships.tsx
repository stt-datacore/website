import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import ShipTable from '../components/ship/shiptable';
import { GlobalContext } from '../context/globalcontext';
import { WorkerProvider } from '../context/workercontext';

const ShipsPage = () => {
    const { t } = React.useContext(GlobalContext).localized;
    return <DataPageLayout demands={['all_ships']} playerPromptType='recommend' pageTitle={t('pages.ships')}>
        <ShipTable />
    </DataPageLayout>
}

export default ShipsPage;

