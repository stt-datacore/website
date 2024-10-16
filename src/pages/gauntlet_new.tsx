import React from "react";
import { GauntletDataProvider } from "../components/gauntlet/dataprovider";
import { GauntletPicker } from "../components/gauntlet/gauntletpicker";

const GauntletNew = () => {
    return <React.Fragment>
        <GauntletDataProvider>
            <GauntletPicker />
        </GauntletDataProvider>
    </React.Fragment>
}

export default GauntletNew;