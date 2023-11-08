import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import UnneededItems from '../components/unneededitems';

const UnneededItemsPage = () => {

    return <DataPageLayout pageTitle='Unneeded Items'>
        <UnneededItems />
    </DataPageLayout>
}

export default UnneededItemsPage;

