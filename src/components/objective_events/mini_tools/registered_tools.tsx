import { ObjectiveArchetype, PlayerData } from "../../../model/player";
import { FuseHelperMiniTool, ImmortalHelperMiniTool } from "./mortal_helpers";
import { SlotHelperMiniTool } from "./slots_helper";


export interface RegisteredOEMiniTool {
    key: string,
    component: (props: { data: ObjectiveArchetype }) => JSX.Element;
    player_required: boolean;
    archetypes: (string | RegExp)[];
}

export const RegisteredTools: RegisteredOEMiniTool[] = [
    {
        key: 'slot_helper_mini_tool',
        component: SlotHelperMiniTool,
        archetypes: ['continuum_unlock_quipment_slot'],
        player_required: true
    },
    {
        key: 'fuse_helper_mini_tool',
        component: FuseHelperMiniTool,
        archetypes: [/.*fuse_crew_objective.*/],
        player_required: true
    },
    {
        key: 'immortal_helper_mini_tool',
        component: ImmortalHelperMiniTool,
        archetypes: [/.*immortalize_crew_objective.*/],
        player_required: true
    }
]

export function findRegisteredTool(symbol: string, playerData?: PlayerData) {
    for (let tool of RegisteredTools) {
        for (let arch of tool.archetypes) {
            if (typeof arch === 'string') {
                if (symbol === arch) {
                    if (tool.player_required && !playerData) return undefined;
                    return tool;
                }
            }
            else {
                if (arch.test(symbol)) {
                    if (tool.player_required && !playerData) return undefined;
                    return tool;
                }
            }
        }
    }
    return undefined;
}