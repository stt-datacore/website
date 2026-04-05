import React from "react"
import { GlobalContext } from "../../context/globalcontext"
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { Button, Dropdown, DropdownItemProps, Message } from "semantic-ui-react";
import { useStateWithStorage } from "../../utils/storage";
import { AllBosses, bossFromBattleMode, createMetaOptions } from "../../utils/shiputils";
import { Ship } from "../../model/ship";
import { ShipTable } from "./shiptable";
import { WorkerContext } from "../../context/workercontext";


export const BestShipFinder = () => {
    const globalContext = React.useContext(GlobalContext);
    const workerContext = React.useContext(WorkerContext);

    const { cancel, runWorker, running } = workerContext;

    const { t } = globalContext.localized;
    const { battle_metas } = globalContext.core;
    const { playerData, playerShips } = globalContext.player;
    const dbid = playerData?.player.dbid;
    const [battleMode, setBattleMode] = useStateWithStorage<string>(`${dbid}/best_ship/battle_mode`, 'arena', { rememberForever: true });
    const [metas, setMetas] = useStateWithStorage<string[]>(`${dbid}/best_ship/active_metas`, [], { rememberForever: true });

    const [ships, setShips] = React.useState<Ship[]>([]);

    const battleModes = [] as DropdownItemProps[];

    (['pvp', ...AllBosses.map(m => `fbb_${m.id}`)]).forEach((mode) => {
        if (mode === 'skirmish' && !globalContext.player.ephemeral?.events?.length) return;
        let rarity = 0;
        let fbbtext = '';
        if (mode.startsWith('fbb')) {
            let boss = bossFromBattleMode(mode);
            if (boss) {
                rarity = boss.rarity;
                fbbtext = boss.ship_name + ` ${rarity}*`;
            }
            else {
                return;
            }
        }
        battleModes.push({
            key: mode,
            value: mode,
            text: fbbtext || (t(`ship.${mode.startsWith('fbb') ? 'fbb' : mode}`) + (mode.startsWith('fbb') ? ` ${rarity}*` : ''))
        });
    });

    const metaList = React.useMemo(() => {
        const opts = createMetaOptions((meta) => {
            if (battleMode.includes('fbb')) return meta.startsWith('fbb');
            else return !meta.startsWith('fbb');
        });
        if (!metas || typeof metas ==='string') setMetas([]);
        else {
            let newMetas = metas?.filter(m => !!opts.some(opt => opt.value == m));
            if (!metas || newMetas?.length != metas?.length) setMetas(newMetas || []);
        }
        return opts;
    }, [battleMode]);

    if (!playerShips || !playerData) return (<>
        <Message warning>
            <Message.Header>
                {t('header.require.title')}
            </Message.Header>
            <Message.Content>
                {t('header.require.description')}
            </Message.Content>
        </Message>
    </>);

    return (
        <div style={{...OptionsPanelFlexColumn, justifyContent: 'center', alignItems: 'flex-start'}}>
            <Message warning>
                <Message.Header>
                    {t('global.work_in_progress.title')}
                </Message.Header>
                <Message.Content>
                    {t('global.work_in_progress.heading')}
                </Message.Content>
            </Message>
            <div style={{...OptionsPanelFlexRow, gap: '1em'}}>
                <div style={{...OptionsPanelFlexColumn, alignItems: 'flex-start'}}>
                    {t('ship.battle_mode')}
                    <Dropdown
                        selection
                        options={battleModes}
                        value={battleMode}
                        onChange={(e, { value }) => setBattleMode(value as string)}
                        />
                </div>
                <div style={{...OptionsPanelFlexColumn, alignItems: 'flex-start'}}>
                    {t('ship.metas.select_metas')}
                    <Dropdown
                        selection
                        multiple
                        clearable
                        options={metaList}
                        value={metas}
                        onChange={(e, { value }) => setMetas(value as string[])}
                        />
                </div>
            </div>
            <div style={{marginTop: '1em'}}>
                <Button
                    onClick={() => execWorker()}
                    color='green'>
                    {t('ship.best_ship.find_ships')}
                </Button>
            </div>
            {!!running && globalContext.core.spin()}
            <div style={{marginTop: '1em'}}>
                <ShipTable
                    hideTools={!ships.length}
                    pageId='best_ships'
                    mode='owned'
                    customList={ships} />
            </div>
        </div>
    );

    function execWorker() {
        const config = {
            battle_mode: battleMode,
            metas,
            ships: playerShips
        }

        runWorker('ship_finder', config, (data) => onResults(data));
    }

    function onResults(data: any) {

    }
}