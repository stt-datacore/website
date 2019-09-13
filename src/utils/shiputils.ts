export function mergeShips(ship_schematics: any, ships: any): any {
	let newShips: any[] = [];
	ship_schematics.forEach((schematic: any) => {
		let owned = ships.find((ship: any) => ship.symbol == schematic.ship.symbol);

		let traits_named = schematic.ship.traits_named;

		if (owned) {
			schematic.ship.accuracy = owned.accuracy;
			schematic.ship.antimatter = owned.antimatter;
			schematic.ship.attack = owned.attack;
			schematic.ship.attacks_per_second = owned.attacks_per_second;
			schematic.ship.crit_bonus = owned.crit_bonus;
			schematic.ship.crit_chance = owned.crit_chance;
			schematic.ship.evasion = owned.evasion;
			schematic.ship.hull = owned.hull;
			schematic.ship.level = owned.level;
			schematic.ship.rarity = owned.rarity;
			schematic.ship.shield_regen = owned.shield_regen;
            schematic.ship.shields = owned.shields;
            schematic.ship.owned = true;
		} else {
			schematic.ship.level = 0;
			schematic.ship.owned = false;
		}

		schematic.ship.traits_named = traits_named;

		newShips.push(schematic.ship);
	});

	return newShips;
}
