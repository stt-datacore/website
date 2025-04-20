import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import { ShipTable } from '../components/ship/shiptable';
import { GlobalContext } from '../context/globalcontext';

const ShipsPage = () => {
    const { t } = React.useContext(GlobalContext).localized;
    return <DataPageLayout demands={['all_ships']} playerPromptType='recommend' pageTitle={t('pages.ships')}>
        <ShipTable pageId='main_ship_table' />
    </DataPageLayout>
}

export default ShipsPage;

