import React from "react";
import { Grid, Label, Segment } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { ObjectiveEvent } from "../../model/player";
import { getIconPath } from "../../utils/assets";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { OEModal } from "./oemodal";

export const OEPicker = () => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { objective_events, factions } = globalContext.core;

    const [active, setActive] = React.useState<ObjectiveEvent | undefined>(undefined);

    const pickerOpts = objective_events.map(oe => ({
        key: `oe_${oe.id}`,
        value: oe.symbol,
        text: oe.name
    }));

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    return <div style={{...flexCol, alignItems: 'stretch', justifyContent: 'stretch', gap: '1em' }}>
        <Grid columns={2} stackable>
            {objective_events.map((oe) => {
                return (
                    <Grid.Column key={`_objective-${oe.symbol}`}>
                        <Segment style={{cursor: 'pointer'}} onClick={() => setActive(oe)}>
                            <div style={{padding: '1em', paddingBottom: '3em'}}>
                                <img style={{height: '300px', width: '500px'}} src={`${process.env.GATSBY_ASSETS_URL}${getIconPath(oe.image, true)}`} />
                            </div>
                            <Label attached="bottom">
                                <h3>
                                {oe.name}
                                </h3>
                            </Label>
                        </Segment>
                    </Grid.Column>
                )
            })}
        </Grid>

        <OEModal
            data={active}
            isOpen={!!active}
            setIsOpen={(value) => {
                if (!value) {
                    setActive(undefined);
                }
            }}
            />
    </div>
}