import { ObjectiveArchetype } from "../../../model/player"
import { SlotHelperMiniTool } from "./slots_helper";


export interface RegisteredOEMiniTool {
    key: string,
    component: (props: { data: ObjectiveArchetype }) => JSX.Element;
    player_required: boolean;
    archetypes: string[];
}

export const RegisteredTools: RegisteredOEMiniTool[] = [
    {
        key: 'slot_helper_mini_tool',
        component: SlotHelperMiniTool,
        archetypes: ['continuum_unlock_quipment_slot'],
        player_required: true
    }
]