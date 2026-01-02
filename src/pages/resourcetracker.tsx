import React from "react"
import DataPageLayout from "../components/page/datapagelayout"
import { GlobalContext } from "../context/globalcontext"
import { ResourceTracker } from "../components/tracker/restracker";

export const ResourceTrackerPage = () => {

    const globalContext = React.useContext(GlobalContext);
    const {  } = globalContext;
    const { t } = globalContext.localized;
    return <DataPageLayout
                playerPromptType="require"
                pageTitle={t('resource_tracker.title')}>
        <ResourceTracker />
    </DataPageLayout>
}

export default ResourceTrackerPage;