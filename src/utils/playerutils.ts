import { PlayerEquipmentItem, PlayerCrew, PlayerData, AcceptedMission } from "../model/player";

// Remove any unnecessary fields from the player data
export function stripPlayerData(items: PlayerEquipmentItem[], p: PlayerData): any {
    // prevent this method from being called on previous-stripped player data.
    if (p.stripped) return;
    p.stripped = true;

    delete p.item_archetype_cache;
    delete p.archetype_cache;
    delete p.version;

    delete p.player.entitlements;
    delete p.player.mailbox;
    delete p.player.motd;
    delete p.player.community_links;
    delete p.player.currency_exchanges;
    if ("commerce" in p.player) delete p.player["commerce"];
    delete p.player.chats;
    delete p.player.environment;
    delete p.player.fleet_invite;
    delete p.player.npe_complete;

    if ("reroll_descriptions" in p.player.character) delete p.player.character.reroll_descriptions;
    if ("seconds_to_scan_cooldown" in p.player.character) delete p.player.character.seconds_to_scan_cooldown;
    if ("scan_speedups_today" in p.player.character) delete p.player.character.scan_speedups_today;

    delete p.player.character.active_conflict;
    delete p.player.character.next_shuttle_bay_cost;
    delete p.player.character.galaxy_crew_cooldowns;
    delete p.player.character.stimpack;

    delete p.fleet_boss_battles_root;
	delete p.captains_bridge_root;
	delete p.scanning_root;
	delete p.objective_root;
	delete p.objective_event_root;
    delete p.archetype_cache;
    delete p.item_archetype_cache;

    delete p.player.character.navmap;
    delete p.player.character.tutorials;
    delete p.player.character.shuttle_adventures;
    delete p.player.character.voyage;
    delete p.player.character.voyage_descriptions;
    delete p.player.character.voyage_summaries;
    delete p.player.character.boost_windows;
    delete p.player.character.cadet_schedule;
    //delete p.player.character.cadet_tickets;
    delete p.player.character.daily_rewards_state;
    delete p.player.character.location;
    delete p.player.character.destination;
    delete p.player.character.video_ad_chroniton_boost_reward;
    //delete p.player.character.pvp_tickets;
    delete p.player.character.event_tickets;
    //delete p.player.character.pvp_divisions;
    delete p.player.character.pvp_timer;
    delete p.player.character.fleet_activities;
    delete p.player.character.honor_reward_by_rarity;
    delete p.player.character.using_default_name;
    //delete p.player.character.max_level;
    delete p.player.character.can_purchase_shuttle_bay;
    //delete p.player.character.replay_energy_rate;
    //delete p.player.character.seconds_from_replay_energy_basis;
    delete p.player.character.seconds_from_last_boost_claim;
    // delete p.player.character.crew_borrows;
    // delete p.player.character.crew_shares;
    delete p.player.character.crew_limit_increase_per_purchase;
    delete p.player.character.next_crew_limit_increase_cost;
    delete p.player.character.can_purchase_crew_limit_increase;
    delete p.player.character.item_limit;
    delete p.player.character.disputes;
    delete p.player.character.tng_the_game_level;
    delete p.player.character.open_packs;
    delete p.player.character.next_daily_activity_reset;
    delete p.player.character.next_starbase_donation_reset;
    delete p.player.character.next_fleet_activity_reset;
    delete p.player.character.freestanding_quests;
    //delete p.player.character.stimpack;
    delete p.player.character.location_channel_prefix;
    delete p.player.character.events;

    if (
        p.player.character.crew_avatar &&
        p.player.character.crew_avatar.symbol
    ) {
        if (p.player.character.crew_avatar.portrait.file.startsWith("/")) {
            p.player.character.crew_avatar = {
                ... p.player.character.crew_avatar,
                portrait: {
                    file: p.player.character.crew_avatar.portrait.file
                    .slice(1)
                    .replace("/", "_") + ".png",
                }
            };
        }
    }

    p.player.character.accepted_missions =
        p.player.character.accepted_missions.map((mission) => ({
            id: mission.id,
            symbol: mission.symbol,
            stars_earned: mission.stars_earned,
            accepted: mission.accepted,
            state: mission.state,
            total_stars: mission.total_stars,
        } as AcceptedMission));

    p.player.character.dispute_histories =
        p.player.character.dispute_histories.map((mission) => ({
            id: mission.id,
            symbol: mission.symbol,
            stars_earned: mission.stars_earned,
            completed: mission.completed,
            total_stars: mission.total_stars,
        }));

    p.player.character.crew_collection_buffs =
        p.player.character.crew_collection_buffs.map((buff) => ({
            stat: buff.stat,
            value: buff.value,
            operator: buff.operator,
        }));

    p.player.character.starbase_buffs = p.player.character.starbase_buffs.map(
        (buff) => ({
            stat: buff.stat,
            value: buff.value,
            operator: buff.operator,
        })
    );

    p.player.character.daily_activities =
        p.player.character.daily_activities.map((da) => ({
            name: da.name,
            description: da.description,
            status: da.status,
            lifetime: da.lifetime,
            icon: da.icon,
        }));

    let newItems = [] as PlayerEquipmentItem[];
    p.player.character.items.forEach((item) => {
        let itemEntry = items.find((i) => i.symbol === item.symbol);
        if (itemEntry) {
            newItems.push({
                type: item.type,
                symbol: item.symbol,
                archetype_id: item.archetype_id,
                rarity: item.rarity,
                quantity: item.quantity,
            });
        } else {
            // This item is not in the cache, push its details as well
            newItems.push({
                symbol: item.symbol,
                archetype_id: item.archetype_id,
                rarity: item.rarity,
                quantity: item.quantity,
                type: item.type,
                name: item.name,
                flavor: item.flavor,
                imageUrl: item.icon?.file.slice(1).replace(/\//g, "_") + ".png",
            });
        }
    });
    p.player.character.items = newItems;

    p.player.character.factions = p.player.character.factions.map(
        (faction) => ({
            name: faction.name,
            id: faction.id,
            completed_shuttle_adventures: faction.completed_shuttle_adventures,
            reputation: faction.reputation,
        })
    );

    // We should keep all ship data from the player
    //
    // p.player.character.ships = p.player.character.ships.map((ship) => ({
    //     id: ship.id,
    //     level: ship.level,
    //     symbol: ship.symbol,
    //     antimatter: ship.antimatter,
    //     shields: ship.shields,
    //     hull: ship.hull,
    //     attack: ship.attack,
    //     evasion: ship.evasion,
    //     accuracy: ship.accuracy,
    //     crit_chance: ship.crit_chance,
    //     crit_bonus: ship.crit_bonus,
    //     attacks_per_second: ship.attacks_per_second,
    //     shield_regen: ship.shield_regen,
    //     rarity: ship.rarity,
    //     battle_stations: ship.battle_stations
    // }));

    p.buyback_well = p.player.character.crew.filter((crew) => !!crew.in_buy_back_state) ?? [];
    p.player.character.crew = p.player.character.crew
        .filter((crew) => !crew.in_buy_back_state)
        .map((crew) => ({
            id: crew.id,
            symbol: crew.symbol,
            archetype_id: crew.archetype_id,
            level: crew.level,
            max_level: crew.max_level,
            rarity: crew.rarity,
            equipment: crew?.equipment?.map((eq) => eq ? eq[0] : 0),
            local_slots: crew?.equipment_slots ? [...crew.equipment_slots] : undefined,
            kwipment: crew.kwipment,
            kwipment_expiration: crew.kwipment_expiration,
            q_bits: crew.q_bits,
            base_skills: crew.base_skills,
            skills: crew.skills,
            favorite: crew.favorite,
            expires_in: crew.expires_in,
            cap_achiever: crew.cap_achiever,
            action: {
                bonus_amount: crew.action?.bonus_amount,
            },
            ship_battle: crew.ship_battle
        } as PlayerCrew));

    let c_stored_immortals = p.player.character.stored_immortals
        .filter((im) => im.quantity === 1 && !im.qbits)
        .map((im) => im.id);

    p.player.character.stored_immortals =
        p.player.character.stored_immortals.filter((im) => im.quantity !== 1 || !!im.qbits);
    p.player.character.c_stored_immortals = c_stored_immortals;

    // For Apple webarchives
    p.player.character.cryo_collections.forEach(col => {
        col.description = col.description?.replace(/&gt;/g, '>').replace(/&lt;/g, '<');
    })

    p.stripped = true;
    return p;
}



export class BonusCrew {
    eventName: string = "";
    eventCrew: { [index: string]: any } = {};
}

export function bonusCrewForCurrentEvent(
    character: any
): BonusCrew | undefined {
    let result = new BonusCrew();

    if (character.events && character.events.length > 0) {
        let activeEvent = character.events[0];
        result.eventName = activeEvent.name;

        if (activeEvent.content) {
            if (activeEvent.content.crew_bonuses) {
                for (let symbol in activeEvent.content.crew_bonuses) {
                    result.eventCrew[symbol] =
                        activeEvent.content.crew_bonuses[symbol];
                }
            }

            // For skirmish events
            if (activeEvent.content.bonus_crew) {
                for (let symbol in activeEvent.content.bonus_crew) {
                    result.eventCrew[symbol] =
                        activeEvent.content.bonus_crew[symbol];
                }
            }

            // For expedition events
            if (activeEvent.content.special_crew) {
                activeEvent.content.special_crew.forEach((symbol: string) => {
                    result.eventCrew[symbol] = symbol;
                });
            }

            // TODO: there's also bonus_traits; should we bother selecting crew with those? It looks like you can use voyage crew in skirmish events, so it probably doesn't matter
            if (activeEvent.content.shuttles) {
                activeEvent.content.shuttles.forEach((shuttle: any) => {
                    for (let symbol in shuttle.crew_bonuses) {
                        result.eventCrew[symbol] = shuttle.crew_bonuses[symbol];
                    }
                });
            }
        }

        return result;
    }

    return undefined;
}

export function getChrons(playerData: PlayerData) {
    let ch = 0;
    ch = Math.floor(playerData.player.character.seconds_from_replay_energy_basis / playerData.player.character.replay_energy_rate);
    if (ch <= 0) {
        ch = playerData.player.character.replay_energy_max + playerData.player.character.replay_energy_overflow;
    }
    return ch;
}