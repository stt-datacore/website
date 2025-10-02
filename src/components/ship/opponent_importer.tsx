import React from "react";

import { GlobalContext } from "../../context/globalcontext";

import { JsonInputForm } from "../base/jsoninputform";
import { Notification } from "../page/notification";
import { FleetDetails } from "../../model/fleet";
import { PvpRoot } from "../../model/pvp";

export interface OpponentImporterProps {
    division: 3 | 4 | 5,
    pvpData?: PvpRoot;
    setPvpData: (value?: PvpRoot) => void;
    setError?: (value: string) => void;
    clearPvpData: () => void;
    currentHasRemote?: boolean;
}

export const OpponentImportComponent = (props: OpponentImporterProps) => {

    const { division, currentHasRemote, setPvpData, clearPvpData } = props;
    const context = React.useContext(GlobalContext);
    const { playerData } = context.player;
    const { t } = context.localized;
    const divisions = {
        3: 'commander',
        4: 'captain',
        5: 'admiral'
    };
    const [collapsed, setCollapsed] = React.useState<boolean | undefined>(undefined);

    const hasPlayer = !!playerData;

    React.useEffect(() => {
        if (collapsed === undefined) setCollapsed(true);
    }, [currentHasRemote]);

    if (!playerData) return <></>


    return (<>

        <div className='ui segment'>
            {renderCopyPaste()}
        </div>

        </>)

    function validatePvp(json: PvpRoot): true | string {
        if (!json) {
            return ("No data");
        }
        if (json?.length !== 2) return 'Data does not appear to be PVP data';
        if (json[0].pvp_opponents?.length && json[1].pvp_division) return true;
        return 'Data does not appear to be PVP data';
    }

    function renderCopyPaste(): React.JSX.Element {
        const PLAYERLINK = `https://app.startrektimelines.com/pvp/opponents?division=${division}`;
        let title = t(`json_types.pvp_${division}`)
        title = title.slice(0, 1).toUpperCase() + title.slice(1);
        return (
            <React.Fragment>
                {!currentHasRemote && <Notification
                    color={'blue'}
                    header={title}
                    content={
                        <div style={{cursor: 'pointer'}} onClick={(e) => setCollapsed(false)}>
                        <p>{t(`pvp.import.heading`)}</p>
                        <p>
                        {t('pvp.import.click_here')}
                        </p>
                        <p>
                            <b><a onClick={() => setCollapsed(false)} target='_blank' href={PLAYERLINK}>{t('pvp.live.title')}</a></b>
                        </p>
                        </div>
                    }
                    icon="database"
                />}

                {currentHasRemote && <Notification
                    color={'blue'}
                    header={t(`ship.pvp_divisions.${divisions[division]}`)}
                    content={
                        <div style={{cursor: 'pointer'}} onClick={(e) => setCollapsed(false)}>
                            <p>
                                {t('json.existing.header', { data: t(`json_types.pvp_${division}`)})}
                            </p>
                            <p>
                                {t('json.existing.click_here')}
                            </p>
                            <p>
                                <b><a onClick={() => setCollapsed(false)}>{t('json.existing.live_data', { data: t(`json_types.pvp_${division}`)})}</a></b>
                            </p>
                            <p style={{textAlign: "right"}}>
                                <b style={{fontSize:"0.8em"}}>(<a title={t('json.existing.clear')} onClick={() => clearPvpData()}>{t('json.existing.clear')}</a>)</b>
                            </p>
                        </div>
                    }
                    icon="database"
                />}

                {hasPlayer && (!collapsed) &&

                <JsonInputForm
                    requestDismiss={() => setCollapsed(!collapsed)}
                    config={{
                        pasteInMobile: true,
                        dataUrl: PLAYERLINK,
                        dataName: t(`json_types.pvp_${division}`),
                        jsonHint: '{"action":"update","character":',
                        androidFileHint: 'status.json',
                        iOSFileHint: 'status?id'
                    }}
                    title={title}
                    validateInput={validatePvp}
                    setValidInput={(pvproot) => {
                        if (pvproot) setCollapsed(true);
                        setPvpData(pvproot);
                    }}

                />}
            </React.Fragment>
        );
    }

}