import React from "react"
import { GlobalContext } from "../../../context/globalcontext";
import CONFIG from "../../CONFIG";
import { Checkbox, Dropdown, DropdownItemProps } from "semantic-ui-react";
import { OptionsPanelFlexColumn } from "../../stats/utils";


export interface CheapestConfig {
    min_rarity?: number;
    max_rarity?: number;
    fuse?: number;
    skirmish?: boolean;
}

export const DefaultCheapestOpts: CheapestConfig = {
    min_rarity: undefined,
    max_rarity: undefined,
    fuse: undefined,
    skirmish: false
}

export interface CheapestFiltersProps {
    config: CheapestConfig;
    setConfig: (value: CheapestConfig) => void;
}

export const CheapestFilters = (props: CheapestFiltersProps) => {
    const { config, setConfig } = props;
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { crew, items } = globalContext.core;

    const rarityOpts = CONFIG.RARITIES.map((rare, idx) => {
        return {
            key: `crew_max_rarity_${idx+1}`,
            value: idx+1,
            text: rare.name
        } as DropdownItemProps;
    });

    const fuseOpts = ['priority', 'impact', 'threshold'].map((type, idx) => {
        return {
            key: type,
            value: !idx ? undefined : idx,
            text: t(`options.roster_maintenance.${type}`)
        } as DropdownItemProps
    });

    const OptionStyle = {
        display: 'flex',
        alignItems: 'center',
        margin: 0,
        padding: 0,
        gap: '1em'
    } as React.CSSProperties;
    return (
        <div style={OptionStyle}>
            <Dropdown
                placeholder={t('global.min_rarity')}
                selection
                clearable
                options={rarityOpts}
                value={config.min_rarity}
                onChange={(e, { value }) => {
                    setConfig({...config, min_rarity: value as any })
                }}
            />
            <Dropdown
                placeholder={t('global.max_rarity')}
                selection
                clearable
                options={rarityOpts}
                value={config.max_rarity}
                onChange={(e, { value }) => {
                    setConfig({...config, max_rarity: value as any })
                }}
            />
            <Dropdown
                placeholder={t('global.fuses')}
                selection
                clearable
                options={fuseOpts}
                value={config.fuse}
                onChange={(e, { value }) => {
                    setConfig({...config, fuse: value as any })
                }}
            />
            <Checkbox
                label={t('event_type.skirmish')}
                checked={config.skirmish}
                onChange={(e, { checked }) => {
                    setConfig({...config, skirmish: !!checked })
                }}
            />
        </div>
    )
}