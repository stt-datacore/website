import React from "react";
import { Dropdown, DropdownItemProps, Rating } from "semantic-ui-react";
import { PlayerCrew } from "../../model/player";
import { qbitsToSlots } from "../../utils/crewutils";

export interface CrewPickerProperties {
    selection?: number[];
    setSelection: (value?: number[]) => void;
    pool: PlayerCrew[];
    multiple?: boolean;
    placeholder?: string;
    style?: React.CSSProperties;
    maxSelection?: number;
}

export const CrewPicker = (props: CrewPickerProperties) => {
    const { pool, multiple, setSelection, style, placeholder, maxSelection } = props;
    const [crewChoices, setCrewChoices] = React.useState([] as DropdownItemProps[]);

    const selection = !!props.selection && typeof props.selection !== 'number' && !props.multiple ? props.selection[0] : props.selection;

    React.useEffect(() => {
        const newChoices = [] as DropdownItemProps[];

        pool.forEach((c) => {
            newChoices.push({
                key: c.symbol,
                value: c.id,
                text: c.name,
                content: (
                    <React.Fragment>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "48px auto",
                                gridTemplateAreas: "'img text' 'img rarity'",
                            }}
                        >
                            <img
                                src={`${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}`}
                                style={{
                                    height: "32px",
                                    gridArea: "img",
                                }}
                            />
                            <div
                                style={{
                                    gridArea: "text",
                                    textAlign: "left",
                                    marginBottom: "0.25em",
                                }}
                            >
                                {c.name}
                            </div>
                            <div style={{ gridArea: "rarity", display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Rating
                                    icon={"star"}
                                    maxRating={c.max_rarity}
                                    rating={c.max_rarity}
                                    size={"tiny"}
                                />
                                <div style={{alignSelf: 'right'}}>
                                    {c.q_bits} ({qbitsToSlots(c.q_bits)})
                                </div>
                                
                            </div>
                            
                        </div>
                    </React.Fragment>
                )
            });
        });

        setCrewChoices(newChoices);
    }, [pool])

    if (!pool.length || !pool.every(p => p.id)) {
        return <></>;
    }

    const internalSetSelection = (value: number[] | number | undefined) => {
        if (typeof value === 'number') {
            value = [value];
        }
        if (value && maxSelection && value.length > maxSelection) {
            value.splice(0, value.length - maxSelection);
        }
        setSelection(value);
    }

    return <Dropdown 
        style={style}
        search 
        selection        
        clearable
        multiple={multiple}
        placeholder={placeholder ?? "Search for a crew member..."}
        labeled
        options={crewChoices}
        value={selection}
        onChange={(e, { value }) => internalSetSelection(value as number[] | number | undefined)}
    />
};
