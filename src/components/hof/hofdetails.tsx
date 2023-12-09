import React from "react";
import { RawVoyageRecord, guessSkillsFromCrew } from "../../utils/voyageutils"
import { CrewMember } from "../../model/crew";
import { gradeToColor, skillToRank } from "../../utils/crewutils";
import CONFIG from "../CONFIG";
import { GlobalContext } from "../../context/globalcontext";
import { Button } from "semantic-ui-react";
import { appelate } from "../../utils/misc";
import ItemDisplay from "../itemdisplay";
import VoyageStats from "../voyagecalculator/voyagestats";
import { VoyageHOFState, VoyageStatEntry } from "../../model/hof";
import { navigate } from "gatsby";


export const formatNumber = (value: number, max: number, mult?: number, suffix?: string) => {
    let s = "";
    mult ??= 1;
    if (suffix) suffix = " " + suffix;
    else suffix = "";
    let fmt = Math.round((value * mult) * 10) / 10;
    return (
        <span style={{ color: gradeToColor(value / max) ?? undefined }}>
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

    const { voyageStats, glanceDays, rawVoyages, crewSymbol } = props.hofState;
    const { crewClick } = props;

    const { crew: allCrew } = context.core;
    const featured = allCrew?.find(c => c.symbol === crewSymbol);
    const voyCounts = {} as { [key: string]: number };
    const seatMap = {} as { [key: string]: number };
    const ccount = {} as { [key: string]: number };

    let ridesWith = [] as CrewMember[];
    let seatKeys = [] as string[];
    let countKeys = [] as string[];

    if (featured && rawVoyages) {

        rawVoyages.forEach((voyage) => {
            if (!voyage.primary_skill || !voyage.secondary_skill) {
                let guess = guessSkillsFromCrew(voyage, context.core.crew);
                if (guess?.length && guess.length >= 2) {
                    voyage.primary_skill = guess[0];
                    voyage.secondary_skill = guess[1];
                }
            }

            voyage.crew.forEach((c, x) => {
                if (c === crewSymbol) {
                    seatMap[CONFIG.VOYAGE_CREW_SLOTS[x]] ??= 0;
                    seatMap[CONFIG.VOYAGE_CREW_SLOTS[x]]++;
                    return;
                }
                ccount[c] ??= 0;
                ccount[c]++;
            });

            let key = `${skillToRank(voyage.primary_skill as string)}/${skillToRank(voyage.secondary_skill as string)}`;

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
        seatKeys.sort((a, b) => seatMap[b] - seatMap[a]);
    }


    return (<React.Fragment>

        {!!crewSymbol && (!rawVoyages || (featured?.symbol !== crewSymbol)) && context.core.spin(`Loading details for '${featured?.name ?? crewSymbol}' ...`)}
        {!!crewSymbol && !!rawVoyages?.length && !!featured && <>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: "12pt",
                    maxWidth: '28em'
                }}>
                    <h2>{featured.name}</h2>
                    <img style={{ height: "25em", cursor: "pointer" }} 
                        onClick={(e) => navigate(`/crew/${featured.symbol}`)}
                        src={`${process.env.GATSBY_ASSETS_URL}${featured.imageUrlFullBody}`} />

                    <p>{glanceDays} Day Details: {formatNumber(rawVoyages.length, Math.max(rawVoyages.length, voyageStats?.lastThirtyDays?.length ?? rawVoyages.length), 1)} Voyages</p>
                    <p>Average Duration:{" "}{formatNumber(rawVoyages.map(r => r.estimatedDuration ?? 0).reduce((p, n, idx) => ((p * idx) + n) / (idx + 1), 0), 0, 1 / 3600, "h")}</p>
                </div>
                <h3 style={{textAlign:'center', margin: "1.5em 0em"}}><b>Most Frequent Voyages</b></h3>
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
                    {countKeys.slice(0,3).map((skills) => {
                        return <div
                            className={'ui label'}
                            style={{ width: "10em", fontSize: "1.25em", height: "2em", display: 'grid', gridTemplateAreas: "'skills value'" }}
                            key={`voycountskill_${skills}`}>
                            <div style={{ gridArea: 'skills' }}>{skills}</div>
                            <div style={{ gridArea: 'value', textAlign: 'right' }}>{Math.round(100 * (voyCounts[skills] / rawVoyages.length))}%</div>
                        </div>
                    })}
                </div>
                <h3 style={{textAlign:'center', margin: "1.5em 0em"}}><b>Other Voyages</b></h3>

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
                    {countKeys.slice(3).map((skills) => {
                        return <div
                            className={'ui label'}
                            style={{ width: "8em", fontSize: "1em", height: "2em", display: 'grid', gridTemplateAreas: "'skills value'" }}
                            key={`voycountskill_${skills}`}>
                            <div style={{ gridArea: 'skills' }}>{skills}</div>
                            <div style={{ gridArea: 'value', textAlign: 'right' }}>{Math.round(100 * (voyCounts[skills] / rawVoyages.length))}%</div>
                        </div>
                    })}
                </div>
            </div>
            <div>
                <h3 style={{textAlign:'center', margin: "1.5em 0em"}}><b>Seating Frequency</b></h3>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-evenly',
                    flexWrap: 'wrap',
                    gap: "0.5em",
                    maxWidth:"50em",
                    margin: "0.5em"
                }}>
                    {seatKeys.slice(0, 5).map((seat, idx) => {
                        let bidx = CONFIG.VOYAGE_CREW_SLOTS.indexOf(seat);
                        let skill = VoyageSeats[bidx];
                        return <div> <div
                            className={'ui label'}
                            style={{ width: "16em", fontSize: "1em", height: "4em", display: 'grid', gridTemplateAreas: "'skill seat value'", alignItems: "center" }}
                            key={`voycountseat_${seat}`}>
                            <img style={{ gridArea: 'skill', height: "24px", margin: "0.5em 1em" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`} />
                            <div style={{ gridArea: 'seat' }}>{appelate(seat)}</div>
                            <div style={{ gridArea: 'value', textAlign: 'right' }}>{Math.round(100 * (seatMap[seat] / rawVoyages.length))}%</div>
                        </div></div>
                    })}
                </div>
                <h3 style={{textAlign:'center', margin: "1.5em 0em"}}><b>Most Frequent Co-Voyagers</b></h3>
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