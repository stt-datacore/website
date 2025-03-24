import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { EquipmentItem } from "../../model/equipment";
import { OptionsPanelFlexRow } from "../stats/utils";
import { EquipmentTable, EquipmentTableProps } from "./equipment_table";
import { CrewMember } from "../../model/crew";
import { QuipmentFilterContext } from "./quipmentfilters";
import { qbitsToSlots } from "../../utils/crewutils";
import { getPossibleQuipment } from "../../utils/itemutils";

interface QuipmentTableProps extends EquipmentTableProps {
    ownedItems: boolean;
    ownedCrew: boolean;
}

export const QuipmentTable = (props: QuipmentTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const quipmentContext = React.useContext(QuipmentFilterContext);

    const { ownedCrew } = props;
    const { playerData } = globalContext.player;

    const {
        ignoreLimit,
        selectedItems: selection,
        setSelectedItems: setSelection,
        selectedCrew,
        ownedOption,
        traitOptions,
        skillOptions,
        rarityOptions,
        filterItems,
        available
    } = quipmentContext;

    const [maxSlots, setMaxSlots] = React.useState(undefined as number | undefined);
    const [crew, setCrew] = React.useState(undefined as CrewMember | undefined);

    React.useEffect(() => {
        let crew = undefined as CrewMember | undefined;
        if (ownedCrew && playerData) {
            crew = playerData.player.character.crew.find(f => f.symbol === selectedCrew);
        }
        else {
            crew = globalContext.core.crew.find(f => f.symbol === selectedCrew);
        }
        if (crew) {
            setMaxSlots(ignoreLimit ? 4 : (qbitsToSlots(crew.q_bits) || 4));
        }
        else {
            setMaxSlots(undefined);
            setSelection(undefined);
        }
        setCrew(crew);
    }, [selectedCrew, playerData, ownedCrew, ignoreLimit]);

    const items = React.useMemo(() => {
        let quipment = props.items?.filter(f => f.type === 14) ?? globalContext.core.items.filter(f => f.type === 14);
        if (crew) {
            quipment = getPossibleQuipment(crew, quipment as EquipmentItem[]);
        }
        if (available) return filterItems(quipment as EquipmentItem[]);
        else return quipment;
    }, [crew, props.items, ownedOption, traitOptions, skillOptions, rarityOptions]);

    return <EquipmentTable
        {...{
            ...props,
            buffsColumn: true,
            hideOwnedColumns: true,
            selectionMode: !!crew,
            selection,
            setSelection,
            maxSelections: maxSlots,
            items,
            types: [14]
        }}
        />


}