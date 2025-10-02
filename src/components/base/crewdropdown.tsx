import React from "react";
import { Dropdown, DropdownItemProps, Icon, Rating } from "semantic-ui-react";
import { PlayerCrew } from "../../model/player";
import { qbitsToSlots } from "../../utils/crewutils";
import { CrewMember } from "../../model/crew";

export interface CrewPickerProperties {
    selection?: number[];
    setSelection: (value?: number[]) => void;
    pool: (PlayerCrew | CrewMember)[];
    multiple?: boolean;
    placeholder?: string;
    style?: React.CSSProperties;
    maxSelection?: number;
    fluid?: boolean;
    plain?: boolean;
    showRarity?: boolean;
    custom?: (crew: PlayerCrew | CrewMember) => React.JSX.Element;
    archetypeId?: boolean;
    upward?: boolean;
}

export const CrewDropDown = (props: CrewPickerProperties) => {
    const { upward, archetypeId, showRarity, custom, pool, multiple, setSelection, style, placeholder, maxSelection, fluid, plain } = props;
    const [crewChoices, setCrewChoices] = React.useState([] as DropdownItemProps[]);

    const selection = !!props.selection && typeof props.selection !== 'number' && !props.multiple ? props.selection[0] : props.selection;

    React.useEffect(() => {
        const newChoices = [] as DropdownItemProps[];

        pool.forEach((c) => {
            const crewKey = c.symbol + "_" + (c.id?.toString() ?? '_');
            let rarity = c.max_rarity;
            if (showRarity) {
                if ("immortal" in c && c.immortal < -1) rarity = 0;
                else if ("rarity" in c) rarity = c.rarity;
            }
            newChoices.push({
                key: crewKey,
                value: archetypeId ? c.archetype_id : c.id,
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
                                    display: 'flex',
                                    flexDirection: 'row',
                                    gap: "0.25em",
                                    justifyContent: 'flex-start',
                                    alignItems: 'center'
                                }}
                            >
                                {"immortal" in c && c.immortal > 0 &&
                                <Icon name={'snowflake'} size={'small'} />}
                                {c.name}
                            </div>
                            <div style={{ gridArea: "rarity", display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Rating
                                    icon={"star"}
                                    maxRating={c.max_rarity}
                                    rating={rarity}
                                    disabled
                                    size={"tiny"}
                                />
                                {!plain && !custom &&
                                <div style={{alignSelf: 'right'}}>
                                    {c.q_bits} ({qbitsToSlots(c.q_bits)})
                                </div>}
                                {!plain && custom && custom(c)}
                            </div>

                        </div>
                    </React.Fragment>
                )
            });
        });

        setCrewChoices(newChoices);
    }, [pool])

    if (!pool.length || !pool.every(p => p.id || (archetypeId && p.archetype_id))) {
        return <></>;
    }

    return <Dropdown
        style={style}
        search
        selection
        clearable
        upward={upward}
        fluid={fluid}
        multiple={multiple}
        placeholder={placeholder ?? "Search for a crew member..."}
        labeled
        options={crewChoices}
        value={selection}
        onChange={(e, { value }) => internalSetSelection(value as number[] | number | undefined)}
    />

    function internalSetSelection(value: number[] | number | undefined) {
        if (typeof value === 'number') {
            value = [value];
        }
        if (value && maxSelection && value.length > maxSelection) {
            value.splice(0, value.length - maxSelection);
        }
        setSelection(value);
    }

};
