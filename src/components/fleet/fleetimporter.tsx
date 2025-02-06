import React from "react";

import { GlobalContext } from "../../context/globalcontext";

import { JsonInputForm } from "../base/jsoninputform";
import { Notification } from "../page/notification";
import { Fleet } from "../../model/fleet";

export interface FleetImporterProps {
    fleet?: Fleet;
    setFleet: (value?: Fleet) => void;
    setError?: (value: string) => void;
    clearFleet: () => void;
    currentHasRemote?: boolean;
}

export const FleetImportComponent = (props: FleetImporterProps) => {

    const { currentHasRemote, fleet, setFleet, setError, clearFleet } = props;
    const context = React.useContext(GlobalContext);
    const { playerData } = context.player;
    const { t } = context.localized;

    const [collapsed, setCollapsed] = React.useState<boolean | undefined>(undefined);

    const hasPlayer = !!playerData;

    React.useEffect(() => {
        if (collapsed === undefined) setCollapsed(true);
    }, [currentHasRemote]);

    if (!playerData) return <></>
	const guild = playerData?.player.fleet?.id ?? '';

    return (<>

        <div className='ui segment'>
            {renderCopyPaste()}
        </div>

        </>)

    function validateFleet(json: Fleet) {
        if (!json) {
            return ("No data");
        }
        return true;
    }

    function renderCopyPaste(): JSX.Element {

        const PLAYERLINK = 'https://app.startrektimelines.com/fleet/complete_member_info';

        return (
            <React.Fragment>
                {!currentHasRemote && <Notification
                    color={'blue'}
                    header={t('fleet.import.title')}
                    content={
                        <div style={{cursor: 'pointer'}} onClick={(e) => setCollapsed(false)}>
                        <p>{t('fleet.import.heading')}</p>
                        <p>
                        {t('fleet.import.click_here')}
                        </p>
                        <p>
                            <b><a onClick={() => setCollapsed(false)} target='_blank' href={PLAYERLINK}>{t('fleet.live.title')}</a></b>
                        </p>
                        </div>
                    }
                    icon="database"
                />}

                {currentHasRemote && <Notification
                    color={'blue'}
                    header="Live Fleet Data"
                    content={
                        <div style={{cursor: 'pointer'}} onClick={(e) => setCollapsed(false)}>
                        <p>
                            Live fleet data is already present.
                        </p>
                        <p>
                            Click here to update your data if you wish to refresh your round.
                        </p>
                        <p>
                            <b><a onClick={() => setCollapsed(false)} target='_blank' href={PLAYERLINK}>Live Fleet Data</a></b>
                        </p>
                        <p style={{textAlign: "right"}}>
                            <b style={{fontSize:"0.8em"}}>(To clear all live fleet data, <a title={'Clear All Fleet Data'} onClick={() => clearFleet()}>Click Here</a>)</b>
                        </p>
                        </div>
                    }
                    icon="database"
                />}

                {hasPlayer && (!collapsed) &&

                <JsonInputForm
                    requestDismiss={() => setCollapsed(!collapsed)}
                    config={{
                        postValues: {
                            event_index: "0",
                            guild_id: guild.toString()
                        },
                        pasteInMobile: true,
                        dataUrl: PLAYERLINK,
                        dataName: t('json_types.fleet_data'),
                        jsonHint: '{"action":"update","character":',
                        androidFileHint: 'status.json',
                        iOSFileHint: 'status?id'
                    }}
                    title={`Fleet Input Form`}
                    validateInput={validateFleet}
                    setValidInput={(fleet) => {
                        //if (fleet) setCollapsed(true);
                        setFleet(fleet);
                    }}

                />}
            </React.Fragment>
        );
    }

}