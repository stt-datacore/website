import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import ProfileShips from '../components/profile_ships';
import { GlobalContext } from '../context/globalcontext';
import { WorkerProvider } from '../context/workercontext';

const ShipsPage = () => {
    const { t } = React.useContext(GlobalContext).localized;
    return <DataPageLayout playerPromptType='recommend' pageTitle={t('pages.ships')}>
        <ProfileShips />
    </DataPageLayout>
}

export default ShipsPage;

