import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import ProfileShips from '../components/profile_ships';

const ShipsPage = () => {

    return <DataPageLayout playerPromptType='recommend' pageTitle='Ships'>
        <ProfileShips />
    </DataPageLayout>
}

export default ShipsPage;

