import React from "react";
import { EquipmentCommon, EquipmentItem } from "../../model/equipment";
import CONFIG from "../CONFIG";
import { Button, Checkbox, Dropdown, DropdownItemProps, Item, Rating } from "semantic-ui-react";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import { GlobalContext } from "../../context/globalcontext";
import { useStateWithStorage } from "../../utils/storage";
import { PlayerCrew, PlayerEquipmentItem } from "../../model/player";
import { CrewMember } from "../../model/crew";
import { DataPicker } from "../dataset_presenters/datapicker";
import { IDataPickerState, IEssentialData } from "../dataset_presenters/model";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewItemsView } from "../item_presenters/crew_items";
import { CrewPresenter } from "../item_presenters/crew_presenter";
import { applyCrewBuffs, oneCrewCopy, qbitsToSlots } from "../../utils/crewutils";
import { getItemWithBonus } from "../../utils/itemutils";
import { calcItemDemands, canBuildItem } from "../../utils/equipment";


type CrewType = 'all' | 'quippable' | 'owned' | 'frozen' | 'quipped';
type OwnedOption = 'all' | 'owned' | 'buildable' | 'both';

export interface IQuipmentFilterContext {
    available: boolean,
    ownedItems: boolean,
    selectedCrew?: string;
    ignoreLimit: boolean;
    ownedOption: OwnedOption;
    selectedItems?: number[];
    traitOptions?: string[];
    skillOptions?: string[];
    rarityOptions?: number[];
    setIgnoreLimit: (value: boolean) => void;
    setSelectedCrew: (value?: string) => void;
    setSelectedItems: (value?: number[]) => void;
    setOwnedOption: (value: OwnedOption) => void;
    setTraitOptions: (value?: string[]) => void;
    setSkillOptions: (value?: string[]) => void;
    setRarityOptions: (value?: number[]) => void;
    filterItems: (items: EquipmentItem[]) => (EquipmentItem | EquipmentCommon | PlayerEquipmentItem)[];
}

const DefaultContextData: IQuipmentFilterContext = {
    ignoreLimit: false,
    available: false,
    ownedItems: false,
    selectedCrew: undefined,
    selectedItems: undefined,
    ownedOption: 'all',
    traitOptions: undefined,
    skillOptions: undefined,
    rarityOptions: undefined,
    setIgnoreLimit: () => false,
    setSelectedCrew: () => false,
    setSelectedItems: () => false,
    filterItems: () => [],
    setTraitOptions: () => false,
    setSkillOptions: () => false,
    setOwnedOption: () => false,
    setRarityOptions: () => false
}

export const QuipmentFilterContext = React.createContext(DefaultContextData);

export interface QuipmentFilterProps {
    pageId: string;
    ownedItems: boolean;
    initCrew?: CrewMember;
    children: JSX.Element;
    noRender?: boolean;
}

