import React from "react";
import { Gauntlet } from "../../model/gauntlets"
import { Button, Dropdown, DropdownItemProps, Icon, Input, Pagination, Table } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { GauntletContext } from "./dataprovider";
import { PlayerBuffMode, PlayerCrew, PlayerImmortalMode } from "../../model/player";
import { arrayIntersect } from "../../utils/misc";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { CrewPresenter } from "../item_presenters/crew_presenter";
import { GauntletSkill } from "../item_presenters/gauntletskill";
import { ShipSkill } from "../item_presenters/shipskill";

export interface GauntletTileViewProps {
    gauntlet: Gauntlet;
    viewMode: 'big' | 'small';
    textFilter: string;
    setTextFilter: (value: string) => void;

}

export const GauntletTileView = (props: GauntletTileViewProps) => {
    const globalContext = React.useContext(GlobalContext);
    const gauntletContext = React.useContext(GauntletContext);

    const { gauntlets, pane, config, setConfig } = gauntletContext;
    const { t } = globalContext.localized;
    const { gauntlet, viewMode, textFilter, setTextFilter } = props;

    const [crew, setCrew] = React.useState<PlayerCrew[] | undefined>(undefined);
    const [activePageCrew, setActivePageCrew] = React.useState<PlayerCrew[] | undefined>(undefined);

    const [totalPages, setTotalPages] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(10);
    const [activePage, setActivePage] = React.useState(1);
    const [elevated, setElevated] = React.useState({} as { [key: string]: number });

    const pageStartIdx = (activePage - 1) * itemsPerPage;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    React.useEffect(() => {
        if (gauntlets?.length && gauntlet.allCrew) {
            const data = gauntlet.allCrew;
            const elev = { ...elevated };

            let uniques = [... new Set(gauntlets.map(g => g.contest_data?.traits?.sort() ?? []).map(f => f.sort().join("_")))].map(after => after.split("_"));

            for (let c of data) {
                let elcrit = uniques.map(f => arrayIntersect(f, c.traits)?.length).filter(f => f > 1)?.length ?? 0;
                if (elcrit) {
                    elev[c.symbol] = elcrit;
                }

                if (elcrit) {
                    elev[c.symbol] = elcrit;
                }
            }
            setElevated(elev);
        }
        setCrew(gauntlet.searchCrew as PlayerCrew[] ?? gauntlet.allCrew)
    }, [gauntlet]);

    React.useEffect(() => {
        if (!crew) return;
        const pages = Math.ceil(crew.length / itemsPerPage);
        if (totalPages !== pages) {
            setTotalPages(pages);
            if (activePage > pages) {
                setActivePage(pages);
                return;
            }
            else if (activePage < 1 && pages) {
                setActivePage(1);
                return;
            }
        }
        setActivePageCrew(crew.slice(pageStartIdx, pageStartIdx + itemsPerPage));
    }, [crew, itemsPerPage, activePage, totalPages]);

    const pageSizes = [1, 5, 10, 20, 50, 100].map(size => {
        return {
            key: `pageSize_${size}`,
            value: size,
            text: `${size}`
        } as DropdownItemProps;
    });

    return <div style={{ overflowX: "auto" }}>
        <Input
            style={{ width: isMobile ? '100%' : '50%' }}
            iconPosition="left"
            placeholder={t('global.search_ellipses')}
            value={textFilter}
            onChange={(e, { value }) => setTextFilter(value)}>
            <input />
            <Icon name='search' />
            <Button icon onClick={() => setTextFilter('')} >
                <Icon name='delete' />
            </Button>
        </Input>

        <Table>
            <Table.Header>
                <Table.HeaderCell>
                    <Pagination
                        totalPages={totalPages}
                        activePage={activePage}
                        onPageChange={(e, data) => setActivePage(data.activePage as number)}
                    />

                    <span style={{ paddingLeft: '2em' }}>
                        {t('global.rows_per_page')}:{' '}
                        <Dropdown
                            options={pageSizes}
                            value={itemsPerPage}
                            inline
                            onChange={(e, { value }) => setItemsPerPage(value as number)}
                        />
                    </span>

                </Table.HeaderCell>
            </Table.Header>
        </Table>

        {viewMode === 'big' && <div style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            overflowX: "auto"
        }}>
            {activePageCrew?.map((crew) => (
                <div key={crew.symbol} className="ui segment" style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-evenly",
                    width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : "100%"
                }}>
                    <CrewPresenter
                        width={window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : "100%"}
                        imageWidth="50%"
                        plugins={[GauntletSkill, ShipSkill]}
                        pluginData={[pane === 'browse' && gauntlet?.state === 'POWER' ? globalContext.core.gauntlets : gauntlet, undefined]}
                        selfRender={true}
                        selfPrepare={true}
                        onBuffToggle={onBuffToggle}
                        onImmoToggle={(state) => onImmoToggle(crew as PlayerCrew, state)}
                        storeName='gauntlets'
                        hover={window.innerWidth < DEFAULT_MOBILE_WIDTH ? true : false}
                        crew={crew} />
                </div>
            ))}
        </div>}

        {viewMode === 'small' &&
            <div style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                overflowX: "auto"
            }}>
                {activePageCrew?.map((crew) => (
                    <div key={crew.symbol} className="ui segment" style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-evenly",
                        flexWrap: "wrap",
                        width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? '100%' : "50%",
                        margin: "0"
                    }}>
                        <CrewPresenter
                            hideStats
                            compact
                            proficiencies
                            plugins={[GauntletSkill]}
                            pluginData={[pane === 'browse' && gauntlet.state === 'POWER' ? globalContext.core.gauntlets : gauntlet, undefined]}
                            selfRender={true}
                            selfPrepare={true}
                            onBuffToggle={onBuffToggle}
                            onImmoToggle={(state) => onImmoToggle(crew as PlayerCrew, state)}
                            storeName='gauntlets'
                            hover={false}
                            crew={crew} />
                    </div>
                ))}
            </div>}

        <Table>
            <Table.Header>
                <Table.HeaderCell>
                    <Pagination
                        totalPages={totalPages}
                        activePage={activePage}
                        onPageChange={(e, data) => setActivePage(data.activePage as number)}
                    />

                    <span style={{ paddingLeft: '2em' }}>
                        {t('global.rows_per_page')}:{' '}
                        <Dropdown
                            options={pageSizes}
                            value={itemsPerPage}
                            inline
                            onChange={(e, { value }) => setItemsPerPage(value as number)}
                        />
                    </span>

                </Table.HeaderCell>
            </Table.Header>
        </Table>

    </div>

    function onBuffToggle(state: PlayerBuffMode) {
        setConfig({
            ...config,
            buffMode: state
        });
    }

    function onImmoToggle(crew: PlayerCrew, state: PlayerImmortalMode) {
        const newImmo = config.immortalModes ?? {};
        newImmo[crew.id] = state;
        setConfig({
            ...config,
            immortalModes: newImmo
        })
    }

}