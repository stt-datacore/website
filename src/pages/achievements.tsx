import React from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import ProfileOther from '../components/profile_other';
import { GlobalContext } from '../context/globalcontext';


const OtherPage = () => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    return <DataPageLayout pageTitle={t('menu.player.my_achievements')}>
        <ProfileOther />
    </DataPageLayout>
}

export default OtherPage;

