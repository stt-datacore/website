import React from "react";
import { guessSkillsFromCrew } from "../../utils/voyageutils";
import { CrewMember } from "../../model/crew";
import { gradeToColor, skillToShort } from "../../utils/crewutils";
import CONFIG from "../CONFIG";
import { GlobalContext } from "../../context/globalcontext";
import { appelate, mobileCheck } from "../../utils/misc";
import ItemDisplay from "../itemdisplay";
import { VoyageHOFState } from "../../model/hof";
import { navigate } from "gatsby";
import themes from '../nivo_themes';

import { ResponsiveSunburst } from "@nivo/sunburst";
import { ResponsiveChord, Chord } from '@nivo/chord'
import { StatTreeNode } from "../../utils/statutils";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";

export const formatNumber = (value: number, max: number, mult?: number, suffix?: string) => {
    let s = "";
    mult ??= 1;
    if (suffix) suffix = " " + suffix;
    else suffix = "";
    let fmt = Math.round((value * mult) * 10) / 10;
    let grade = value / max;
    if (grade > 1) grade = 1;
    return (
        <span style={{ color: gradeToColor(grade) ?? undefined }}>
            {fmt.toLocaleString() + suffix}
        </span>
    );
};


export interface HofDetailsProps {

    crewClick: (symbol?: string) => void;
    hofState: VoyageHOFState;
}
const VoyageSeats = [
    'command_skill',
    'command_skill',
    'diplomacy_skill',
    'diplomacy_skill',
    'security_skill',
    'security_skill',
    'engineering_skill',
    'engineering_skill',
    'science_skill',
    'science_skill',
    'medicine_skill',
    'medicine_skill'
];
export const HofDetails = (props: HofDetailsProps) => {
    const context = React.useContext(GlobalContext);

    const { voyageStats, glanceDays, rawVoyages } = props.hofState;
    const crewSymbol = props.hofState.crewSymbol?.filter(f => !!f?.length && f !== 'undefined');
    const { crewClick } = props;

    const { crew: allCrew } = context.core;
    const featuredList = allCrew?.filter(c => crewSymbol?.includes(c.symbol));
    const voyCounts = {} as { [key: string]: number };
    const seatMap = {} as { [key: string]: number };
    const ccount = {} as { [key: string]: number };

    let ridesWith = [] as CrewMember[];
    let seatKeys = [] as string[];
    let countKeys = [] as string[];
    
    let skill_data = { name: 'skills', children: [] as StatTreeNode[], value: 0, loc: 0, valueGauntlet: 0 } as StatTreeNode;

    let chorddata = [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]] as number[][];
    let chordkeys = CONFIG.SKILLS_SHORT.map(m => m.short).sort();

    const addSeat = (x: number, crew: string) => {
        let key = CONFIG.VOYAGE_CREW_SLOTS[x] + "," + crew;
        seatMap[key] ??= 0;
        seatMap[key]++;
    }

    const getSeatCounts = (crew: string) => {
        let keys = Object.keys(seatMap).filter(f => f.endsWith("," + crew));
        let result = {} as { [key: string]: number };
        keys.forEach((key) => {
            let keysplit = key.split(",");
            let seat = keysplit[0];
            result[seat] = seatMap[key];
        });
        return result;
    }

    if (featuredList && rawVoyages) {        

        rawVoyages.forEach((voyage) => {
            if (!voyage.primary_skill || !voyage.secondary_skill) {
                let guess = guessSkillsFromCrew(voyage, context.core.crew);
                if (guess?.length && guess.length >= 2) {
                    voyage.primary_skill = guess[0];
                    voyage.secondary_skill = guess[1];
                }
            }

            const shortskills = [voyage.primary_skill, voyage.secondary_skill].map(v => CONFIG.SKILLS_SHORT.find(f => f.name === v)?.short ?? '');

            let sb = skill_data.children.find(f => f.name === shortskills[0]);
            if (!sb) {
                skill_data.children.push({
                    name: shortskills[0],
                    value: 1,
                    valueGauntlet: 0,
                    loc: 1,
                    children: [] as StatTreeNode[]
                } as StatTreeNode)
            }
            else {
                //sb.value++;
                //sb.loc++;
            }

            let sb2 = sb?.children.find(f => f.name === `${shortskills[0]} / ${shortskills[1]}`);

            if (!sb2) {
                sb?.children.push({
                    name: `${shortskills[0]} / ${shortskills[1]}`,
                    value: 1,
                    valueGauntlet: 1,
                    loc: 1,
                    children: [] as StatTreeNode[]
                } as StatTreeNode)
            }
            else {
                sb2.value++;
                sb2.loc++;
            }

            let i1 = chordkeys.indexOf(shortskills[0]);
            let i2 = chordkeys.indexOf(shortskills[1]);

            //chorddata[i1][i1]++;
            chorddata[i1][i2]++;
            //chorddata[i2][i1]++;
            //chorddata[i2][i2]++;

            voyage.crew.forEach((c, x) => {
                if (crewSymbol?.includes(c)) {
                    addSeat(x, c);
                    return;
                }
                ccount[c] ??= 0;
                ccount[c]++;
            });

            let key = `${skillToShort(voyage.primary_skill as string)}/${skillToShort(voyage.secondary_skill as string)}`;

            voyCounts[key] ??= 0;
            voyCounts[key]++;

        });
        let csymbols = Object.keys(ccount);
        csymbols.sort((a, b) => {
            return ccount[b] - ccount[a];
        });

        ridesWith = csymbols.map(symbol => allCrew?.find(c => c.symbol === symbol) as CrewMember);
        countKeys = Object.keys(voyCounts);
        seatKeys = Object.keys(seatMap);
        countKeys.sort((a, b) => voyCounts[b] - voyCounts[a]);
        seatKeys.sort((a, b) => {
            let r = seatMap[b] - seatMap[a];
            if (!r) r = a.localeCompare(b);
            return r;
        });
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    return (<React.Fragment>

        {!!crewSymbol?.length && (!rawVoyages || (featuredList?.length !== crewSymbol?.length)) && context.core.spin(`Loading details for '${featuredList?.map(f => f.name)?.join(", ") ?? crewSymbol}' ...`)}
        {!!crewSymbol && !!rawVoyages?.length && !!featuredList && <>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
            }}>

                {featuredList.length > 1 && <h3>Shared Voyages</h3>}

                <p>{glanceDays} Day Details: {rawVoyages.length.toLocaleString()} Voyages</p>
                <p>Average Duration:{" "}{formatNumber(rawVoyages.map(r => r.estimatedDuration ?? 0).reduce((p, n, idx) => ((p * idx) + n) / (idx + 1), 0), 0, 1 / 3600, "h")}</p>

                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    textAlign: 'center'
                }}>

                    {featuredList.map((featured, idx) => {

                        return (
                            <div 
                                key={`${featured.symbol}_featured_${idx}`}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: "12pt",
                                    maxWidth: "40em",
                                    margin: "1em"
                                }}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: "12pt"
                                }}>
                                    <h2>{featured.name}</h2>
                                    <img style={{ height: "25em", cursor: "pointer" }}
                                        onClick={(e) => navigate(`/crew/${featured.symbol}`)}
                                        src={`${process.env.GATSBY_ASSETS_URL}${featured.imageUrlFullBody}`} />

                                </div>
                                <h3 style={{ textAlign: 'center', margin: "1.5em 0em" }}><b>Seating Frequency</b></h3>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-evenly',
                                    flexWrap: 'wrap',                                    
                                    gap: "0.5em",
                                    margin: "0.5em"
                                }}>
                                    {seatKeys.map((seatkey, idx) => {
                                        let [seat, crew] = seatkey.split(",");
                                        if (crew !== featured.symbol) return <></>;

                                        let bidx = CONFIG.VOYAGE_CREW_SLOTS.indexOf(seat);
                                        let skill = VoyageSeats[bidx];
                                        const count = getSeatCounts(featured.symbol)[seat];
                                        if (count < 1) return <></>
                                        return <div> <div
                                            className={'ui label'}
                                            style={{ 
                                                textAlign: 'left',
                                                width: "18em", 
                                                fontSize: "0.8em", 
                                                lineHeight: "1.2em",
                                                height: "4.5em", 
                                                display: 'grid', 
                                                gridTemplateAreas: "'skill seat value'", 
                                                gridTemplateColumns: "64px auto auto",
                                                alignItems: "center" 
                                            }}
                                            key={`voycountseat_${seat}_${featured.symbol}`}>
                                            <img style={{ gridArea: 'skill', height: "18px", margin: "0.5em 1em" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} />
                                            <div style={{ gridArea: 'seat' }}>{appelate(seat)}</div>
                                            <div style={{ gridArea: 'value', textAlign: 'right', margin: "0.5em 1em" }}>{Math.round(100 * (count / rawVoyages.length))}%</div>
                                        </div></div>
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <h3 style={{ textAlign: 'center', margin: "1.5em 0em" }}><b>Most Frequent Voyages{featuredList.length > 1 && <>&nbsp;Together</>}</b></h3>                
                <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ height: '320px', width: '320px', display: 'inline-block' }}>
						<ResponsiveSunburst
							data={skill_data}
							theme={themes.dark}                            
							margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
							id='name'
							value='loc'
							cornerRadius={2}
							borderWidth={1}                            
							colors={{ scheme: 'nivo' }}
							childColor={{ from: 'color' }}
							animate={true}                                                        
							isInteractive={true}                            
						/>
					</div>                
  
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-evenly',
                            flexWrap: 'wrap',
                            gap: "0.5em",
                            maxWidth: "50em",
                            margin: "0.5em"
                        }}>
                            {countKeys.filter(f => voyCounts[f]).slice(0, 3).map((skills) => {
                                return <div
                                    className={'ui label'}
                                    style={{ width: "10em", fontSize: "1.25em", height: "2em", display: 'grid', gridTemplateAreas: "'skills value'" }}
                                    key={`voycountskill_${skills}`}>
                                    <div style={{ gridArea: 'skills' }}>{skills}</div>
                                    <div style={{ gridArea: 'value', textAlign: 'right' }}>{Math.round(100 * (voyCounts[skills] / rawVoyages.length))}%</div>
                                </div>
                            })}
                        </div>

                        <h3 style={{ textAlign: 'center', margin: "1.5em 0em" }}><b>Other Voyages</b></h3>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-evenly',
                            flexWrap: 'wrap',
                            gap: "0.5em",
                            maxWidth: "50em",
                            margin: "0.5em"
                        }}>
                            {countKeys.filter(f => voyCounts[f]).slice(3).map((skills) => {
                                return <div
                                    className={'ui label'}
                                    style={{ margin: 0, width: "9em", fontSize: "1em", height: "2em", display: 'grid', gridTemplateAreas: "'skills value'" }}
                                    key={`voycountskill_${skills}`}>
                                    <div style={{ gridArea: 'skills' }}>{skills}</div>
                                    <div style={{ gridArea: 'value', textAlign: 'right' }}>{Math.round(100 * (voyCounts[skills] / rawVoyages.length)) || " < 1"}%</div>
                                </div>
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <div>

                <h3 style={{ textAlign: 'center', margin: "1.5em 0em" }}><b>Most Frequent Co-Voyagers</b></h3>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-evenly',
                    margin: "0.5em",
                    maxWidth: "50em"
                }}>
                    {ridesWith.slice(0, 12).map((crew) => {

                        return <div key={"hofkey_ride_" + crew.symbol}
                            title={'Click to switch to this crew'}
                            onClick={(e) => crewClick(crew.symbol)}
                            style={{
                                cursor: "pointer",
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'top',
                                width: "12em",
                                height: "12em"
                            }}>
                            <ItemDisplay
                                itemSymbol={crew.symbol}
                                allCrew={allCrew}
                                playerData={context?.player.playerData}
                                size={64}
                                rarity={crew.max_rarity}
                                maxRarity={crew.max_rarity}
                                src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
                                targetGroup={'voyagehof'}
                            />
                            <div style={{ margin: "0.5em", textAlign: 'center' }}>{crew.name}</div>
                            <h4 className={'ui label'}>{ccount[crew.symbol].toLocaleString()}</h4>
                        </div>
                    })}
                </div>
            </div>
        </>
        }

    </React.Fragment>)


}