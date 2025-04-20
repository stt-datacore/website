import { CrewMember } from "../model/crew";
import { DropInfo, Offer, OfferCrew } from "../model/offers";

async function loadOffers(): Promise<Offer[] | undefined> {

    let result = await fetch(`${process.env.GATSBY_DATACORE_URL}api/offer_info`);
    if (result.ok) {
        return (await result.json()) as Offer[];
    }

    return undefined;
}

export async function loadOfferCrew(crewList: CrewMember[], offerName?: string, offers?: Offer[]): Promise<OfferCrew[] | undefined> {
    offers ??= await loadOffers();
    if (!offers) return undefined;

    let result = [] as OfferCrew[];

    if (offerName) {
        offers = offers?.filter(f => f.primary_content[0].title.toUpperCase().includes(offerName.toUpperCase()));
    }

    offers?.forEach((offer) => {
        if (!offer.primary_content[0].info_text) return;
        let crew = offer.primary_content[0].offer.obtain.map(m => m.spec).filter(f => f.endsWith("_crew")).map(m => crewList.find(fcm => fcm.symbol === m)).filter(fc => !!fc);
        if (!crew?.length) {
            let split = offer.primary_content[0].info_text.split(/\<[#A-Fa-f0-9]+\>/).map(sp => sp.replace(/\<\/[#A-Za-z0-9]+\>.*/, '').replace(/\n.*/g, '').trim());
            crew = crewList.filter(f => split.includes(f.name) || (f.name_english && split.includes(f.name_english)));
        }
        result.push({
            name: offer.primary_content[0].title,
            crew,
            drop_info: getDropInfo(offer),
            seconds_remain: offer.primary_content[0].offer.seconds_remain
        });
    });

    result = result.filter(f => f.crew.length);
    return result;
}

function getDropInfo(offer: Offer): DropInfo[] {
    if (!offer.primary_content?.length || !offer.primary_content[0].info_text) return [];
    const BundleTable = [
        { name: 'offer_t60', cost: 99.99 },
        { name: 'offer_t50', cost: 49.99 },
        { name: 'offer_t25', cost: 24.99 },
        { name: 'offer_t10', cost: 9.99 },
        { name: 'offer_t5', cost: 4.99 },
    ];

    let result = [{
        count: offer.primary_content[0].count,
        cost: offer.primary_content[0].cost?.amount ?? 0,
        currency: offer.primary_content[0].cost?.currency ?? ''
    }] as DropInfo[];

    if (result[0].cost === 0 && !!offer.primary_content[0].offer.currency_bundle) {
        let bt = BundleTable.find(f => f.name === offer.primary_content[0].offer.currency_bundle);
        if (bt) {
            result[0].cost = bt.cost;
            result[0].currency = 'fiat';
        }
    }
    let droptexts = [offer.primary_content[0].info_text!];

    if (offer.secondary_content?.length && offer.secondary_content[0].info_text) {
        droptexts.push(offer.secondary_content[0].info_text);
        result.push({
            count: offer.secondary_content[0].count,
            cost: offer.secondary_content[0].cost?.amount ?? 0,
            currency: offer.secondary_content[0].cost?.currency ?? ''
        } as DropInfo);
        if (result[1].cost === 0 && !!offer.secondary_content[0].offer.currency_bundle) {
            let bt = BundleTable.find(f => f.name === offer.secondary_content![0].offer.currency_bundle);
            if (bt) {
                result[1].cost = bt.cost;
                result[1].currency = 'fiat';
            }
        }
        if (result[1].cost === result[0].cost && result[1].currency === result[0].currency) {
            result.splice(1);
            droptexts.splice(1);
        }
    }

    droptexts.forEach((info_text, idx) => {
        let drops = info_text!.split("DROP RATES:");
        let info = result[idx];
        info.drop_rates = [];
        let drop_rates = info.drop_rates;

        if (drops?.length === 2) {
            drops = drops[1].split("\n").filter(s => s.trim() !== '');
            let reg = /<#[A-Fa-f0-9]+>(.+)<\/color> (\w+): ([0-9.]+)\%/;
            for (let drop of drops) {
                let rx = reg.exec(drop);
                if (rx?.length && rx.length > 2) {
                    if (rx[1].includes("/")) {
                        let r2 = /.*(\d+)\/(\d+).*/;
                        let rxrare = r2.exec(rx[1]);
                        if (rxrare?.length && rxrare.length > 2) {
                            drop_rates.push({
                                type: rx[2],
                                rarity: Number(rxrare[2]),
                                rate: Number(rx[3])
                            });
                        } // <#AA2DEB>1/4 Star</color> Crew: 5.06%
                    }
                    else {
                        drop_rates.push({
                            type: rx[2],
                            rarity: Number(rx[1].split(" ")[0]),
                            rate: Number(rx[3])
                        })
                    }
                }
            }
        }
    });

    return result;
}