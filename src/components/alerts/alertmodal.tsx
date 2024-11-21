import React from "react";
import { AlertMode } from "./model";
import { GlobalContext } from "../../context/globalcontext";


export interface AlertModalProps {
    mode?: AlertMode;
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    renderTrigger?: () => JSX.Element
}


export const AlertModal = (props: AlertModalProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { renderTrigger, isOpen, setIsOpen } = props;
    const mode = props.mode ?? 'any';

    return <>

    </>

    function renderDefaultTrigger() {

    }
}