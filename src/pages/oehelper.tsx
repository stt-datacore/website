import React from "react";
import { OEPicker } from "../components/objective_events/oepicker";
import DataPageLayout from "../components/page/datapagelayout";
import { GlobalContext } from "../context/globalcontext";



const ObjectiveEventHelperPage = () => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    return <DataPageLayout
            pageTitle={t('menu.tools.objective_event_helper')}
            demands={['objective_events']}>
        <OEPicker />
    </DataPageLayout>

}

export default ObjectiveEventHelperPage;