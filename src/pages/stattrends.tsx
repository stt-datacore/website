import React from "react";
import DataPageLayout from "../components/page/datapagelayout";
import { GlobalContext } from "../context/globalcontext";
import { StatTrendsComponent } from "../components/stats/statsmain";

const StatTrends = () => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    return (
        <DataPageLayout
                pageTitle={t('stat_trends.title')}
                pageDescription={t('stat_trends.description')}
            >
            <StatTrendsComponent />
        </DataPageLayout>)
}

export default StatTrends;