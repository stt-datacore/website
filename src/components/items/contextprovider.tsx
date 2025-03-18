import React from "react"
import { useStateWithStorage } from "../../utils/storage";
import { CrewType, CrewKwipTrial, OwnedType } from "./utils";
import { EquipmentItem } from "../../model/equipment";

interface HeaderProviderProps {
    pageName: string;
    children: JSX.Element;
    data: EquipmentItem[];
}

export interface IItemsTableContext {
    addNeeded: boolean;
    crewSelection: string;
    crewType: CrewType;
    traits: string[];
    skills: string[];
    trials: CrewKwipTrial[];
    ownedQuipment?: OwnedType;
    ignoreLimit?: boolean;
    data: EquipmentItem[];
    setAddNeeded: (value: boolean) => void;
    setCrewSelection: (value: string) => void;
    setCrewType: (value: CrewType) => void;
    setTraits: (value: string[]) => void;
    setSkills: (value: string[]) => void;
    setTrials: (value: CrewKwipTrial[]) => void;
    setOwnedQuipment: (value?: OwnedType) => void;
    setIgnoreLimit: (value?: boolean) => void;
}

const DefaultTableContextData = {
    addNeeded: false,
    crewSelection: '',
    crewType: 'quippable',
    traits: [],
    skills: [],
    trials: [],
    ownedQuipment: undefined,
    ignoreLimit: undefined,
    data: [],
    setAddNeeded: () => false,
    setCrewSelection: () => false,
    setCrewType: () => false,
    setTraits: () => false,
    setSkills: () => false,
    setTrials: () => false,
    setOwnedQuipment: () => false,
    setIgnoreLimit: () => false
} as IItemsTableContext;

export const ItemsProviderContext = React.createContext<IItemsTableContext>(DefaultTableContextData);

export const ItemsContextProvider = (props: HeaderProviderProps) => {
    const { pageName, children, data } = props;

    const [addNeeded, setAddNeeded] = useStateWithStorage<boolean>(`${pageName}/add_needed`, false, { rememberForever: true });

    const [crewSelection, setCrewSelection] = useStateWithStorage(`${pageName}/crew_selection`, '');
    const [crewType, setCrewType] = useStateWithStorage<CrewType>(`${pageName}/crew_type`, 'quippable');
    const [traits, setTraits] = useStateWithStorage<string[]>(`${pageName}/traits`, []);
    const [skills, setSkills] = useStateWithStorage<string[]>(`${pageName}/skills`, []);
    const [trials, setTrials] = useStateWithStorage<CrewKwipTrial[]>(`${pageName}/trials`, []);

    const [ownedQuipment, setOwnedQuipment] = useStateWithStorage<OwnedType | undefined>(`${pageName}/owned_quipment`, undefined);
    const [ignoreLimit, setIgnoreLimit] = useStateWithStorage<boolean | undefined>(`${pageName}/ignore_limit`, undefined);

    const contextData: IItemsTableContext = {
        addNeeded,
        crewSelection,
        crewType,
        traits,
        skills,
        trials,
        ownedQuipment,
        ignoreLimit,
        data,
        setAddNeeded,
        setCrewSelection,
        setCrewType,
        setTraits,
        setSkills,
        setTrials,
        setOwnedQuipment,
        setIgnoreLimit
    }

    return <ItemsProviderContext.Provider value={contextData}>
        {children}
    </ItemsProviderContext.Provider>
}