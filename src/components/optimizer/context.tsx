import React from 'react';

import { CrewMember } from "../../model/crew";
import { LockedProspect } from "../../model/game-elements";
import { CiteMode, PlayerCrew } from "../../model/player";
import { CiteData, BetaTachyonSettings, SkillOrderRarity } from "../../model/worker";
import { DefaultBetaTachyonSettings } from "./btsettings";
import { useStateWithStorage } from '../../utils/storage';
import { GlobalContext } from '../../context/globalcontext';
import { CiteEngine } from './engines';
import { printSkillOrder } from '../../utils/crewutils';

export interface SymCheck { symbol: string, checked: boolean };

//export type PortalOptions = 'none' | 'portal' | 'non_portal' | 'unique' | 'non_unique';

export interface CiteConfig {
    rarities: number[],
    portal?: boolean,
    nameFilter: string,
    priSkills: string[];
    secSkills: string[];
    seatSkills: string[];
    checks: SymCheck[];
    showEV: boolean;
    collections?: number[];
}

export interface CiteEngineResults {
    citeData: CiteData,
    skoMap?: { [key: string]: SkillOrderRarity };
}

export interface ICitationOptimizerContext {
    engine: CiteEngine;
    setEngine: (value: CiteEngine) => void;
    customSorter?: (left: PlayerCrew, right: PlayerCrew) => number;
    citeConfig: CiteConfig;
    setCiteConfig: (value: CiteConfig) => void;
    appliedProspects: PlayerCrew[],
    setAppliedProspects: (value: PlayerCrew[]) => void;
    results?: CiteEngineResults,
    setResults: (value?: CiteEngineResults) => void;
    crewSkills: { [key: string]: string }
};

export const DefaultCiteConfig = {
    portal: undefined,
    rarities: [],
    nameFilter: '',
    priSkills: [],
    secSkills: [],
    seatSkills: [],
    checks: [],
    showEV: false
} as CiteConfig;

export const DefaultOptimizerContextData = {
    engine: 'beta_tachyon_pulse',
    setEngine: () => false,
    citeConfig: { ... DefaultCiteConfig },
    setCiteConfig: () => false,
    appliedProspects: [],
    setAppliedProspects: () => false,
    setResults: () => false,
    crewSkills: {}
} as ICitationOptimizerContext;


export const CiteOptContext = React.createContext<ICitationOptimizerContext>(DefaultOptimizerContextData);

export interface CiteOptContextProps {
    pageId: string;
    children: React.JSX.Element;
}

export const CitationOptimizerConfigProvider = (props: CiteOptContextProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { pageId, children } = props;

    if (!globalContext.player.playerData) return <></>;

    const { dbid } = globalContext.player.playerData.player;

    const [citeConfig, setCiteConfig] = useStateWithStorage<CiteConfig>(`${dbid}/${pageId}/cite_opt/config`, DefaultCiteConfig, { rememberForever: true });
    const [engine, setEngine] = useStateWithStorage<CiteEngine>(`${dbid}/${pageId}/cite_opt/engine`, 'beta_tachyon_pulse', { rememberForever: true });
    const [appliedProspects, setAppliedProspects] = React.useState<PlayerCrew[]>([]);

    const [results, setResults] = React.useState<CiteEngineResults | undefined>();

    const crewSkills = {} as { [key: string]: string };
    for (let crew of globalContext.core.crew) {
        let sko = printSkillOrder(crew).replace(/_skill/g, '');
        crewSkills[crew.symbol] = sko;
    }


    const data = {
        results,
        setResults,
        engine,
        setEngine,
        citeConfig,
        setCiteConfig,
        appliedProspects,
        setAppliedProspects,
        crewSkills
    }

    return <CiteOptContext.Provider value={data}>
        {children}
    </CiteOptContext.Provider>

}

