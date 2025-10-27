import React from 'react';
import { Segment, Checkbox, Button } from 'semantic-ui-react';
import ProspectPicker from '../prospectpicker';
import { useStateWithStorage } from '../../utils/storage';
import { LockedProspect } from '../../model/game-elements';
import { GlobalContext } from '../../context/globalcontext';
import { CiteMode, PlayerCrew } from '../../model/player';
import { applyCrewBuffs } from '../../utils/crewutils';
import { CiteOptContext } from './context';

export interface CitationProspectsProps {
    pageId: string;
}

export const CitationProspects = (props: CitationProspectsProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    const citeContext = React.useContext(CiteOptContext);

    const dbid = globalContext.player.playerData?.player.dbid ?? '';

    const { pageId } = props;

    const { citeConfig, setCiteConfig } = citeContext;
    const { appliedProspects, setAppliedProspects } = citeContext;

    const [prospects, internalSetProspects] = useStateWithStorage<LockedProspect[]>(`${dbid}/${pageId}/cite_opt/locked_prospects`, [], { rememberForever: true });
    const [unownedOnly, setUnownedOnly] = useStateWithStorage<boolean>(`${dbid}/${pageId}/cite_opt/locked_prospects`, false, { rememberForever: true });

    React.useEffect(() => {
        if (prospects?.length) applyProspects();
    }, []);

    const corePool = globalContext.core.crew.filter(c => {
        let res = Object.keys(c.base_skills).length === 3 && (!citeConfig.rarities?.length || citeConfig.rarities.includes(c.max_rarity));
        if (res && unownedOnly) {
            res &&= !!globalContext.player.playerData?.player.character.unOwnedCrew?.find(f => f.symbol === c.symbol)
        }
        return res;
    });

    if (!Array.isArray(prospects)) return <></>
    return <React.Fragment>
        <Segment>
            <h3>{t('crew_views.prospect.title')}</h3>

            <Checkbox checked={unownedOnly} onChange={(e, { checked }) => setUnownedOnly(!!checked)}
                label={t('crew_ownership.unowned')} />

            <div style={{ display: "flex", flexDirection: "row", gap: "1em", alignItems: "flex-start", marginTop: "0.5em" }}>

                <div style={{ display: "block" }}>
                    <ProspectPicker
                        prospects={prospects}
                        setProspects={setProspects}
                        pool={corePool} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25em" }}>
                    <Button onClick={(e) => setTimeout(() => applyProspects())}>{t('cite_opt.prospect.apply')}</Button>
                    <i>({t('cite_opt.prospect.apply_notice')})</i>
                </div>
            </div>

        </Segment>
    </React.Fragment>

    function applyProspects() {

        if (!prospects) {
            setProspects([]);
            return;
        }
        else if (prospects.length === undefined) {
            setProspects([]);
            return;
        }

        const { crew } = globalContext.core;
        const { buffConfig } = globalContext.player;

        if (!crew) return;
        let outcrew = [] as PlayerCrew[];
        let nid = -90000;

        prospects.forEach((p) => {
            let c = crew.find(f => f.symbol === p.symbol) as PlayerCrew;
            if (c) {
                c = structuredClone(c) as PlayerCrew;
                c.id = nid--;
                c.date_added = new Date(c?.date_added);
                c.level = 100;
                c.rarity = p.rarity;
                c.prospect = true;
                c.equipment = [0, 1, 2, 3];
                c.immortal = 0;
                let skillset = c.skill_data.find(f => f.rarity === p.rarity);
                if (skillset) {
                    c.base_skills = skillset.base_skills;
                }
                if (buffConfig) {
                    applyCrewBuffs(c, buffConfig);
                }
                Object.keys(c.base_skills).forEach((skill) => {
                    c.skills ??= {}
                    if (c[skill]) {
                        c.skills[skill] = {
                            core: c[skill].core,
                            range_min: c[skill].min,
                            range_max: c[skill].max
                        }
                    }
                });

                outcrew.push(c);
            }
        });

        setAppliedProspects(outcrew);
    }

    function setProspects(prospects: LockedProspect[]) {
        prospects.forEach(p => {
            if (p.rarity === p.max_rarity) p.rarity = 1;
        });
        internalSetProspects(prospects);
    }
}


