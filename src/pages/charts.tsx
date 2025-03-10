import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import ProfileCharts from '../components/profile_charts';
import { GlobalContext } from '../context/globalcontext';

const ChartsPage = () => {
    return <DataPageLayout pageTitle='My Charts & Stats' demands={['episodes']}>
        <ChartsContainer />
    </DataPageLayout>
}

const ChartsContainer = () => {
    const globalContext = React.useContext(GlobalContext);
    const { items, crew: allCrew } = globalContext.core;

    return <ProfileCharts items={items} allCrew={allCrew} />
}

export default ChartsPage;

