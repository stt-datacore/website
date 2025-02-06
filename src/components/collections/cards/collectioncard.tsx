import React from "react";
import { CollectionCombo, CollectionInfo, CollectionFilterOptions } from "../../../model/collectionfilter";
import { GlobalContext } from "../../../context/globalcontext";
import { Progress, Icon, Image } from "semantic-ui-react";

import { BuffBase, PlayerCollection, Reward } from "../../../model/player";
import { CiteInventory, makeCiteNeeds } from "../../../utils/collectionutils";
import { CollectionsContext, formatColString } from "../context";
import { RewardsGrid } from "../../crewtables/rewards";

export interface CollectionCardProps {
    style?: React.CSSProperties;
    collection: CollectionInfo | CollectionCombo;
    brief?: boolean;
    ownedCites?: CiteInventory[];
    mapFilter: CollectionFilterOptions;
    searchFilter: string;
    setMapFilter: (value: CollectionFilterOptions) => void;
    setSearchFilter: (value: string) => void;
}

export const CollectionCard = (props: CollectionCardProps) => {
    const context = React.useContext(GlobalContext);
    const colContext = React.useContext(CollectionsContext);
    const { setModalInstance } = colContext;
    const { t } = context.localized;
    const { style, ownedCites } = props;

    const { collection: col } = props;
    const { collection: playerCol } = col;

    const honorQ = ownedCites?.map(o => {
        if (col.neededStars) {
            if (o.quantity >= col.neededStars[o.rarity]) {
                return col.neededStars[o.rarity] * o.cost;
            }
            else {
                return o.quantity * o.cost;
            }
        }
        return 0;
    }).reduce((p, n) => p + n, 0) ?? 0;

    const neededCost = Math.max((playerCol.neededCost ?? 0) - honorQ, 0);
    const allStars = !col.neededStars?.some(star => !!star);

    if (!playerCol?.totalRewards || !playerCol.milestone) return <></>;

    const rewards =
        playerCol.totalRewards > 0
            ? (playerCol.milestone.buffs
                ?.map((b) => b as BuffBase)
                .concat(playerCol.milestone.rewards ?? []) as Reward[])
            : [];

    const crewneed =
        playerCol?.milestone?.goal === "n/a"
            ? 0
            : playerCol?.milestone?.goal ?? 0;
    const crewhave = playerCol?.owned ?? 0;

    return (
        <>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    margin: "1em",
                    ...style
                }}
            >
                <Image
                    size="medium"
                    src={`${process.env.GATSBY_ASSETS_URL}${playerCol.image?.replace(
                        "/collection_vault/",
                        "collection_vault_"
                    )}.png`}
                    style={{
                        margin: "0.5em 0",
                        border: "1px solid #7f7f7f7f",
                        borderRadius: "6px",
                    }}
                    title={playerCol.name}
                />
                <h2
                    onClick={(e) => {
                        setModalInstance({ collection: playerCol, pageId: 'collections/card' });
                        // setSearchFilter("");
                        // setMapFilter({
                        //     ...(mapFilter ?? {}),
                        //     collectionsFilter: [collection.id],
                        // });
                    }}
                    style={{
                        textDecoration: "underline",
                        marginBottom: 0,
                        textAlign: "center",
                        margin: "0.5em 0",
                        cursor: "pointer",
                    }}
                >
                    {playerCol.name}
                </h2>
                <i>
                    {formatColString(playerCol.description ?? "", {
                        textAlign: "center",
                    })}
                </i>
                <hr style={{ width: "16em" }}></hr>
                <i style={{ fontSize: "0.9em" }}>
                    {t('collections.n_needed_for_rewards', { n: `${playerCol.needed}` })}
                </i>
                <div style={{ margin: "0.5em 0 0.5em 0" }}>
                    <RewardsGrid wrap={true} rewards={rewards} />
                </div>
                {!props.brief && <React.Fragment>
                    <i style={{ fontSize: "0.9em" }}>
                        {t('items.n_owned', { n: `${playerCol.owned} / ${playerCol.crew?.length}` })}
                    </i>
                    <i style={{ fontSize: "0.9em" }}>
                        {t('collections.progress_to_next')}:{" "}
                        {typeof playerCol?.milestone?.goal === "number" &&
                            playerCol?.milestone?.goal > 0
                            ? `${playerCol.progress} / ${playerCol.milestone.goal}`
                            : "MAX"}
                    </i>

                    {crewhave >= crewneed && (!!neededCost || !allStars) && (
                        <div style={{ marginTop: "0.5em" }}>
                            <i style={{ fontSize: "0.9em" }}>
                                {t('collections.citation_cost_to_next')}:
                                <img
                                    src={`${process.env.GATSBY_ASSETS_URL}currency_honor_currency_0.png`}
                                    style={{ width: "16px", verticalAlign: "text-bottom" }}
                                />
                                {neededCost.toLocaleString()}
                            </i>
                            <div style={{ marginTop: "0.5em" }}>
                                <RewardsGrid kind={"need"} needs={makeCiteNeeds(col, undefined, ownedCites)} />
                                {!!neededCost && <Progress
                                    value={(context.player.playerData?.player.honor ?? 0)}
                                    total={neededCost}
                                    label={
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <img
                                                src={`${process.env.GATSBY_ASSETS_URL}currency_honor_currency_0.png`}
                                                style={{
                                                    width: "16px",
                                                    verticalAlign: "text-bottom",
                                                    margin: "0 0.5em",
                                                }}
                                            />
                                            {context.player.playerData?.player.honor.toLocaleString()} /{" "}
                                            {neededCost.toLocaleString()}
                                            {(context.player.playerData?.player.honor ?? 0) >
                                                (neededCost ?? 0) && (
                                                    <Icon
                                                        name="check"
                                                        size="small"
                                                        color="green"
                                                        style={{ margin: "0 0.5em" }}
                                                    />
                                                )}
                                        </div>
                                    }
                                />}
                            </div>
                        </div>
                    )}
                    {crewhave >= crewneed && !neededCost && (
                        <i
                            style={{
                                fontSize: "0.9em",
                                textAlign: "center",
                                color: "lightgreen",
                            }}
                        >
                            {allStars && <>{t('collections.alerts.crew_already_fused')}</>}
                            {!allStars && <>{t('collections.alerts.fuses_covered_by_cites')}</>}

                        </i>
                    )}

                    {crewhave < crewneed && (
                        <i
                            className="ui segment"
                            style={{ color: "salmon", textAlign: "center", margin: "0.5em" }}
                        >
                            {t('collections.alerts.crew_recruit_need_n', { n: `${crewneed - crewhave}` })}
                        </i>
                    )}

                </React.Fragment>}
            </div>
        </>
    );
};
