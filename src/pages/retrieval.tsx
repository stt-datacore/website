import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import CrewRetrieval from '../components/crewretrieval';

const CrewRetrievalPage = () => {

    return <DataPageLayout playerPromptType='require' pageTitle='Crew Retrieval'>
        <CrewRetrieval />
    </DataPageLayout>
}

export default CrewRetrievalPage;

