import { ComputedSkill } from "../model/crew";
import { PlayerCrew } from "../model/player";
import { skillToShort, skillSum, shortToSkill } from "../utils/crewutils";

/*


    React.useEffect(() => {
        let c = playerData?.player.character.crew;
        if (c?.length && voyageConfig?.skills) {
            let results = assessCrew(c, voyageConfig.skills.primary_skill, voyageConfig.skills.secondary_skill);
            if (results.length === 12) {
                setRosterCrew(results);
            }
        }
    }, [voyageConfig, playerData]);


*/

function assessCrew(roster: PlayerCrew[], pri: string, sec: string, preferCrit = false, preferTraits?: string[]) {

	let rost = roster.filter(f => !f.active_status && (!f.immortal || f.immortal < 0));
	if (pri.length !== 3) pri = skillToShort(pri)!;
	if (sec.length !== 3) sec = skillToShort(sec)!;
	pri = pri.toUpperCase();
	sec = sec.toUpperCase();
	rost.sort((a, b) => {
		return a.ranks[`V_${pri}_${sec}`] - b.ranks[`V_${pri}_${sec}`] || a.ranks.voyRank - b.ranks.voyRank;
	});

	let bucketnames = ['command_skill', 'diplomacy_skill', 'security_skill', 'engineering_skill', 'science_skill', 'medicine_skill'];
	let shortnames = bucketnames.map(b => skillToShort(b)!);
	type Bucket = {[key:string]: PlayerCrew[]};
	const buckets = {} as Bucket;

	for (let b of bucketnames) {
		buckets[b] = rost.filter(f => f.skill_order.includes(b));
	}

	const brackets = {} as { [key:string]: { skill: string, crew: PlayerCrew[], power: number }[] };

	Object.entries(buckets).forEach(([skill, crew]) => {
		for (let cc of crew) {
			let val = skillSum(cc.skill_order.map(sk => cc[sk] as ComputedSkill));
			val = Math.round(val / 100) * 100;
			brackets[val] ??= [];
			let obj = brackets[val].find(f => f.skill === skill);
			if (!obj) {
				obj = {
					skill,
					crew,
					power: val
				}
				brackets[val].push(obj);
			}
			else {
				obj.crew = obj.crew.concat(crew);
			}
		}
	});
	Object.values(brackets).forEach(bracket => {
		bracket.forEach(skillset => {
			skillset.crew = skillset.crew.filter((c, i) => skillset.crew.findIndex(c2 => c.id === c2.id) === i);
			skillset.crew = skillset.crew.sort((a, b) => {
				let r = a.ranks[`V_${pri}_${sec}`] - b.ranks[`V_${pri}_${sec}`] || a.ranks.voyRank - b.ranks.voyRank;
				if (preferCrit) {
					let p1 = skillSum(a.skill_order.map(sk => a[sk]));
					let p2 = skillSum(b.skill_order.map(sk => b[sk]));

					let c1 = skillSum(a.skill_order.map(sk => a[sk]), 'proficiency');
					let c2 = skillSum(b.skill_order.map(sk => b[sk]), 'proficiency');

					p1 = (p1 + c1) / 2;
					p2 = (p2 + c2) / 2;
					r = p2 - p1;
				}
				return r;
			});
		})
	});

	let bnums = Object.keys(brackets).sort((a, b) => Number(b) - Number(a));

	let aggs = {} as {[key:string]: number};
	let seats = {} as {[key:string]: PlayerCrew[]};
	let prin = 0;
	let secn = 0;
	let remainder = shortnames.filter(f => f != pri && f != sec);

	remainder.forEach(sn => aggs[sn] = 0);
	shortnames.forEach(sn => seats[sn] = [].slice());
	let excluded = [] as PlayerCrew[];
	let passes = 0;
	while (remainder.some(r => !aggs[r] || aggs[r] < (prin / 10) || aggs[r] < (secn / 8)) || (secn < (prin * 0.8)) || passes >= rost.length) {
		if (Object.values(seats).every(s => s.length === 2)) break;
		for (let bkey of bnums) {
			let group = brackets[bkey];
			for (let skg of group) {
				let ss = skillToShort(skg.skill)!;
				if (seats[ss].length === 2) continue;
				let d = skg.crew.length;
				let i = -1;
				for (i = 0; i < d; i++) {
					if (excluded.includes(skg.crew[i])) continue;
					if (!Object.values(seats).flat().includes(skg.crew[i])) break;
				}
				if (i >= d) continue;
				let cuse = skg.crew[i];
				cuse.skill_order.forEach(sku => {
					let skus = skillToShort(sku)!;
					if (skus === pri) {
						prin += skillSum(cuse[sku]);
					}
					else if (skus === sec) {
						secn += skillSum(cuse[sku]);
					}
					else {
						aggs[skus] += skillSum(cuse[sku]);
					}
				});
				seats[ss].push(cuse);
			}
		}
		if (Object.values(seats).every(s => s.length === 2) && remainder.some(r => aggs[r] < (prin / 10) || aggs[r] < (secn / 8) || (secn < (prin * 0.8)))) {
			let missing = remainder.filter(r => aggs[r] < (prin / 10));
			if (missing.length) {
				let allseats = Object.values(seats).flat().filter(f => f.skill_order.some(sko => missing.includes(skillToShort(sko)!)));
				for (let mskill of missing) {
					let yskill = shortToSkill(mskill)! as string;
					allseats.sort((a, b) => {
						return skillSum(a[yskill]) - skillSum(b[yskill]);
					});
					let remove = allseats[0];
					Object.values(seats).forEach(seat => seat = seat.filter(f => f !== remove));
					excluded.push(remove);
					remove.skill_order.forEach(remsk => {
						let rs = skillToShort(remsk)!;
						if (rs === pri) {
							prin -= skillSum(remove[remsk]);
						}
						else if (rs === pri) {
							secn -= skillSum(remove[remsk]);
						}
						else {
							aggs[rs] -= skillSum(remove[remsk]);
						}
					});
				}
			}
			missing = remainder.filter(r => aggs[r] < (secn / 8));
			if (missing.length) {
				let allseats = Object.values(seats).flat().filter(f => f.skill_order.some(sko => missing.includes(skillToShort(sko)!)));
				for (let mskill of missing) {
					let yskill = shortToSkill(mskill)! as string;
					allseats.sort((a, b) => {
						return skillSum(a[yskill]) - skillSum(b[yskill]);
					});
					let remove = allseats[0];
					Object.values(seats).forEach(seat => seat = seat.filter(f => f !== remove));
					excluded.push(remove);
					remove.skill_order.forEach(remsk => {
						let rs = skillToShort(remsk)!;
						if (rs === pri) {
							prin -= skillSum(remove[remsk]);
						}
						else if (rs === pri) {
							secn -= skillSum(remove[remsk]);
						}
						else {
							aggs[rs] -= skillSum(remove[remsk]);
						}
					});
				}
			}
			if (secn < (prin * 0.8)) {
				missing = [shortToSkill(sec)!];
				let allseats = Object.values(seats).flat().filter(f => f.skill_order.some(sko => missing.includes(sko)));
				for (let mskill of missing) {
					let yskill = mskill;
					allseats.sort((a, b) => {
						return skillSum(a[yskill]) - skillSum(b[yskill]);
					});
					let remove = allseats[0];
					Object.values(seats).forEach(seat => seat = seat.filter(f => f !== remove));
					excluded.push(remove);
					remove.skill_order.forEach(remsk => {
						let rs = skillToShort(remsk)!;
						if (rs === pri) {
							prin -= skillSum(remove[remsk]);
						}
						else if (rs === pri) {
							secn -= skillSum(remove[remsk]);
						}
						else {
							aggs[rs] -= skillSum(remove[remsk]);
						}
					});
				}
			}
		}
		passes++;
	}

	return Object.values(seats).flat();
}