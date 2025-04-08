import React from "react";
import { HistoryContext } from "./context";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { GlobalContext } from "../../context/globalcontext";
import { CrewBaseCells, getBaseTableConfig } from "../crewtables/views/base";
import { createReportDayOptions, LootCrew } from "./utils";
import { IRosterCrew } from "../crewtables/model";
import { Dropdown, Form, Rating, Table } from "semantic-ui-react";
import { Filter } from "../../model/game-elements";
import { useStateWithStorage } from "../../utils/storage";
import { crewMatchesSearchFilter } from "../../utils/crewsearch";
import { Link } from "gatsby";
import { descriptionLabel } from "../crewtables/commonoptions";
import { CrewHoverStat, CrewTarget } from "../hovering/crewhoverstat";
import { oneCrewCopy } from "../../utils/crewutils";
import { CrewPreparer } from "../item_presenters/crew_preparer";

export const LootCrewTable = () => {

    const globalContext = React.useContext(GlobalContext);
    const { crew } = globalContext.core;
    const { playerData, buffConfig } = globalContext.player;
    const { t, CREW_ARCHETYPES } = globalContext.localized;
    const { history } = React.useContext(HistoryContext);

    const dbidPrefix = React.useMemo(() => {
        if (playerData) return `${playerData.player.dbid}/`;
        else return '';
    }, [playerData]);

    const [reportDays, setReportDays] = useStateWithStorage<number | undefined>(`${dbidPrefix}loot_crew_table/report_days`, 30, { rememberForever: true });

    const tableConfig = [
        { width: 3, column: 'name', title: t('global.name') },
        { width: 1, column: 'max_rarity', title: t('base.rarity'), reverse: true },
        ...getBaseTableConfig('allCrew', t),
        {
            width: 1, column: 'voyages.length', title: t('base.voyages'),
            reverse: true,
            customCompare: (a: IRosterCrew, b: IRosterCrew) => {
                let ar = getLootCrew(a)!;
                let br = getLootCrew(b)!;
                let r = ar.voyages[0].created_at - br.voyages[0].created_at;
                if (!r) r = ar.voyages.length - br.voyages.length;
                if (!r) r = ar.crew.name.localeCompare(br.crew.name);
                return r;
            }
        }
    ] as ITableConfigRow[];

    const [lootCrew, tableCrew] = React.useMemo(() => {
        const lootCrew: LootCrew[] = [];
        const tableCrew = [] as IRosterCrew[];
        for (let voy of history.voyages) {
            if (reportDays !== undefined) {
                let dayDiff = (Date.now() - voy.created_at) / (1000 * 60 * 60 * 24);
                if (dayDiff > reportDays) continue;
            }
            for (let lc of voy.lootcrew) {
                let c = crew.find(cc => cc.symbol === lc);
                if (c) {
                    if (!tableCrew.includes(c as IRosterCrew)) tableCrew.push(c as IRosterCrew);
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
        lootCrew.forEach((lc) => {
            lc.voyages.sort((a, b) => {
                return a.created_at - b.created_at;
            });
        });
        return [lootCrew, tableCrew];
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
                data={tableCrew}
                config={tableConfig}
                renderTableRow={renderTableRow}
                filterRow={filterTableRow}
                />
            <CrewHoverStat targetGroup={dbidPrefix + 'targetClass'} />
        </React.Fragment>
    )

    function filterTableRow(row: LootCrew, filter: Filter[], filterType?: string) {
        return crewMatchesSearchFilter(row.crew, filter, filterType);
    }

    function renderTableRow(crew_in: IRosterCrew, idx?: number) {
        const crew = (() => {
            let lc = crew_in;
            let pc = playerData?.player.character.crew.filter(f => f.symbol === lc.symbol) ?? playerData?.player.character.unOwnedCrew?.filter(f => f.symbol === lc.symbol);
            if (pc?.length) {
                pc.sort((a, b) => b.rarity - a.rarity || b.level - a.level || b.equipment.length - a.equipment.length);
                lc = pc[0];
            }
            lc = CrewPreparer.prepareCrewMember(lc, buffConfig ? 'player' : 'max', 'shown_full', globalContext, false)[0] as IRosterCrew;
            return lc;
        })();

        const row = getLootCrew(crew)!;

        return (
            <Table.Row>
                <Table.Cell className='sticky'>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}
					>
						<div style={{ gridArea: 'icon' }}>
							<CrewTarget inputItem={crew} targetGroup={dbidPrefix + 'targetClass'}>
								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{CREW_ARCHETYPES[crew.symbol]?.name ?? crew.name}</Link></span>
						</div>
						<div style={{ gridArea: 'description' }}>{descriptionLabel(t, crew, true)}</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
                <CrewBaseCells pageId='loot_crew' crew={crew as IRosterCrew} tableType="allCrew" />
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

    function getLootCrew(crew: IRosterCrew) {
        return lootCrew.find(f => f.crew.symbol === crew.symbol);
    }

}