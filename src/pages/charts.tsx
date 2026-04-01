import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import ProfileCharts from '../components/profile_charts';

const ChartsPage = () => {
    return (
        <DataPageLayout
            pageTitle='My Charts & Stats'
            playerPromptType='require'
            demands={['episodes', 'items', 'cadet', 'all_buffs', 'all_ships', 'cadet', 'collections']}>
            <ProfileCharts />
        </DataPageLayout>
    )
}

export default ChartsPage;

