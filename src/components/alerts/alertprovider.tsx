import React from "react"
import { useStateWithStorage } from "../../utils/storage";
import { GlobalContext } from "../../context/globalcontext";

import { AlertMode, DefaultAlertConfig, IAlertConfig } from "./model";
import { AlertModal } from "./alertmodal";
import { TinyStore } from "../../utils/tiny";


export interface IAlertContext {
    config: IAlertConfig;
    setConfig: (value: IAlertConfig) => void;
    alertOpen: boolean,
    setAlertOpen: (value: boolean) => void;
    drawAlertModal: (renderTrigger?: () => React.JSX.Element) => React.JSX.Element;
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
    children: React.JSX.Element;
}

export const AlertProvider = (props: AlertProviderProps) => {
    const { children } = props;
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { playerData } = globalContext.player;

    const [config, internalSetConfig] = React.useState<IAlertConfig>(DefaultAlertConfig);
    const [alertOpen, setAlertOpen] = React.useState(false);
    const [restoreHiddenAlerts, setRestoreHiddenAlerts] = React.useState(false);
    // Code to rummage through triggered alerts goes here.

    React.useEffect(() => {
        if (playerData) {
            let tiny = TinyStore.getStore(playerData.player.dbid.toString());
            internalSetConfig(tiny.getValue<IAlertConfig>('alertConfig') || config);
        }
    }, [playerData]);

    const setConfig = (value: IAlertConfig) => {
        if (playerData) {
            let tiny = TinyStore.getStore(playerData.player.dbid.toString());
            tiny.setValue('alertConfig', value, true);
        }
        internalSetConfig(value);
    }

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

    function drawAlertModal(renderTrigger?: () => React.JSX.Element) {
        return <AlertModal
                    config={config}
                    setConfig={setConfig}
                    renderTrigger={renderTrigger}
                    isOpen={alertOpen}
                    setIsOpen={setAlertOpen}
                    />
    }
}