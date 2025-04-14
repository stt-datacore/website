import React from "react";
import DataPageLayout from "../components/page/datapagelayout";
import { GlobalContext } from "../context/globalcontext";
import { StatTrendsComponent } from "../components/stats/statsmain";
import { StatsDataProvider } from "../components/stats/dataprovider";

const StatTrends = () => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    return (
        <DataPageLayout
                demands={['collections', 'keystones', 'cadet', 'missions', 'portal_log', 'event_stats']}
                pageTitle={t('stat_trends.title')}
                pageDescription={t('stat_trends.description')}
            >
            <StatsDataProvider>
                <StatTrendsComponent />
            </StatsDataProvider>
        </DataPageLayout>)
}

export default StatTrends;