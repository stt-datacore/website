import React from "react";

import { GlobalContext } from "../../../../context/globalcontext";
import { Gauntlet, GauntletRoot } from "../../../../model/gauntlets";
import { JsonInputForm } from "../../../base/jsoninputform";
import { Notification } from "../../../page/notification";
import { Voyage } from "../../../../model/player";

export interface EncounterImportProps {
    voyage: Voyage
    data?: any;
    setData: (value?: any) => void;
    setError?: (value: string) => void;
    clearData: () => void;
    currentHasRemote?: boolean;
}

export const EncounterImportComponent = (props: EncounterImportProps) => {

    const { currentHasRemote, data: data, setData: setData, setError, clearData: clearData } = props;
    const context = React.useContext(GlobalContext);
    const { playerData } = context.player;
    const { t } = context.localized;
    const { voyage } = props;

    const [collapsed, setCollapsed] = React.useState<boolean | undefined>(undefined);

    const hasPlayer = !!playerData;

    React.useEffect(() => {
        if (collapsed === undefined) setCollapsed(true);
    }, [currentHasRemote]);

    const validateVoyage = (json: any) => {
        if (!json) {
            return ("No data");
        }
        return true;
    }

    function renderCopyPaste(): JSX.Element {

        const PLAYERLINK = 'https://app.startrektimelines.com/voyage/refresh';

        return (
            <React.Fragment>
                {!currentHasRemote && <Notification
                    color={'blue'}
                    header={t('voyage.import.title')}
                    content={
                        <div style={{cursor: 'pointer'}} onClick={(e) => setCollapsed(false)}>
                        <p>{t('voyage.import.heading')}</p>
                        <p>
                        {t('voyage.import.click_here')}
                        </p>
                        <p>
                            <b><a onClick={() => setCollapsed(false)} target='_blank' href={PLAYERLINK}>
                            <b></b>
                        </a>
                        </b>
                        </p>
                        </div>
                    }
                    icon="database"
                />}

                {currentHasRemote && <Notification
                    color={'blue'}
                    header={t('voyage.import.title')}
                    content={
                        <div style={{cursor: 'pointer'}} onClick={(e) => setCollapsed(false)}>
                        <p>
                            Live voyage data is already present.
                        </p>
                        <p>
                            Click here to update your data if you wish to refresh your data.
                        </p>
                        <p>
                            <b><a onClick={() => setCollapsed(false)} target='_blank' href={PLAYERLINK}>{t('voyage.import.title')}</a></b>
                        </p>
                        <p style={{textAlign: "right"}}>
                            <b style={{fontSize:"0.8em"}}>(To clear all live gauntlet data, <a title={'Clear All Gauntlet Data'} onClick={() => clearData()}>Click Here</a>)</b>
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
                            "voyage_status_id": voyage.id,
                            "new_only": true
                        },
                        pasteInMobile: true,
                        dataUrl: PLAYERLINK,
                        dataName: "voyage data",
                        jsonHint: '[{"action":"update","character":',
                        androidFileHint: 'refresh_customization.json',
                        iOSFileHint: 'status?id'
                    }}
                    title={`Voyage Input Form`}
                    validateInput={validateVoyage}
                    setValidInput={(voyage) => {
                        //if (gauntlet) setCollapsed(true);
                        setData(voyage);
                    }}

                />}
            </React.Fragment>
        );
    }

    return <>

    <div className='ui segment'>
        {renderCopyPaste()}
    </div>

    </>
}