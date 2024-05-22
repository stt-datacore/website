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
        if (offer.primary_content[0].info_text?.includes("Borg Baby Boimler")) {
            console.log("here");
        }

        if (!offer.primary_content[0].info_text) return;        
        let split = offer.primary_content[0].info_text.split("<b>").map(sp => sp.replace(/<\/b>.*/, '').replace(/\n.*/g, '').trim());

        let crew = crewList.filter(f => split.includes(f.name));

        result.push({
            name: offer.primary_content[0].title,
            crew
        });
    });

    result = result.filter(f => f.crew.length);
    return result;
}