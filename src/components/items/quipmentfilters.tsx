import React from "react";
import { EquipmentCommon, EquipmentItem } from "../../model/equipment";
import CONFIG from "../CONFIG";
import { Button, Checkbox, Dropdown, DropdownItemProps, Item, Rating } from "semantic-ui-react";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { GlobalContext } from "../../context/globalcontext";
import { useStateWithStorage } from "../../utils/storage";
import { PlayerCrew, PlayerEquipmentItem } from "../../model/player";
import { CrewMember } from "../../model/crew";
import { getPossibleQuipment } from "../../utils/itemutils";
import { DataPicker } from "../dataset_presenters/datapicker";
import { IEssentialData } from "../dataset_presenters/model";
import { AvatarView } from "../item_presenters/avatarview";

export interface IQuipmentFilterContext {
    available: boolean,
    ownedItems: boolean,
    selectedCrew?: string;
    setSelectedCrew: (value?: string) => void;
    selectedItems?: number[];
    setSelectedItems: (value?: number[]) => void;
    filterItems: (items: (EquipmentItem | EquipmentCommon | PlayerEquipmentItem)[]) => (EquipmentItem | EquipmentCommon | PlayerEquipmentItem)[];
}

const DefaultContextData: IQuipmentFilterContext = {
    available: false,
    ownedItems: false,
    selectedCrew: undefined,
    setSelectedCrew: () => false,
    selectedItems: undefined,
    setSelectedItems: () => false,
    filterItems: () => [],
}

export const QuipmentFilterContext = React.createContext(DefaultContextData);

export interface QuipmentFilterProps {
    pageId: string;
    ownedItems: boolean;
    initCrew?: CrewMember;
    children: JSX.Element;
    noRender?: boolean;
}

export const QuipmentFilterProvider = (props: QuipmentFilterProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t }  = globalContext.localized;
    const { children, pageId, ownedItems, noRender, initCrew } = props;
    const { playerData } = globalContext.player;

    const [selectedCrew, setSelectedCrew] = useStateWithStorage<string | undefined>(`${pageId}/quipment_crew_selection`, initCrew?.symbol);
    const [selectedItems, setSelectedItems] = useStateWithStorage<number[] | undefined>(`${pageId}/quipment_selection`, undefined);
    const [selectorOpen, setSelectorOpen] = React.useState(false);

    // const pool = React.useMemo(() => {
    //     let quipment = globalContext.core.items.filter(item => item.type === 14);
    //     const c = selectedCrew;
    //     if (c) {
    //         quipment = getPossibleQuipment(c, quipment);
    //     }
    //     return quipment;
    // }, [globalContext.core.items, selectedCrew]);

    const contextData: IQuipmentFilterContext = {
        available: true,
        ownedItems,
        filterItems,
        selectedCrew,
        setSelectedCrew,
        selectedItems,
        setSelectedItems
    }

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    const crewChoices = React.useMemo(() => {
        let work = [] as CrewMember[];
        if (playerData && ownedItems) {
            work = playerData.player.character.crew.filter(f => f.immortal === -1 && f.q_bits >= 100)
        }
        else {
            work = globalContext.core.crew;
        }
        return work.map((crew) => ({...crew, id: crew.archetype_id }));
        // const choices = [] as DropdownItemProps[];
        // for (let item of work) {
        //     choices.push({
        //         key: `${pageId}_crew_${item.symbol}`,
        //         value: item.symbol,
        //         text: item.name,
        //         data: item,
        //         content:
        //             <div style={{...flexCol, alignItems: 'flex-start', gap:'0.5em'}}>
        //                 <div style={{...flexRow, gap: '1em', alignItems: 'center', justifyContent: 'flex-start'}}>
        //                     <img src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrlPortrait}`}
        //                         style={{height:'24px'}} alt={item.name} />
        //                     <span>{item.name}</span>
        //                 </div>
        //                 <div>
        //                     <Rating icon={'star'}  maxRating={item.max_rarity} rating={"rarity" in item ? item.rarity as number ?? item.max_rarity : item.max_rarity} />
        //                 </div>
        //             </div>
        //     });
        // }
        // return choices;
    }, [playerData, ownedItems]);

    const crew = React.useMemo(() => {
        if (selectedCrew && crewChoices?.length) {
            return crewChoices.find(f => f.symbol === selectedCrew) as CrewMember | undefined;
        }
        return undefined;
    }, [crewChoices, selectedCrew]);

    return <React.Fragment>
        {!noRender && <div className={'ui segment'} style={{...flexCol, alignItems: 'flex-start'}}>
            <div style={{...flexRow}}>

                {selectorOpen && <DataPicker
                    id={`${pageId}/quipment_crew_picker`}
                    data={crewChoices}
                    search
                    closeOnChange
                    closePicker={selectCrew}
                    selection
                    gridSetup={{
                        renderGridColumn: (datum, isSelected) => renderItem(datum, isSelected)
                    }}
                />}
                <div style={{...flexRow, minHeight: '48px'}}>
                    {<Button onClick={() => setSelectorOpen(true)}>{t('prospect_picker.select_crew')}</Button>}
                </div>
                {!!crew &&
                    <div style={{...flexRow}}>
                    <AvatarView
                        mode='crew'
                        item={crew}
                        size={48}
                    />
                    <span>{crew.name}</span>
                    <Button icon={'close'} onClick={() => setSelectedCrew(undefined)}></Button>
                    </div>
                        }
            </div>
        </div>}
        <QuipmentFilterContext.Provider value={contextData}>
            {children}
        </QuipmentFilterContext.Provider>
    </React.Fragment>

    function selectCrew(selection: Set<number>, ok: boolean) {
        let sel = [...selection];
        if (ok && sel.length && sel[0]) {
            setSelectedCrew(crewChoices.find(f => f.id === sel[0])?.symbol)
        }
        else {
            setSelectedCrew(undefined);
        }
        setSelectorOpen(false);
    }

    function renderItem(item: IEssentialData, isSelected: boolean) {
        let crew = item as CrewMember | PlayerCrew;

        return <div className={'ui segment'} style={{...flexCol, gap: '0.5em', backgroundColor: isSelected ? 'royalblue' : undefined}}>
            <img src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
                style={{height: '64px'}}
                />
            <span>{crew.name}</span>
            <Rating icon={'star'} maxRating={crew.max_rarity} rating={"rarity" in crew ? crew.rarity : crew.max_rarity} />
        </div>

    }

    function filterItems(value: (EquipmentItem | EquipmentCommon | PlayerEquipmentItem)[]) {
        return value.filter(item => {
            return true;
        });
    }
}