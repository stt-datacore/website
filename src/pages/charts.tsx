import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import Charts from '../components/fleetbossbattles';
import ProfileCharts from '../components/profile_charts';


const ChartsPage = () => {

    return <DataPageLayout pageTitle='Fleet Boss Battles'>
        <ProfileCharts />
    </DataPageLayout>
}

export default ChartsPage;

