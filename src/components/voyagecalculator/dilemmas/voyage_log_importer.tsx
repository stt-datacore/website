import React from "react";

import { GlobalContext } from "../../../context/globalcontext";

import { JsonInputForm } from "../../base/jsoninputform";
import { Notification } from "../../page/notification";
import { FleetDetails } from "../../../model/fleet";
import { PvpRoot } from "../../../model/pvp";
import { VoyageLogRoot } from "../../../model/voyagelog";

export interface VoyageLogImporterProps {
    setVoyageLog: (result?: VoyageLogRoot) => void;
    clearVoyageLog: () => void;
    voyageId: number;
    currentHasRemote?: boolean;
}

export const VoyageLogImportComponent = (props: VoyageLogImporterProps) => {

    const { voyageId, currentHasRemote, setVoyageLog, clearVoyageLog } = props;
    const context = React.useContext(GlobalContext);
    const { playerData } = context.player;
    const { t } = context.localized;
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

    function validateVoyageLog(json: VoyageLogRoot): true | string {
        if (!json) {
            return ("No data");
        }
        if (json?.length < 2) return 'Data does not appear to be voyage log data';
        if (json[0].character && json[1].voyage_narrative?.length) return true;
        return 'Data does not appear to be voyage log data';
    }

    function renderCopyPaste(): React.JSX.Element {
        const VOYAGELINK = `https://app.startrektimelines.com/voyage/refresh`;
        let title = t(`json_types.voyage_log`)
        title = title.slice(0, 1).toUpperCase() + title.slice(1);
        return (
            <React.Fragment>
                {!currentHasRemote && <Notification
                    color={'blue'}
                    header={title}
                    content={
                        <div style={{cursor: 'pointer'}} onClick={(e) => setCollapsed(false)}>
                        <p>{t(`voyage_log.import.heading`)}</p>
                        <p>
                        {t('voyage_log.import.click_here')}
                        </p>
                        {/* <p>
                            <b><a onClick={() => setCollapsed(false)} target='_blank'>{t('voyage.import.title')}</a></b>
                        </p> */}
                        </div>
                    }
                    icon="database"
                />}

                {currentHasRemote && <Notification
                    color={'blue'}
                    header={title}
                    content={
                        <div style={{cursor: 'pointer'}} onClick={(e) => setCollapsed(false)}>
                            <p>
                                {t('json.existing.header', { data: t(`json_types.voyage_log`)})}
                            </p>
                            <p>
                                {t('json.existing.click_here')}
                            </p>
                            <p>
                                <b><a onClick={() => setCollapsed(false)}>{t('json.existing.live_data', { data: t(`json_types.voyage_log`)})}</a></b>
                            </p>
                            <p style={{textAlign: "right"}}>
                                <b style={{fontSize:"0.8em"}}>(<a title={t('json.existing.clear')} onClick={() => clearVoyageLog()}>{t('json.existing.clear')}</a>)</b>
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
                        postValues: {
                            voyage_status_id: voyageId,
                            new_only: false,
                            client_api: 27
                        },
                        dataUrl: VOYAGELINK,
                        dataName: t(`json_types.voyage_log`),
                        jsonHint: '{"action":"update","character":',
                        androidFileHint: 'refresh.json',
                        iOSFileHint: 'refresh?id'
                    }}
                    title={title}
                    validateInput={validateVoyageLog}
                    setValidInput={(voyroot) => {
                        if (voyroot) setCollapsed(true);
                        setVoyageLog(voyroot);
                    }}

                />}
            </React.Fragment>
        );
    }

}