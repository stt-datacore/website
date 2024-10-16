import React from "react";
import { Gauntlet } from "../../model/gauntlets";
import { GauntletPane } from "../../utils/gauntlet";
import { GauntletContext } from "./dataprovider";

export interface BrowsableViewProps {
    pane: GauntletPane;
}

export const BrowsableGauntletView = (props: BrowsableViewProps) => {

    const gauntletContext = React.useContext(GauntletContext);
    const { pane } = props;

    return <React.Fragment>

    </React.Fragment>
}