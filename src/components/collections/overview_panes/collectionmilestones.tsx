import React from "react"
import { Collection } from "../../../model/game-elements"
import { GlobalContext } from "../../../context/globalcontext";
import { Icon, Tab, Table } from "semantic-ui-react";
import { PlayerCollection, Reward } from "../../../model/player";
import { BuffBase } from "../../../model/player";
import { RewardsGrid } from "../../crewtables/rewards";
import { DEFAULT_MOBILE_WIDTH } from "../../hovering/hoverstat";

export const CollectionTiers = (props: { collection: Collection }) => {

    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { collection } = props;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
    let goal = -1;
    if ("milestone" in collection) {
        let col = collection as PlayerCollection;
        goal = col.milestone.goal === 'n/a' ? -1 : col.milestone.goal;
    }
    return <React.Fragment>
        <Table striped>
            <Table.Header>
                <Table.Row>
                    <Table.HeaderCell>
                        {t('collections.milestone')}
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                        {t('base.rewards')}
                    </Table.HeaderCell>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {collection.milestones?.map((milestone) => {
                    const rewards = (milestone.buffs
                        ?.map((b) => b as BuffBase)
                        .concat(milestone.rewards ?? []) as Reward[])


                    return <React.Fragment>
                        <Table.Row>
                            <Table.Cell>
                            {goal > milestone.goal && <Icon name='check' color='green' size='small' style={{margin: '0.5em'}} />}
                            {milestone.goal}
                            </Table.Cell>
                            <Table.Cell>
                                <RewardsGrid forceCols={isMobile ? 3 : 6} targetGroup="col_overview_items" crewTargetGroup="col_overview_crew" rewards={rewards} />
                            </Table.Cell>
                        </Table.Row>

                    </React.Fragment>

                })}
            </Table.Body>
        </Table>

    </React.Fragment>
}