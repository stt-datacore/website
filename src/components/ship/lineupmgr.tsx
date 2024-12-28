import React from "react";
import { useStateWithStorage } from "../../utils/storage";
import { GlobalContext } from "../../context/globalcontext";
import { Segment } from "semantic-ui-react";


export interface LineupConfig {
    name: string;
    ship: string;
    staff: (string | number)[];
}

export interface LineupManagerProps {
    currentConfig?: LineupConfig;
    setCurrentConfig: (value?: LineupConfig) => void;
}

export const LineupManager = (props: LineupManagerProps) => {

    const { currentConfig, setCurrentConfig } = props;

    const globalContext = React.useContext(GlobalContext);

    const dbid = globalContext.player.playerData?.player.dbid.toString() || '';

    const [lineups, setLineups] = useStateWithStorage(`${dbid}/ship_lineups`, [] as LineupConfig[], { rememberForever: true });

    return <Segment>


    </Segment>




    function clearLineups() {
        setLineups([]);
    }

    function exportLineupConfig() {

    }

    function importLineupConfig() {

    }
}