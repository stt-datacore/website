import { navigate } from "gatsby";
import { CrewMember } from "../model/crew";
import { PlayerCrew } from "../model/player";

/**
 * Navigate to the crew page, sending over information about owned variants and fusables.
 * Any missing information is simply ignored.
 * @param crew The crew member to navigate to
 * @param ownedCrew Your owned crew
 * @param buffs Your active buffs
 * @param allCrew All crew
 */
export function navToCrewPage(crew: PlayerCrew | CrewMember) {
	navigate('/crew/' + crew.symbol);
}
