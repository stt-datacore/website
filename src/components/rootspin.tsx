import React from "react";
import { StandardFlexRow } from "../cssdef";
import { Icon } from "semantic-ui-react";
import { LocalizedContext } from "../context/localizedcontext";

export const RootSpin = (props: { message?: string }) => {
    let { message } = props;
    let loc_msg = "";

    try {
        const context = React.useContext(LocalizedContext);
        const { t } = context;
        // Can use this here because is called from within global context.
        loc_msg = t("spinners.please_wait");
    }
    catch {
        // Not in the global context. Show what we can.
    }

    return (
        <div
            style={{
                ...StandardFlexRow,
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
                margin: "5em 0",
                fontSize: "1.2rem",
            }}
        >
            <Icon loading name="spinner" /> {message || loc_msg || ''}
        </div>
    );
};
