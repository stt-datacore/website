import React from "react";

import { GlobalContext } from "../../context/globalcontext";
import { GauntletRoot } from "../../model/gauntlets";
import { JsonInputForm } from "../base/jsoninputform";
import { Notification } from "../page/notification";

export interface GauntletImporterProps {
    gauntlet?: GauntletRoot;
    setGauntlet: (value?: GauntletRoot) => void;
    setError?: (value: string) => void;
	clearGauntlet: () => void;
	currentHasRemote?: boolean;
}

export const GauntletImportComponent = (props: GauntletImporterProps) => {

    const { currentHasRemote, gauntlet, setGauntlet, setError, clearGauntlet } = props;
    const context = React.useContext(GlobalContext);
    const { playerData } = context.player;
    const { t } = context.localized;

	const [collapsed, setCollapsed] = React.useState<boolean | undefined>(undefined);

    const hasPlayer = !!playerData;

    React.useEffect(() => {
        if (collapsed === undefined) setCollapsed(true);
    }, [currentHasRemote]);

	const validateGauntlet = (json: GauntletRoot) => {
        if (!json) {
            return ("No data");
        }
		return true;
	}

	function renderCopyPaste(): React.JSX.Element {

        const PLAYERLINK = 'https://app.startrektimelines.com/gauntlet/status?client_api=27&only_read_state=true';

        return (
			<React.Fragment>
                {!currentHasRemote && <Notification
                    color={'blue'}
                    header={t('gauntlet.import.title')}
                    content={
                        <div style={{cursor: 'pointer'}} onClick={(e) => setCollapsed(false)}>
						<p>{t('gauntlet.import.heading')}</p>
						<p>
                        {t('gauntlet.import.click_here')}
						</p>
                        <p>
                            <b></b>
                        </p>
                        </div>
                    }
                    icon="database"
                />}

                {currentHasRemote && <Notification
                    color={'blue'}
                    header="Live Gauntlet Data"
                    content={
                        <div style={{cursor: 'pointer'}} onClick={(e) => setCollapsed(false)}>
                        <p>
                            Live gauntlet data is already present.
                        </p>
						<p>
							Click here to update your data if you wish to refresh your round.
						</p>
                        <p>
                            <b><a onClick={() => setCollapsed(false)} target='_blank' href={PLAYERLINK}>Live Gauntlet Data</a></b>
                        </p>
                        <p style={{textAlign: "right"}}>
							<b style={{fontSize:"0.8em"}}>(To clear all live gauntlet data, <a title={'Clear All Gauntlet Data'} onClick={() => clearGauntlet()}>Click Here</a>)</b>
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
						dataName: t('json_types.gauntlet_data'),
						jsonHint: '{"action":"update","character":',
						androidFileHint: 'status.json',
						iOSFileHint: 'status?id'
					}}
					title={`Gauntlet Input Form`}
					validateInput={validateGauntlet}
					setValidInput={(gauntlet) => {
						//if (gauntlet) setCollapsed(true);
						setGauntlet(gauntlet);
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