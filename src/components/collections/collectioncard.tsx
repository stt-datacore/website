import React from "react";
import { CollectionGroup, CollectionMap, MapFilterOptions } from "../../model/collectionfilter";
import { GlobalContext } from "../../context/globalcontext";
import { Progress, Icon, Image } from "semantic-ui-react";

import { BuffBase, PlayerCollection, Reward } from "../../model/player";
import { CiteInventory, makeCiteNeeds } from "../../utils/collectionutils";
import { formatColString } from "./overview";
import { RewardsGrid } from "../crewtables/rewards";

export interface CollectionCardProps {
    style?: React.CSSProperties;
    collection: CollectionMap | CollectionGroup;
    brief?: boolean;
    ownedCites?: CiteInventory[];
    mapFilter: MapFilterOptions;
    searchFilter: string;
    setMapFilter: (value: MapFilterOptions) => void;
    setSearchFilter: (value: string) => void;
}

export const CollectionCard = (props: CollectionCardProps) => {
    const context = React.useContext(GlobalContext);
    const { style, ownedCites } = props;

    const {
        collection: col,
        mapFilter,
        searchFilter,
        setMapFilter,
        setSearchFilter,
    } = props;
    
    const { collection } = col;

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

    const neededCost = Math.max((collection.neededCost ?? 0) - honorQ, 0);
    const allStars = !col.neededStars;

    if (!collection?.totalRewards || !collection.milestone) return <></>;
    const rewards =
        collection.totalRewards > 0
            ? (collection.milestone.buffs
                ?.map((b) => b as BuffBase)
                .concat(collection.milestone.rewards ?? []) as Reward[])
            : [];

    const crewneed =
        collection?.milestone?.goal === "n/a"
            ? 0
            : collection?.milestone?.goal ?? 0;
    const crewhave = collection?.owned ?? 0;

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
                    ... style
                }}
            >
                <Image
                    size="medium"
                    src={`${process.env.GATSBY_ASSETS_URL}${collection.image?.replace(
                        "/collection_vault/",
                        "collection_vault_"
                    )}.png`}
                    style={{
                        margin: "0.5em 0",
                        border: "1px solid #7f7f7f7f",
                        borderRadius: "6px",
                    }}
                    title={collection.name}
                />
                <h2
                    onClick={(e) => {
                        setSearchFilter("");
                        setMapFilter({
                            ...(mapFilter ?? {}),
                            collectionsFilter: [collection.id],
                        });
                    }}
                    style={{
                        textDecoration: "underline",
                        marginBottom: 0,
                        textAlign: "center",
                        margin: "0.5em 0",
                        cursor: "pointer",
                    }}
                >
                    {collection.name}
                </h2>
                <i>
                    {formatColString(collection.description ?? "", {
                        textAlign: "center",
                    })}
                </i>
                <hr style={{ width: "16em" }}></hr>
                <i style={{ fontSize: "0.9em" }}>
                    {collection.needed} needed for rewards:
                </i>
                <div style={{ margin: "0.5em 0 0.5em 0" }}>
                    <RewardsGrid wrap={true} rewards={rewards} />
                </div>
                {!props.brief && <React.Fragment>
                    <i style={{ fontSize: "0.9em" }}>
                    {collection.owned} / {collection.crew?.length} Owned
                </i>
                <i style={{ fontSize: "0.9em" }}>
                    Progress to next:{" "}
                    {typeof collection?.milestone?.goal === "number" &&
                        collection?.milestone?.goal > 0
                        ? `${collection.progress} / ${collection.milestone.goal}`
                        : "MAX"}
                </i>

                {crewhave >= crewneed && (!!neededCost || !allStars) && (
                    <div style={{ marginTop: "0.5em" }}>
                        <i style={{ fontSize: "0.9em" }}>
                            Citation cost to next:
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
                        {allStars && <>All crew required to reach the next milestone are already fully fused.</>}
                        {!allStars && <>All remaining required fuses are covered by honorable citations you already own.</>}
                        
                    </i>
                )}

                {crewhave < crewneed && (
                    <i
                        className="ui segment"
                        style={{ color: "salmon", textAlign: "center", margin: "0.5em" }}
                    >
                        You need to recruit {crewneed - crewhave} more crew to reach the
                        next goal.
                    </i>
                )}
                
                </React.Fragment>}
            </div>
        </>
    );
};
