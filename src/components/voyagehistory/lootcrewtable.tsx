import React from "react";
import { HistoryContext } from "./context";
import { SearchableTable } from "../searchabletable";
import { GlobalContext } from "../../context/globalcontext";
import { CrewBaseCells, getBaseTableConfig } from "../crewtables/views/base";
import { createReportDayOptions, LootCrew } from "./utils";
import { IRosterCrew } from "../crewtables/model";
import { Dropdown, Form, Table } from "semantic-ui-react";
import { Filter } from "../../model/game-elements";
import { useStateWithStorage } from "../../utils/storage";
import { crewMatchesSearchFilter } from "../../utils/crewsearch";

export const LootCrewTable = () => {

    const globalContext = React.useContext(GlobalContext);
    const { crew } = globalContext.core;
    const { playerData } = globalContext.player;
    const { t } = globalContext.localized;
    const { history } = React.useContext(HistoryContext);

    const dbidPrefix = React.useMemo(() => {
        if (playerData) return `${playerData.player.dbid}/`;
        else return '';
    }, [playerData]);

    const [reportDays, setReportDays] = useStateWithStorage<number | undefined>(`${dbidPrefix}loot_crew_table/report_days`, 30, { rememberForever: true });

    const tableConfig = getBaseTableConfig('allCrew', t);

    tableConfig.push(
        { width: 1, column: 'voyages.length', title: t('base.voyages') }
    );

    const lootCrew = React.useMemo(() => {
        const lootCrew: LootCrew[] = [];
        for (let voy of history.voyages) {
            if (reportDays !== undefined) {
                let dayDiff = (Date.now() - voy.created_at) / (1000 * 60 * 60 * 24);
                if (dayDiff > reportDays) continue;
            }
            for (let lc of voy.lootcrew) {
                let c = crew.find(cc => cc.symbol === lc);
                if (c) {
                    let loot = lootCrew.find(f => f.crew?.symbol === c.symbol);
                    if (!loot) {
                        loot = {
                            crew: c,
                            voyages: [voy]
                        }
                        lootCrew.push(loot);
                    }
                    else {
                        loot.voyages.push(voy);
                    }
                }
            }
        }
        return lootCrew;
    }, [history, reportDays]);

    const reportDayOptions = createReportDayOptions(t);

    return (
        <React.Fragment>
            <Form>
				<Form.Group inline>
					<Form.Field	/* Filter by date */
						placeholder={t('hints.filter_by_date')}
						control={Dropdown}
						selection
						clearable
						options={reportDayOptions}
						value={reportDays}
						onChange={(e, { value }) => setReportDays(value)}
					/>
				</Form.Group>
			</Form>

            <SearchableTable
                data={lootCrew}
                config={tableConfig}
                renderTableRow={renderTableRow}
                filterRow={filterTableRow}
                />
        </React.Fragment>
    )

    function filterTableRow(row: LootCrew, filter: Filter[], filterType?: string) {
        return crewMatchesSearchFilter(row.crew, filter, filterType);
    }

    function renderTableRow(row: LootCrew, idx?: number) {
        return (
            <Table.Row>
                <CrewBaseCells pageId='loot_crew' crew={row.crew as IRosterCrew} tableType="allCrew" />
                <Table.Cell>
                    <p>
                        {row.voyages.length}
                    </p>
                    {row.voyages.map(voy => {
                        const created = new Date(voy.created_at);
                        return (
                        <p>
                            {created.toLocaleDateString()}
                        </p>
                    )})}
                </Table.Cell>
            </Table.Row>
        )
    }
}