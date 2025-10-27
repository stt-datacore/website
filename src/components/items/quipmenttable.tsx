import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { CrewMember } from "../../model/crew";
import { EquipmentItem } from "../../model/equipment";
import { qbitsToSlots } from "../../utils/crewutils";
import { getPossibleQuipment } from "../../utils/itemutils";
import { EquipmentTable, EquipmentTableProps } from "./equipment_table";
import { QuipmentFilterContext, QuipmentMode } from "./quipmentfilters";
import { PlayerEquipmentItem } from "../../model/player";

interface QuipmentTableProps extends EquipmentTableProps {
    ownedItems: boolean;
    ownedCrew: boolean;
    mode: QuipmentMode;
}

export const QuipmentTable = (props: QuipmentTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const quipmentContext = React.useContext(QuipmentFilterContext);

    const { ownedCrew, mode } = props;
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
        let qbits = props.items?.filter(f => f.type === 15) ?? globalContext.core.items.filter(f => f.type === 15);
        if (crew) {
            quipment = getPossibleQuipment(crew, quipment as EquipmentItem[]);
        }
        if (mode === 'qbit') {
            if (available) return filterItems(qbits as EquipmentItem[]);
            else return qbits;
        }
        else {
            if (available) return filterItems(quipment as EquipmentItem[]);
            else return quipment;
        }
    }, [crew, props.items, ownedOption, traitOptions, skillOptions, rarityOptions]);

    return <EquipmentTable
        {...{
            ...props,
            buffsColumn: mode === 'quipment',
            hideOwnedColumns: mode === 'quipment',
            ownedColumns: ['quantity'],
            selectionMode: !!crew,
            selection,
            setSelection,
            maxSelections: maxSlots,
            items,
            types: [mode === 'qbit' ? 15 : 14]
        }}
        />


}