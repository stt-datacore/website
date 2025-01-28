import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import ProfileCharts from '../components/profile_charts';


const ChartsPage = () => {

    return <DataPageLayout pageTitle='My Charts & Stats' demands={['episodes']}>
        <ProfileCharts />
    </DataPageLayout>
}

export default ChartsPage;

