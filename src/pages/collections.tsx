import React from 'react';

import DataPageLayout from "../components/page/datapagelayout";
import CollectionsTool from '../components/collections/collectionstool';
import { DataContext } from '../context/datacontext';
import { PlayerContext } from '../context/playercontext';

const CollectionsPage = () => {
    const context = React.useContext(PlayerContext);
    return (
        <DataPageLayout pageTitle={!!context.playerData ? "Collection Planner" : "Collections"} playerPromptType='recommend' demands={['collections']}>
            <CollectionsTool />
        </DataPageLayout>
    )
}

export default CollectionsPage;