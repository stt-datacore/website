import React from "react"
import { useStateWithStorage } from "../../utils/storage";
import { GlobalContext } from "../../context/globalcontext";
import { AlertModal } from "./alertmodal";
import { AlertMode, IAlert } from "./model";


export interface IAlertContext {
    alerts: IAlert[];
    setAlerts: (value: IAlert[]) => void;
    triggered_alerts?: IAlert[];
    drawAlertModal: (renderTrigger?: () => JSX.Element, mode?: AlertMode) => void;
}

const DefaultAlertContext = {
    alerts: [],
    setAlerts: () => false,
    triggered_alerts: [],
    drawAlertModal: () => false
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
    const [alerts, setAlerts] = useStateWithStorage<IAlert[]>(`${dbid}alerts`, []);
    const [alertOpen, setAlertOpen] = React.useState(false);

    const triggered_alerts = [] as IAlert[];

    // Code to rummage through triggered alerts goes here.

    const contextData = {
        alerts,
        setAlerts,
        drawAlertModal,
        triggered_alerts
    } as IAlertContext;

    return <React.Fragment>
        <AlertContext.Provider value={contextData}>
            {children}
        </AlertContext.Provider>
    </React.Fragment>

    function drawAlertModal(renderTrigger?: () => JSX.Element, mode?: AlertMode) {
        return <AlertModal
                    mode={mode}
                    renderTrigger={renderTrigger}
                    isOpen={alertOpen}
                    setIsOpen={setAlertOpen}
                    />
    }
}