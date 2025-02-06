import React from 'react';

import DataPageLayout from "../components/page/datapagelayout";
import { CollectionPlanner } from '../components/collections/collectionplanner';
import { GlobalContext } from '../context/globalcontext';

const CollectionsPage = () => {
    const context = React.useContext(GlobalContext);
    const { t } = context.localized;
    return (
        <DataPageLayout pageTitle={!!context.player.playerData ? t('menu.tools.collection_planner') : t('base.collections')} playerPromptType='recommend' demands={['collections']}>
            <CollectionPlanner />
        </DataPageLayout>
    )
}

export default CollectionsPage;