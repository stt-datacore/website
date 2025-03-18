import React from "react"
import { ItemsProviderContext } from "./contextprovider"


export const ItemsTools = () => {

    const itemsContext = React.useContext(ItemsProviderContext);

    const {
            addNeeded,
            crewSelection,
            crewType,
            traits,
            skills,
            trials,
            ownedQuipment,
            ignoreLimit,
            setAddNeeded,
            setCrewSelection,
            setCrewType,
            setTraits,
            setSkills,
            setTrials,
            setOwnedQuipment,
            setIgnoreLimit
        } = itemsContext;


}