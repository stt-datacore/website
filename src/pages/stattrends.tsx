import React from "react";
import DataPageLayout from "../components/page/datapagelayout";
import { GlobalContext } from "../context/globalcontext";
import { StatTrendsComponent } from "../components/stats/statsmain";
import { StatsDataProvider } from "../components/stats/dataprovider";

const StatTrends = () => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { sync_time } = globalContext.core;

    return (
        <DataPageLayout
                demands={['collections', 'keystones', 'cadet', 'missions', 'portal_log', 'event_stats', 'event_scoring', 'event_instances']}
                pageTitle={t('stat_trends.title')}
                pageDescription={t('stat_trends.description')}
            >
            <React.Fragment>
                <div style={{fontSize: '1em', margin: '1em 0'}}>
                    {t('stat_trends.last_sync_timestamp{{:}}')}&nbsp;<b>{sync_time.toLocaleString()}</b>
                </div>
                <StatsDataProvider>
                    <StatTrendsComponent />
                </StatsDataProvider>
            </React.Fragment>
        </DataPageLayout>)
}

export default StatTrends;