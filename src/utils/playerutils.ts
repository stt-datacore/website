// Remove any unnecessary fields from the player data
export function stripPlayerData(p: any): any {
	delete p.item_archetype_cache;

	delete p.player.entitlements;
	delete p.player.mailbox;
	delete p.player.motd;
	delete p.player.community_links;
	delete p.player.currency_exchanges;
	delete p.player.commerce;
	delete p.player.chats;
	delete p.player.environment;
	delete p.player.fleet_invite;
	delete p.player.npe_complete;

	delete p.player.character.navmap;
	delete p.player.character.tutorials;
	delete p.player.character.shuttle_adventures;
	delete p.player.character.voyage;
	delete p.player.character.voyage_descriptions;
	delete p.player.character.voyage_summaries;
	delete p.player.character.reroll_descriptions;
	delete p.player.character.boost_windows;
	delete p.player.character.cadet_schedule;
	delete p.player.character.cadet_tickets;
	delete p.player.character.reroll_descriptions;
	delete p.player.character.daily_rewards_state;
	delete p.player.character.cryo_collections;
	delete p.player.character.location;
	delete p.player.character.destination;
	delete p.player.character.video_ad_chroniton_boost_reward;
	delete p.player.character.pvp_tickets;
	delete p.player.character.event_tickets;
	delete p.player.character.pvp_divisions;
	delete p.player.character.pvp_timer;
	delete p.player.character.fleet_activities;
	delete p.player.character.honor_reward_by_rarity;
	delete p.player.character.using_default_name;
	delete p.player.character.max_level;
	delete p.player.character.active_conflict;
	delete p.player.character.next_shuttle_bay_cost;
	delete p.player.character.can_purchase_shuttle_bay;
	delete p.player.character.seconds_to_scan_cooldown;
	delete p.player.character.scan_speedups_today;
	delete p.player.character.replay_energy_rate;
	delete p.player.character.seconds_from_replay_energy_basis;
	delete p.player.character.seconds_from_last_boost_claim;
	delete p.player.character.crew_borrows;
	delete p.player.character.crew_shares;
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
	delete p.player.character.stimpack;
	delete p.player.character.location_channel_prefix;

	p.player.character.crew_avatar = {
		symbol: p.player.character.crew_avatar.symbol,
		portrait: p.player.character.crew_avatar.portrait.file.substr(1).replace('/', '_') + '.png'
	};

	p.player.character.accepted_missions = p.player.character.accepted_missions.map(mission => ({
		id: mission.id,
		symbol: mission.symbol,
		stars_earned: mission.stars_earned,
		accepted: mission.accepted,
		state: mission.state,
		total_stars: mission.total_stars
	}));

	p.player.character.dispute_histories = p.player.character.dispute_histories.map(mission => ({
		id: mission.id,
		symbol: mission.symbol,
		stars_earned: mission.stars_earned,
		completed: mission.completed,
		total_stars: mission.total_stars
	}));

	p.player.character.crew_collection_buffs = p.player.character.crew_collection_buffs.map(buff => ({
		stat: buff.stat,
		value: buff.value,
		operator: buff.operator
	}));

	p.player.character.starbase_buffs = p.player.character.starbase_buffs.map(buff => ({
		stat: buff.stat,
		value: buff.value,
		operator: buff.operator
	}));

	p.player.character.daily_activities = p.player.character.daily_activities.map(da => ({
		name: da.name,
		description: da.description,
		status: da.status
	}));

	p.player.character.items = p.player.character.items.map(item => ({
		symbol: item.symbol,
		archetype_id: item.archetype_id,
		rarity: item.rarity,
		quantity: item.quantity
	}));
	p.player.character.factions = p.player.character.factions.map(faction => ({
		name: faction.name,
		id: faction.id,
		reputation: faction.reputation
	}));

	p.player.character.ships = p.player.character.ships.map(ship => ({
		level: ship.level,
		symbol: ship.symbol,
		antimatter: ship.antimatter,
		shields: ship.shields,
		hull: ship.hull,
		attack: ship.attack,
		evasion: ship.evasion,
		accuracy: ship.accuracy,
		crit_chance: ship.crit_chance,
		crit_bonus: ship.crit_bonus,
		attacks_per_second: ship.attacks_per_second,
		shield_regen: ship.shield_regen,
		rarity: ship.rarity
	}));

	p.player.character.crew = p.player.character.crew
		.filter(crew => !crew.in_buy_back_state)
		.map(crew => ({
			symbol: crew.symbol,
			archetype_id: crew.archetype_id,
			level: crew.level,
			rarity: crew.rarity,
			equipment: crew.equipment.map(eq => eq[0]),
			base_skills: crew.base_skills,
			favorite: crew.favorite
		}));

	let c_stored_immortals = p.player.character.stored_immortals.filter(im => im.quantity === 1).map(im => im.id);
	p.player.character.stored_immortals = p.player.character.stored_immortals.filter(im => im.quantity !== 1);
	p.player.character.c_stored_immortals = c_stored_immortals;

	return p;
}