export const QuipmentFilterProvider = (props: QuipmentFilterProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { children, pageId, ownedItems, noRender, initCrew } = props;
    const { playerData } = globalContext.player;

    const [selectedCrew, setSelectedCrew] = useStateWithStorage<string | undefined>(`${pageId}/quipment_crew_selection`, initCrew?.symbol);
    const [selectedItems, setSelectedItems] = useStateWithStorage<number[] | undefined>(`${pageId}/quipment_selection`, undefined);
    const [ignoreLimit, setIgnoreLimit] = useStateWithStorage<boolean>(`${pageId}/quipment_crew_ignore_qbits`, false);
    const [selectorOpen, setSelectorOpen] = React.useState(false);
    const [crewType, setCrewType] = useStateWithStorage(`${pageId}/quipment_crew_types`, 'quippable' as CrewType | undefined);
    const [ownedOption, setOwnedOption] = useStateWithStorage(`${pageId}/quipment_owned_option`, 'all' as OwnedOption);
    const [traitOptions, setTraitOptions] = useStateWithStorage(`${pageId}/quipment_trait_options`, undefined as string[] | undefined);
    const [skillOptions, setSkillOptions] = useStateWithStorage(`${pageId}/quipment_skill_options`, undefined as string[] | undefined);
    const [rarityOptions, setRarityOptions] = useStateWithStorage<number[] | undefined>(`${pageId}/quipment_rarity_options`, undefined);

    const pool = React.useMemo(() => {
        return globalContext.core.items.filter(item => item.type === 14) as EquipmentItem[];
    }, [globalContext.core.items]);

    const contextData: IQuipmentFilterContext = {
        available: true,
        ownedItems,
        filterItems,
        selectedCrew,
        setSelectedCrew,
        selectedItems,
        setSelectedItems,
        ignoreLimit,
        setIgnoreLimit,
        ownedOption,
        setOwnedOption,
        traitOptions,
        setTraitOptions,
        skillOptions,
        setSkillOptions,
        rarityOptions,
        setRarityOptions
    }

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    const crewChoices = React.useMemo(() => {
        let work = [] as CrewMember[];
        if (playerData) {
            work = playerData.player.character.crew.filter(f => {
                if (crewType === 'quippable') return (f.immortal === -1 && f.q_bits >= 100);
                else if (crewType === 'frozen') return (f.immortal && f.immortal > 0);
                else if (crewType === 'quipped') return (f.immortal === -1 && f.q_bits >= 100) && (f.kwipment?.some(k => typeof k === 'number' ? !!k : !!k[1]));
                else if (crewType === 'owned') return !!f.immortal;
                return true;
            });
            if (crewType === 'all') {
                work = work.concat(playerData.player.character.unOwnedCrew ?? []);
            }
        }
        else {
            work = globalContext.core.crew;
        }
        let result = work.map((crew) => ({ ...crew, id: crew.archetype_id, kwipment: [...crew?.kwipment ?? []] }));
        result.sort((a, b) => b.q_bits - a.q_bits)
        return result;
    }, [playerData, ownedItems, crewType]);

    const crewItem = React.useMemo(() => {
        if (selectedCrew && crewChoices?.length) {
            let selection = crewChoices.find(f => f.symbol === selectedCrew) as CrewMember | undefined;
            if (selection) {
                let kwips = selection.kwipment.map(kw => typeof kw === 'number' ? kw : kw[1] as number);
                if (kwips.some(k => !!k)) {
                    setSelectedItems(kwips);
                }
                else {
                    setSelectedItems(undefined);
                }
            }
            return selection;
        }
        return undefined;
    }, [crewChoices, selectedCrew]);

    const crew = React.useMemo(() => {
        if (crewItem) {
            return quipCrew(crewItem, true);
        }
    }, [crewItem, selectedItems, ignoreLimit]);

    const crewTypes = React.useMemo(() => {
        const crewTypes = [
            {
                key: "all",
                value: "all",
                text: t("options.roster_maintenance.none"),
            },
        ];
        if (!!playerData) {
            crewTypes.push({
                key: "quippable",
                value: "quippable",
                text: t("options.roster_maintenance.quippable"),
            });
            crewTypes.push({
                key: "owned",
                value: "owned",
                text: t("crew_ownership.immortal"),
            });
            crewTypes.push({
                key: "frozen",
                value: "frozen",
                text: t("options.crew_status.frozen"),
            });
            if (crewType === 'all' || !crewType) setCrewType('quippable');
        }
        else if (!playerData && (crewType !== 'all' || !crewType)) setCrewType('all');

        return crewTypes;
    }, [playerData]);

    const ownedOpts = [
        {
            key: "all",
            value: "all",
            text: t("items.options.all_quipment"),
        },
        {
            key: "owned",
            value: "owned",
            text: t("items.options.only_owned"),
        },
        {
            key: "buildable",
            value: "buildable",
            text: t("items.options.only_buildable"),
        },
        {
            key: "both",
            value: "both",
            text: t("items.options.owned_or_buildable"),
        },
    ] as DropdownItemProps[];

    const traitFilterOpts = React.useMemo(() => {
        let traitFilterOpts = [] as DropdownItemProps[];

        traitFilterOpts.push({
            key: "any",
            value: "any",
            text: t("items.any_trait_limited"),
        });

        traitFilterOpts.push({
            key: "none",
            value: "none",
            text: t("items.any_non_trait_limited"),
        });

        const trmap = {} as { [key: string]: { symbol: string, count: number, name: string } }
        for (let item of pool) {
            if (item.traits_requirement?.length) {
                for (let trait of item.traits_requirement) {
                    trmap[trait] ??= {
                        symbol: trait,
                        name: globalContext.localized.TRAIT_NAMES[trait],
                        count: 0
                    }
                    trmap[trait].count++;
                }
            }
        }
        Object.values(trmap)
            .sort((a, b) => a?.name?.localeCompare(b?.name || ''))
            .forEach((info) => {
                traitFilterOpts.push({
                    key: `trait_${info.symbol}`,
                    value: info.symbol,
                    text: `${info.name}`,
                    content: <div style={{...flexRow, justifyContent: 'space-between'}}>
                        <span>{info.name}</span>
                        <b>({info.count})</b>
                    </div>
                })
            });
        return traitFilterOpts;
    }, [pool]);

    const itemRarityOpts = React.useMemo(() => {
        let rarities = [...new Set(pool.map(m => m.rarity)) ].sort();
        let opts = [] as DropdownItemProps[];
        for (let rarity of rarities) {
            opts.push({
                key: `rarity_${rarity}`,
                value: rarity,
                text: CONFIG.RARITIES[rarity].name
            })
        }
        return opts;
    }, [pool]);

    const skillmap = Object.entries(CONFIG.SKILLS).map(([skill, name]) => {
        return {
            key: skill,
            value: skill,
            text: name,
        };
    });

    return <React.Fragment>
        {!noRender && <div className={'ui segment'} style={{ ...flexCol, alignItems: 'flex-start' }}>
            {!!playerData && <div style={{ ...flexRow, alignItems: 'flex-start', gap: '1em' }}>
                <div style={{...flexCol, alignItems: 'flex-start'}}>
                    <span>{t("hints.filter_by_owned_status")}</span>
                    <Dropdown
                        placeholder={t("hints.filter_by_owned_status")}
                        selection
                        options={ownedOpts}
                        value={ownedOption}
                        onChange={(e, { value }) =>
                            setOwnedOption(value as OwnedOption || 'all')
                        }
                    />
                </div>
                <div style={{...flexCol, alignItems: 'flex-start'}}>
                    <span>{t("hints.filter_by_rarity")}</span>
                    <Dropdown
                        placeholder={t("hints.filter_by_rarity")}
                        multiple
                        clearable
                        selection
                        scrolling
                        options={itemRarityOpts}
                        value={rarityOptions}
                        onChange={(e, { value }) =>
                            setRarityOptions(value as number[] | undefined)
                        }
                    />
                </div>
                <div style={{...flexCol, alignItems: 'flex-start'}}>
                    <span>{t("hints.filter_by_trait")}</span>
                    <Dropdown
                        placeholder={t("hints.filter_by_trait")}
                        multiple
                        clearable
                        selection
                        scrolling
                        options={traitFilterOpts}
                        value={traitOptions || []}
                        onChange={(e, { value }) =>
                            setTraitOptions(value as string[] | undefined)
                        }
                    />
                </div>
                <div style={{...flexCol, alignItems: 'flex-start'}}>
                    <span>{t("hints.filter_by_skill")}</span>
                    <Dropdown
                        placeholder={t("hints.filter_by_skill")}
                        multiple
                        selection
                        clearable
                        scrolling
                        options={skillmap}
                        value={skillOptions || []}
                        onChange={(e, { value }) =>
                            setSkillOptions(value as string[] | undefined)
                        }
                    />
                </div>
            </div>}
            <div style={{ ...flexRow }}>
                {selectorOpen && <DataPicker
                    id={`${pageId}/quipment_crew_picker`}
                    data={crewChoices}
                    search
                    closeOnChange
                    closePicker={selectCrew}
                    selection
                    renderOptions={!!playerData ? renderCrewPickerOptions : undefined}
                    gridSetup={{
                        renderGridColumn: (datum, isSelected) => renderItem(datum, isSelected),
                        defaultSort: {
                            id: 'kwipment',
                            customSort: (a: any, b: any) => {
                                let r = qbitsToSlots(b.q_bits) - qbitsToSlots(a.q_bits);
                                if (!r) r = b.ranks.scores.quipment - a.ranks.scores.quipment;
                                return r;
                            }
                        }
                    }}
                />}
                <div style={{ ...flexRow, minHeight: '48px' }}>
                    {<Button onClick={() => setSelectorOpen(true)}>{t('prospect_picker.select_crew')}</Button>}
                </div>
                {!!crew &&
                    <div style={{ ...flexRow }}>
                        <AvatarView
                            mode='crew'
                            item={crew}
                            size={48}
                        />
                        <span>{crew.name}</span>
                        <Button icon={'close'} onClick={() => setSelectedCrew(undefined)}></Button>
                    </div>
                }
            </div>
        </div>}
        {!!crew && (
            <div
                className="ui segment"
                style={{
                    backgroundColor: "#333",
                    display: "flex",
                    justifyContent: "stretch",
                    alignItems: "center",
                    gap: "1em",
                    flexDirection: "column",
                }}
            >
                <CrewPresenter
                    selfRender
                    quipmentMode
                    hideStats
                    compact
                    plugins={[]}
                    crew={crew}
                    hover={false}
                    storeName="items_quip"
                />
                <CrewItemsView
                    itemSize={48}
                    crew={crew}
                    quipment
                    alwaysShowProgress
                />
                <Checkbox
                    disabled={!!crewItem?.q_bits && crewItem.q_bits >= 1300}
                    label={t('crew_views.max_quipment')}
                    checked={!!ignoreLimit && !(!!crewItem?.q_bits && crewItem.q_bits >= 1300)}
                    onChange={(e, { checked }) =>
                        setIgnoreLimit(!!checked)
                    }
                />
            </div>)}
        <QuipmentFilterContext.Provider value={contextData}>
            {children}
        </QuipmentFilterContext.Provider>
    </React.Fragment>

    function selectCrew(selection: Set<number>, ok: boolean) {
        if (ok) {
            let sel = [...selection];
            if (sel.length && sel[0]) {
                setSelectedCrew(crewChoices.find(f => f.id === sel[0])?.symbol)
            }
            else {
                setSelectedCrew(undefined);
            }
        }
        setSelectorOpen(false);
    }

    function quipCrew(crew: CrewMember | PlayerCrew, clearExpires: boolean) {
        crew = oneCrewCopy(crew);
        let kwipment = selectedItems?.map(sel => pool.find(f => Number(f.id) === sel)).filter(f => !!f) ?? [undefined, undefined, undefined, undefined];
        crew.kwipment = selectedItems?.map(m => Number(m) || 0) ?? [0, 0, 0, 0];
        let itemsWithBuffs = kwipment.map(k => k ? getItemWithBonus(k) : undefined);
        if (clearExpires) crew.kwipment_expiration = [0, 0, 0, 0];
        applyCrewBuffs(crew, globalContext.player.buffConfig ?? globalContext.maxBuffs!, false, itemsWithBuffs.filter(f => !!f).map(ib => ib.bonusInfo));
        if (ignoreLimit || ("immortal" in crew && crew.immortal > 0) || ("immortal" in crew && crew.immortal < -1)) crew.q_bits = 1300;
        return crew;
    }

    function renderItem(item: IEssentialData, isSelected: boolean) {
        let crew = item as CrewMember | PlayerCrew;
        return <div className={'ui segment'} style={{ ...flexCol, height: '100%', gap: '0.5em', backgroundColor: isSelected ? 'royalblue' : undefined }}>
            <img src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
                style={{ height: '64px' }}
            />
            <span>{crew.name}</span>
            <Rating icon={'star'} maxRating={crew.max_rarity} rating={"rarity" in crew ? crew.rarity : crew.max_rarity} />
            <CrewItemsView crew={crew} quipment={true} />
        </div>
    }

    function renderCrewPickerOptions(state: IDataPickerState) {
        return <div style={{ ...flexRow, alignItems: 'flex-start' }}>
            <Dropdown
                options={crewTypes}
                selection
                value={crewType}
                onChange={(e, { value }) => setCrewType(value as CrewType)}
            />
        </div>
    }

    function filterItems(data: EquipmentItem[]) {
        return data.filter((f) => {
            if (ownedOption !== "all" && f.type === 14 && playerData) {
                let g = f as EquipmentItem;
                if (!g.demands?.some((d) => d.have)) {
                    g.demands = calcItemDemands(g, globalContext.core.items, playerData.player.character.items);
                }
                if (ownedOption === "both") {
                    if (!canBuildItem(g, true) && !playerData.player.character.items.some((item) =>
                        item.archetype_id?.toString() === (f as any).kwipment_id?.toString())) {
                        return false;
                    }
                }
                else if (ownedOption === "buildable") {
                    if (!canBuildItem(g, true)) return false;
                }
                else if (ownedOption === "owned") {
                    if (!playerData.player.character.items.some((item) =>
                        item.archetype_id?.toString() === (f as any).kwipment_id?.toString())) {
                        return false;
                    }
                }
            }
            if (traitOptions?.length) {
                let any = false;
                let none = false;
                let filter = [...traitOptions];
                if (filter.includes('any')) {
                    filter = filter.filter(f => f !== 'any');
                    any = true;
                }
                if (filter.includes('none')) {
                    filter = filter.filter(f => f !== 'none');
                    none = true;
                }
                if (any && !f.traits_requirement?.length) return false;
                if (none && f.traits_requirement?.length) return false;
                if (filter.length && !f.traits_requirement?.length) return false;
                if (filter.length && f.traits_requirement?.length && !f.traits_requirement.some(trait => filter.includes(trait))) return false;
            }
            if (skillOptions?.length) {
                let buffInfo = getItemWithBonus(f);
                if (buffInfo?.bonusInfo?.bonuses) {
                    let skills = Object.keys(buffInfo.bonusInfo.bonuses);
                    if (!skillOptions.every(skill => skills.includes(skill))) return false;
                }
            }
            if (rarityOptions?.length) {
                if (!rarityOptions.includes(f.rarity)) return false;
            }
            return true;
        });
    }
}