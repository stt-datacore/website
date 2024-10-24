import React from "react";
import { GauntletDataProvider } from "../components/gauntlet/dataprovider";
import { GauntletPicker } from "../components/gauntlet/gauntletpicker";
import DataPageLayout from "../components/page/datapagelayout";
import { GlobalContext } from "../context/globalcontext";
import { WorkerProvider } from "../context/workercontext";

const GauntletNew = () => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    return <React.Fragment>
        <DataPageLayout
			pageTitle={t('menu.tools.gauntlet')}
			playerPromptType='recommend'
            demands={['gauntlets']}
		>
			<React.Fragment>
                <WorkerProvider>
                    <GauntletDataProvider>
                        <GauntletPicker />
                    </GauntletDataProvider>
                </WorkerProvider>
			</React.Fragment>
		</DataPageLayout>
    </React.Fragment>
}

export default GauntletNew;