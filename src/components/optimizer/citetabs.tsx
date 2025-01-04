import React from "react"
import { Segment, Icon, Tab } from "semantic-ui-react"
import { navToCrewPage } from "../../utils/nav"
import { CrewHoverStat } from "../hovering/crewhoverstat"
import { CiteOptContext } from "./context"
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat"
import { CiteOptTable } from "./citetable"
import { GlobalContext } from "../../context/globalcontext"
import { CiteData } from "../../model/worker"
import { VoyageGroupsComponent } from "./voyagegroups"



export const CitationOptimizerTabs = (props: { pageId: string }) => {
    const citeContext = React.useContext(CiteOptContext);
    const globalContext = React.useContext(GlobalContext);
    const { t, TRAIT_NAMES } = globalContext.localized;
    const { playerData } = globalContext.player;

    const { results, citeConfig } = citeContext;
    const { seatSkills, priSkills, secSkills, collections } = citeConfig;
    const { portal, nameFilter } = citeConfig;

    const preFilterData = results?.citeData;
    const compareCount = citeConfig.checks?.filter(z => z.checked)?.length;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
    const [citeData, setCiteData] = React.useState<CiteData | undefined>(undefined);
    const [confine, setConfine] = React.useState([] as string[]);

    React.useEffect(() => {
        const workset = !preFilterData ? undefined : { ...preFilterData, crewToCite: [...preFilterData?.crewToCite ?? []], crewToTrain: [...preFilterData?.crewToTrain ?? []] } as CiteData;

        workset?.crewToCite?.forEach((crew, idex) => crew.pickerId = idex + 1);
        workset?.crewToTrain?.forEach((crew, idex) => crew.pickerId = idex + 1);

        if (workset && priSkills?.length) {
            workset.crewToCite = workset.crewToCite.filter((crew) => crew.voyagesImproved?.some(vi => priSkills?.some(ci => vi.startsWith(ci.toLowerCase()))));
            workset.crewToTrain = workset.crewToTrain.filter((crew) => crew.voyagesImproved?.some(vi => priSkills?.some(ci => vi.startsWith(ci.toLowerCase()))));
        }

        if (workset && secSkills?.length) {
            workset.crewToCite = workset.crewToCite.filter((crew) => crew.voyagesImproved?.some(vi => secSkills?.some(ci => vi.endsWith(ci.toLowerCase()))));
            workset.crewToTrain = workset.crewToTrain.filter((crew) => crew.voyagesImproved?.some(vi => secSkills?.some(ci => vi.endsWith(ci.toLowerCase()))));
        }

        if (workset && seatSkills?.length) {
            workset.crewToCite = workset.crewToCite
                .map(crew => {
                    let fc = playerData?.player?.character?.crew?.find(fc => fc.name === crew.name);
                    if (fc) {
                        crew.base_skills = fc.base_skills;
                    }
                    return crew;
                })
                .filter((crew) => seatSkills?.some(sk => (sk.toLowerCase() + "_skill") in crew?.base_skills));

            workset.crewToTrain = workset.crewToTrain
                .map(crew => {
                    let fc = playerData?.player?.character?.crew?.find(fc => fc.name === crew.name);
                    if (fc) {
                        crew.base_skills = fc.base_skills;
                    }
                    return crew;
                })
                .filter((crew) => seatSkills?.some(sk => (sk.toLowerCase() + "_skill") in crew?.base_skills));
        }

        if (workset && portal !== undefined && globalContext?.player?.playerData?.player?.character?.crew?.length) {
            workset.crewToCite = workset.crewToCite.filter((crew) => globalContext.core.crew.find(c => c.name === crew.name)?.in_portal === portal);
            workset.crewToTrain = workset.crewToTrain.filter((crew) => globalContext.core.crew.find(c => c.name === crew.name)?.in_portal === portal);
        }

        if (workset && nameFilter) {
            if (nameFilter.startsWith("voyage:")) {
                const voyscan = nameFilter.slice(7).toLowerCase();
                const voycrew = workset.crewToCite.concat(workset.crewToTrain).find(d => d.name.toLowerCase() === voyscan);

                if (voycrew) {
                    const confine = [] as string[];
                    workset.crewToCite = workset.crewToCite.filter((crew) => crew.voyagesImproved?.some(p => voycrew.voyagesImproved?.includes(p)));
                    workset.crewToTrain = workset.crewToTrain.filter((crew) => crew.voyagesImproved?.some(p => voycrew.voyagesImproved?.includes(p)));
                    workset.crewToRetrieve = workset.crewToRetrieve?.filter((crew) => crew.voyagesImproved?.some(p => voycrew.voyagesImproved?.includes(p)));
                    for (let vn of voycrew.voyagesImproved ?? []) {
                        confine.push(vn);
                    }
                    setConfine(confine);
                }
                else {
                    workset.crewToCite = workset.crewToCite.filter((crew) => crew.name.toLowerCase().includes(voyscan));
                    workset.crewToTrain = workset.crewToTrain.filter((crew) => crew.name.toLowerCase().includes(voyscan));
                    workset.crewToRetrieve = workset.crewToRetrieve?.filter((crew) => crew.name.toLowerCase().includes(voyscan));
                }
            }
            else {
                const text = nameFilter?.toLowerCase() ?? "";
                workset.crewToCite = workset.crewToCite
                    .filter((crew) => crew.name.toLowerCase().includes(text) || crew.traits_hidden.includes(text) || crew.traits.some(t => TRAIT_NAMES[t].toLowerCase().includes(text)));
                workset.crewToTrain = workset.crewToTrain
                    .filter((crew) => crew.name.toLowerCase().includes(text) || crew.traits_hidden.includes(text) || crew.traits.some(t => TRAIT_NAMES[t].toLowerCase().includes(text)));
                workset.crewToRetrieve = workset?.crewToRetrieve
                    .filter((crew) => crew.name.toLowerCase().includes(text) || crew.traits_hidden.includes(text) || crew.traits.some(t => TRAIT_NAMES[t].toLowerCase().includes(text)));
            }
        }
        if (workset && collections?.length) {
            workset.crewToCite = workset.crewToCite
                .filter((crew) => crew.collection_ids.some(id => collections?.includes(Number(id))))
            workset.crewToTrain = workset.crewToTrain
                .filter((crew) => crew.collection_ids.some(id => collections?.includes(Number(id))))
            workset.crewToRetrieve = workset?.crewToRetrieve
                .filter((crew) => crew.collection_ids.some(id => collections?.includes(Number(id))))
        }
        setCiteData(workset);
    }, [citeConfig, results]);

    return <><Segment>
        {!citeData &&
            <>
                <Icon loading name='spinner' /> {t('spinners.cite_opt')}
            </>}

        {citeData &&
            <>
                <Tab
                    panes={[
                        { menuItem: isMobile ? t('cite_opt.tabs.cite.title_short') : t('cite_opt.tabs.cite.title'), render: () => <CiteOptTable data={citeData.crewToCite} tabName={'cite'} pageId={'cite'} training={false} /> },
                        { menuItem: isMobile ? t('cite_opt.tabs.retrievable.title_short') : t('cite_opt.tabs.retrievable.title'), render: () => <CiteOptTable data={citeData.crewToRetrieve} tabName={'retrieve'} pageId={'retrieve'} training={false} /> },
                        { menuItem: isMobile ? t('cite_opt.tabs.train.title_short') : t('cite_opt.tabs.train.title'), render: () => <CiteOptTable data={citeData.crewToTrain} tabName={'train'} pageId={'train'} training={true} /> },
                        { menuItem: isMobile ? t('cite_opt.tabs.groups.title_short') : t('cite_opt.tabs.groups.title') + (compareCount ? ' (' + compareCount + ')' : ''), render: () => <VoyageGroupsComponent data={citeData} confine={confine} /> },
                    ]} />
            </>}
    </Segment>
        <CrewHoverStat targetGroup='citationTarget' /></>

}