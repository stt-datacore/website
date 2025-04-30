import React from "react"
import { GlobalContext } from "../context/globalcontext"
import DataPageLayout from "../components/page/datapagelayout";
import { FTMHof } from "../components/ftm/ftmhof";



const FTMHofPage = () => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    return <React.Fragment>
        <DataPageLayout
            pageTitle={t('menu.game_info.ftm_hof')}
            pageDescription={t('ftm.description')}
            demands={['ftm_log']}>
            <FTMHof />
        </DataPageLayout>
    </React.Fragment>
}

export default FTMHofPage;