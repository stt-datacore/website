import React from 'react';

import DataPageLayout from "../components/page/datapagelayout";
import CollectionsTool from '../components/collections/collectionstool';
import { GlobalContext } from '../context/globalcontext';

const CollectionsPage = () => {
    const context = React.useContext(GlobalContext);
    
    return (
        <DataPageLayout pageTitle={!!context.player.playerData ? "Collection Planner" : "Collections"} playerPromptType='recommend' demands={['collections']}>
            <CollectionsTool />
        </DataPageLayout>
    )
}

export default CollectionsPage;