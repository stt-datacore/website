import React from "react";

import { GlobalContext } from "../../context/globalcontext";

import { JsonInputForm } from "../base/jsoninputform";
import { Notification } from "../page/notification";
import { FleetDetails } from "../../model/fleet";

export interface FleetImporterProps {
    fleet?: FleetDetails;
    setFleet: (value?: FleetDetails) => void;
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

    function validateFleet(json: FleetDetails) {
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
                    header={t('fleet.import.live')}
                    content={
                        <div style={{cursor: 'pointer'}} onClick={(e) => setCollapsed(false)}>
                        <p>
                            {t('json.existing.header', { data: t(`json_types.fleet_data`)})}
                        </p>
                        <p>
                            {t('json.existing.click_here')}
                        </p>
                        <p>
                            <b><a onClick={() => setCollapsed(false)}>{t('json.existing.live_data', { data: t(`json_types.fleet_data`)})}</a></b>
                        </p>
                        <p style={{textAlign: "right"}}>
                            <b style={{fontSize:"0.8em"}}>(<a title={t('json.existing.clear')} onClick={() => clearFleet()}>{t('json.existing.clear')}</a>)</b>
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
                    title={t('fleet.import.live')}
                    validateInput={validateFleet}
                    setValidInput={(fleet) => {
                        if (fleet) setCollapsed(true);
                        setFleet(fleet);
                    }}

                />}
            </React.Fragment>
        );
    }

}