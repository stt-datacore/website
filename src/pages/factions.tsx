import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import FactionInfo from '../components/factions';


const FactionsPage = () => {

    return <DataPageLayout pageTitle='Factions' playerPromptType='require'>
        <FactionInfo />
    </DataPageLayout>
}

export default FactionsPage;

