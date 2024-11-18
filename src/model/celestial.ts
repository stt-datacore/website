
export interface CelestialMarketListing {
    sold_last_day: number;
    buy_count: number;
    sell_count: number;
    high: number;
    low: number;
    wishlisted?: boolean;
    last_price: number;
    count_at_low: number;
}

export type MarketAggregation =  { [key: string]: CelestialMarketListing };

export interface CelestialMarketRoot {
    aggregation: MarketAggregation;
}

export interface CelestialMarket {
    action: "ephemeral",
    root: CelestialMarketRoot;
}

