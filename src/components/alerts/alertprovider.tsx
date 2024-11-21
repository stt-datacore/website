import React from "react"
import { useStateWithStorage } from "../../utils/storage";
import { GlobalContext } from "../../context/globalcontext";

import { AlertMode, DefaultAlertConfig, IAlertConfig } from "./model";
import { AlertModal } from "./alertmodal";


export interface IAlertContext {
    config: IAlertConfig;
    setConfig: (value: IAlertConfig) => void;
    alertOpen: boolean,
    setAlertOpen: (value: boolean) => void;
    drawAlertModal: (renderTrigger?: () => JSX.Element) => JSX.Element;
    restoreHiddenAlerts: boolean,
	setRestoreHiddenAlerts: (value: boolean) => void
}

const DefaultAlertContext = {
    config: DefaultAlertConfig,
    setConfig: () => false,
    alertOpen: false,
    setAlertOpen: () => false,
    drawAlertModal: () => <></>,
    restoreHiddenAlerts: false,
	setRestoreHiddenAlerts: () => false
} as IAlertContext;

export const AlertContext = React.createContext(DefaultAlertContext);

export interface AlertProviderProps {
    children: JSX.Element;
}

export const AlertProvider = (props: AlertProviderProps) => {
    const { children } = props;
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { playerData } = globalContext.player;

    const dbid = playerData ? `${playerData.player.dbid}/` : '';
    const [config, setConfig] = useStateWithStorage<IAlertConfig>(`${dbid}alerts`, DefaultAlertConfig);
    const [alertOpen, setAlertOpen] = React.useState(false);
    const [restoreHiddenAlerts, setRestoreHiddenAlerts] = React.useState(false);
    // Code to rummage through triggered alerts goes here.

    const contextData = {
        config,
        setConfig,
        drawAlertModal,
        alertOpen,
        setAlertOpen,
        restoreHiddenAlerts,
        setRestoreHiddenAlerts
    } as IAlertContext;

    return <React.Fragment>
        <AlertContext.Provider value={contextData}>
            {children}
        </AlertContext.Provider>
    </React.Fragment>

    function drawAlertModal(renderTrigger?: () => JSX.Element) {
        return <AlertModal
                    config={config}
                    setConfig={setConfig}
                    renderTrigger={renderTrigger}
                    isOpen={alertOpen}
                    setIsOpen={setAlertOpen}
                    />
    }
}