import React from 'react';

import { CrewMember } from "../../model/crew";
import { LockedProspect } from "../../model/game-elements";
import { CiteMode, PlayerCrew } from "../../model/player";
import { CiteData, BetaTachyonSettings, SkillOrderRarity } from "../../model/worker";
import { DefaultBetaTachyonSettings } from "./btsettings";
import { useStateWithStorage } from '../../utils/storage';
import { GlobalContext } from '../../context/globalcontext';

export interface SymCheck { symbol: string, checked: boolean };

export const DefaultCiteConfig = {
    engine: 'beta_tachyon_pulse',
    portal: false,
} as CiteMode;

export interface ICitationOptimizerContext {	
    citeData?: CiteData;
    betaTachyonSettings: BetaTachyonSettings;
    setBetaTachyonSettings: (value: BetaTachyonSettings) => void;
    citeMode: CiteMode;
    setCiteMode: (value: CiteMode) => void;
    checks: SymCheck[];
    setChecks: (value: SymCheck[]) => void;
	skoMap: { [key: string]: SkillOrderRarity }
    setSkoMap: (value: { [key: string]: SkillOrderRarity }) => void;
	crewSkills: { [key: string]: string };
    setCrewSkills: (value: { [key: string]: string }) => void;
	prospects: LockedProspect[];
    setProspects: (value: LockedProspect[]) => void;
	appliedProspects: PlayerCrew[];
    setAppliedProspects: (value: PlayerCrew[]) => void;
	unownedProspects: boolean;
    setUnownedProspects: (value: boolean) => void;
	showEV: boolean;
    setShowEV: (value: boolean) => void;
};

export const DefaultOptimizerContextData = {
    citeMode: { ... DefaultCiteConfig },
    setCiteMode: () => false,
    checks: [],
    setChecks: () => false,
    betaTachyonSettings: { ...DefaultBetaTachyonSettings },
    setBetaTachyonSettings: () => false,
    skoMap: {},
    setSkoMap: () => false,
    crewSkills: {},
    setCrewSkills: () => false,
    prospects: [],
    setProspects: () => false,
    appliedProspects: [],
    setAppliedProspects: () => false,
    unownedProspects: true,
    setUnownedProspects: () => false,
    showEV: false,
    setShowEV: () => false
} as ICitationOptimizerContext;


export const CiteOptContext = React.createContext<ICitationOptimizerContext>(DefaultOptimizerContextData);

export interface CiteOptContextProps {
    pageId: string;
    children: JSX.Element;
}

export const CitationOptimizerConfigProvider = (props: CiteOptContextProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { pageId, children } = props;

    if (!globalContext.player.playerData) return <></>;

    const { dbid } = globalContext.player.playerData.player;

    const [citeMode, setCiteMode] = useStateWithStorage<CiteMode>(`${dbid}/${pageId}/citeMode`, {}, { rememberForever: true });


    const data = {
        ... DefaultOptimizerContextData,

    }

    
    return <CiteOptContext.Provider value={data}>
        {children}
    </CiteOptContext.Provider>
    




}

