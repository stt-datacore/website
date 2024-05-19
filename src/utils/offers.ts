import { CrewMember } from "../model/crew";
import { Offer, OfferCrew } from "../model/offers";

export async function loadOffers(): Promise<Offer[] | undefined> {

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
        offers = offers?.filter(f => f.primary_content[0].title.includes(offerName.toUpperCase()));
    }

    offers?.forEach((offer) => {
        let crew = crewList.filter(f => offer.primary_content[0].info_text && offer.primary_content[0].info_text?.indexOf(`>${f.name}<`) !== -1);
        result.push({
            name: offer.primary_content[0].title,
            crew
        });
    });

    result = result.filter(f => f.crew.length);
    return result;
}