import React from "react"
import { Dropdown, Checkbox } from "semantic-ui-react"
import { RewardPicker } from "../crewtables/rewards"
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat"
import { PlayerCollection, PlayerCrew } from "../../model/player";

export interface RewardFilterProps {
    searchFilter: string;
    setSearchFilter: (value: string) => void;
    crewSource: PlayerCrew[];
    collectionSource: PlayerCollection[];
    narrow?: boolean;
    grouped: boolean;
    setGrouped: (value: boolean) => void;
    selection?: string[];
    setSelection: (value?: string[]) => void;
    hardFilter: boolean;
    setHardFilter: (value: boolean) => void;
}

export const RewardFilter = (props: RewardFilterProps) => {

    const { hardFilter, setHardFilter, searchFilter, setSearchFilter, crewSource, collectionSource, narrow, grouped, setGrouped, selection, setSelection } = props;

    return <React.Fragment>
                <div style={{
                    display: "flex",
                    flexDirection: 
                        window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : 'row',
                    alignItems:
                        window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'flex-start' : 'center',
                    justifyContent: "flex-start"			,
                    width:  
                        window.innerWidth < DEFAULT_MOBILE_WIDTH ? '100%' : '60%'
                }}>
                    <Dropdown
                        multiple
                        placeholder={'Select crew ...'}
                        clearable
                        selection
                        search
                        options={crewSource?.map(ca => {
                            return {
                                key: ca.name,
                                value: ca.name,
                                text: ca.name,
                                content: 
                                    <div key={"dropdown_opt_"+ca.symbol} style={{display:"inline-flex", alignItems:"center", flexDirection:"row"}}>
                                        <img 
                                            src={`${process.env.GATSBY_ASSETS_URL}${ca.imageUrlPortrait}`} 
                                            style={{height:'2em', marginRight:"0.5em"}} />
                                        {ca.name}
                                    </div>
                            }
                        }) ?? []}
                        //placeholder="Click crew name to filter..."
                        value={searchFilter.split(";").map(s => s.trim())}
                        onChange={(e, { value }) => setSearchFilter((value as string[])?.join("; "))} />


                    <RewardPicker 
                        short={grouped}
                        setShort={setGrouped}
                        source={collectionSource}
                        icons
                        value={selection} 
                        onChange={(value) => setSelection(value as string[] | undefined )}
                        />
                    <div style={{display:'grid', gridTemplateAreas: "'hard' 'grouped'"}}>
                        <Checkbox style={{gridArea: 'hard', margin: "0.5em 1em"}} label={"Hard filter"} checked={hardFilter} onChange={(e, { checked }) => setHardFilter(checked ?? false)} />
                        <Checkbox style={{gridArea: 'grouped', margin: "0.5em 1em"}} label={"Group rewards"} checked={grouped} onChange={(e, { checked }) => setGrouped(checked ?? false)} />
                    </div>
            </div>
    </React.Fragment>
}