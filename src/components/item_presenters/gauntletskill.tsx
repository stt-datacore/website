import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { CrewMember, Skill } from "../../model/crew";
import { Gauntlet } from "../../model/gauntlets";
import { PlayerCrew } from "../../model/player";
import { PresenterPlugin, PresenterPluginBase, PresenterPluginProps, PresenterPluginState } from "./presenter_plugin";
import { getPlayerPairs, getSkills } from "../../utils/crewutils";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { StatLabel } from "../statlabel";



export interface GauntletSkillProps extends PresenterPluginProps<PlayerCrew | CrewMember> {
    data: Gauntlet | Gauntlet[];
}

export interface GauntletSkillsState extends PresenterPluginState {

}

export class GauntletSkill extends PresenterPlugin<PlayerCrew | CrewMember, GauntletSkillProps, GauntletSkillsState> {
    static contextType = GlobalContext;
    context!: React.ContextType<typeof GlobalContext>;
    props!: Readonly<GauntletSkillProps>;
    
    constructor(props: GauntletSkillProps) {
        super(props);
    }
    
    private readonly drawLeftArea = () => {

        const { context: crew, data: node } = this.props;

        if (Array.isArray(node)) {

            let highGaunt = [ ... new Set(node.filter(f => f.contest_data?.traits.some(t => crew.traits.includes(t))).map(t => t.contest_data?.traits ?? [])) ];
            highGaunt = [ ... new Set(highGaunt.map(m => m.join("_"))) ].map(m => m.split("_"));
            let critters = {} as { [key: string]: number };

            for (let gaunt of highGaunt) {
                let tf = gaunt.filter(t => crew.traits.includes(t));
                if (tf?.length) {
                    let pct = `${tf.length * 20 + 5}%`;
                    critters[pct] ??= 0;
                    critters[pct]++;
                }                
            }

            return (<div style={{
                gridArea: 'left',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                marginBottom: "0.25em",                
                flexGrow: 1
            }}>
                {Object.keys(critters).sort().reverse().map((crit) => {

                    let text = crit;
                    let count = critters[crit];

                    return (
                        <div style={{margin:"0.25em 0 0 0", width: '100%', height: '32px'}}>
                        <StatLabel    
                            size={'medium'}                        
                            title={`${text} Crit`}
                            value={count}
                        />
                        </div>)
                })}
            </div>)
        }
        else {
            const prettyTraits = node.prettyTraits;

            return (<div style={{gridArea: 'left', display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center'}}>
                <div style={{margin: "0.5em"}}>
                
                {((prettyTraits?.filter(t => crew.traits_named.includes(t))?.length ?? 0) * 20 + 5) + "%"}
                </div>
                <div style={{margin: "0.5em"}}>
                    {crew.base_skills[node.contest_data?.featured_skill ?? "_invalid"] ? 
                    <img style={{width: '1em'}} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${node.contest_data?.featured_skill}.png`} /> 
                    : ''}
                </div>
            </div>)
        }

    }

    render() {
        const { context: crew, data: node } = this.props;
        if (!Array.isArray(node)) {

        }
        const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

        const skills = getSkills(crew);
        const pairs = getPlayerPairs(crew) ?? [[], []];

        let ask = [] as { name: string, max: number, min: number }[];

        for (let skill of skills) {
            let bs: Skill | undefined = undefined;
            
            if ("skills" in crew && skill in crew.skills) {
                bs = crew.skills[skill];
            }
            else if (skill in crew) {
                bs = { core: crew[skill].core, range_min: crew[skill].min, range_max: crew[skill].max };
            }
            else {
                bs = crew.base_skills[skill];
            }
            
            if (bs) ask.push({ name: skill, max: bs.range_max, min: bs.range_min });
        }
        
        ask.sort((a, b) => b.max - a.max);
        const best = ask.slice(0, ask.length < 2 ? 1 : 2);

        return (<div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            width: "100%"
        }}>
            
            <div style={{
                display: 'grid',
                gridTemplateAreas: "'left right'",
                gridTemplateColumns: "75% auto",
                // display: "flex",
                // flexDirection: isMobile ? 'column' : "row",
                // justifyContent: isMobile ? 'center' : "space-evenly",
                // justifyItems: 'center',
                // alignContent: 'center',
                // alignItems: "center",
                fontSize: "3em",
//                minHeight: "4em"
            }}>                
                {this.drawLeftArea()}                
                <div style={{gridArea: 'right', fontSize: "12pt", marginTop: "1em", marginBottom: "1em"}} title="Best Pair">                    
                    <img style={{height: '2em', margin: "0.25em"}} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${pairs[0][0].skill}.png`} /> 
                    <img style={{height: '2em', margin: "0.25em"}} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${pairs[0][1].skill}.png`} /> 
                    <div style={{margin: "0.25em"}}>{"Best Pair"}</div>
                </div>
            </div>
        </div>);
    }

}