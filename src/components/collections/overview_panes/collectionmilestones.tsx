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

    const ms = {} as any;

    if ("milestone" in collection) {
        ms['milestone'] = true;
        let neededNext = 0;
        let goal = -1;
        let col = collection as PlayerCollection;
        goal = col.milestone.goal === 'n/a' ? -1 : col.milestone.goal;
        if (goal > 0 && col.needed) {
            neededNext = col.needed;
            ms[col.claimable_milestone_index!] = neededNext;
        }
        let miorg = -1;
        collection.milestones?.forEach((mi, idx) => {
            if (mi.goal > goal && idx > 0) {
                if (miorg == -1) miorg = idx - 1;
                ms[idx] = (mi.goal - collection.milestones![miorg].goal) + neededNext;
            }
        });
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
                {collection.milestones?.map((milestone, idx) => {
                    const rewards = (milestone.buffs
                        ?.map((b) => b as BuffBase)
                        .concat(milestone.rewards ?? []) as Reward[])

                    return <React.Fragment key={`col_milestone_${idx}_${collection.name}`}>
                        <Table.Row>
                            <Table.Cell>
                            {ms['milestone'] && !ms[idx] && <Icon name='check' color='green' size='small' style={{margin: '0.5em'}} />}
                            {milestone.goal}
                            {!!ms[idx] && <div style={{margin: '1em 0', fontStyle: 'italic'}}>&nbsp;({t('collections.n_needed_for_rewards', { n: `${ms[idx]}`})})</div>}
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