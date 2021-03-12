/* eslint-disable */

self.addEventListener('message', message => {
	if (message.data.lineups && message.data.lineups.length > 0) {
		ChewableBestVectorLineup(data = message.data).then(result => {
			self.postMessage(result);
			self.close();
		});
	}
	else {
		ChewableEstimate(config = message.data).then(estimate => {
			self.postMessage(estimate);
			self.close();
		});
	}
});

// This worker can estimate a single lineup from input config
const ChewableEstimate = config => {
	return new Promise((resolve, reject) => {
		let estimate = ChewableEstimator(config);
		resolve(estimate);
	});
};

// This worker can also determine best lineup given multiple lineups to test and voyage description
const ChewableBestVectorLineup = data => {
	const { lineups, primarySkill, secondarySkill, shipAM } = data;
	return new Promise((resolve, reject) => {
		const maxEstimates = Math.min(5, lineups.length);
		let consideredLineups = lineups.sort((a, b) => a.vector.proximity - b.vector.proximity).slice(0, maxEstimates);
		const promises = consideredLineups.map((lineup) =>
			ChewableEstimateVectorLineup(lineup, primarySkill, secondarySkill, shipAM)
		);
		Promise.all(promises).then((estimates) => {
			// Sort by best average (w/ DataCore pessimism)
			let sorted = estimates.sort((a, b) => {
				const playItSafe = false;
				let aEstimate = a.estimate.refills[0];
				let bEstimate = b.estimate.refills[0];
				let aAverage = (aEstimate.result*3+aEstimate.safeResult)/4;
				let bAverage = (bEstimate.result*3+bEstimate.safeResult)/4;
				if (playItSafe || aAverage == bAverage)
					return bEstimate.saferResult - aEstimate.saferResult;
				return bAverage - aAverage;
			});
			let best = consideredLineups.find((lineup) => lineup.key == sorted[0].key);
			let estimate = sorted[0].estimate.refills[0];
			let log = {
				'UniqueCount': lineups.length,
				'ConsideredCount': consideredLineups.length,
				'Vector': best.vector.id,
				'Attempt': best.vector.attempt,
				'ProximityIndex': consideredLineups.filter((lineup) => lineup.vector.proximity < best.vector.proximity).length,
				'BestEstimate': (estimate.result*3+estimate.safeResult)/4,
				'Chewable': estimate.result,
				'SaferResult': estimate.saferResult
			};
			resolve({
				'lineup': best,
				'estimate': sorted[0].estimate,
				log
			});
		})
		.catch((error) => {
			reject(error);
		});
	});
};

const ChewableEstimateVectorLineup = (lineup, primarySkill, secondarySkill, shipAM) => {
	const SKILL_IDS = ['command_skill', 'diplomacy_skill', 'security_skill',
						'engineering_skill', 'science_skill', 'medicine_skill'];
	let ps, ss, os = 0, others = [];
	for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
		let dSkillScore = Math.floor(lineup.skills[SKILL_IDS[iSkill]]);
		if (SKILL_IDS[iSkill] == primarySkill)
			ps = dSkillScore;
		else if (SKILL_IDS[iSkill] == secondarySkill)
			ss = dSkillScore;
		else {
			os += dSkillScore;
			others.push(dSkillScore);
		}
	}
	let config = {
		ps, ss, os, others,
		'startAm': shipAM + lineup.antimatter,
		'prof': lineup.proficiency
	};
	return new Promise((resolve, reject) => {
		let estimate = ChewableEstimator(config);
		resolve({ estimate, 'key': lineup.key });
	});
};

// Based on Chewable C++'s STT Voyage Estimator
//  https://codepen.io/somnivore/pen/Nabyzw

function ChewableEstimator(config) {
  // passed required parameters
  var ps = config.ps;
  var ss = config.ss;
  var o1 = config.others[0];
  var o2 = config.others[1];
  var o3 = config.others[2];
  var o4 = config.others[3];
  var startAm = config.startAm;

  // passed optional parameters
  var prof = config.prof ? config.prof : 20;

  // returned estimate
  var estimate = {};

  // output
  var numExtends = 2;
  var maxExtends = 100;
  var maxNum20hourSims = 100;

  // variables
  var ticksPerCycle = 28;
  var secondsPerTick = 20;
  var secondsInMinute = 60;
  var minutesInHour = 60;
  var hazardTick = 4;
  var rewardTick = 7;
  var hazardAsRewardTick = 28;
  var ticksPerMinute = secondsInMinute/secondsPerTick;
  var ticksPerHour = ticksPerMinute*minutesInHour;
  var cycleSeconds = ticksPerCycle*secondsPerTick;
  var cyclesPerHour = minutesInHour*secondsInMinute/cycleSeconds;
  var hazPerCycle = 6;
  var amPerActivity = 1;
  var activityPerCycle = 18;
  var hoursBetweenDilemmas = 2;
  var dilemmasPerHour = 1/hoursBetweenDilemmas;
  var ticksBetweenDilemmas = hoursBetweenDilemmas*minutesInHour*ticksPerMinute;
  var hazPerHour = hazPerCycle*cyclesPerHour-dilemmasPerHour;
  var hazSkillPerHour = 1260;
  var hazSkillPerTick = hazSkillPerHour/ticksPerHour; // 7
  var hazAmPass = 5;
  var hazAmFail = 30;
  var activityAmPerHour = activityPerCycle*cyclesPerHour*amPerActivity;
  var minPerHour = 60;
  var psChance = 0.35;
  var ssChance = 0.25;
  var osChance = 0.1;
  var skillChances = [psChance,ssChance,osChance,osChance,osChance,osChance];
  var dilPerMin = 5;

  // more input
  var currentAm = startAm; // ParseInt(document.getElementById("currentAm").value);
  var elapsedHours = 0; // ParseInt( document.getElementById("elapsedHours").value);
  var ship = currentAm; // ParseInt( document.getElementById("elapsedMinutes").value)/minPerHour;
  if (ship == 0)
    ship = startAm;

  var numSims = 5000; // ParseInt( document.getElementById("numSims").value);

  if (Math.min(ps,ss,o1,o2,o3,o4,ship) == 0) {
    ps = ss = 3000;
    o1 = o2 = o3 = o4 = 1000;
    ship = 1000;
    currentAm = 0;
    startAm = 500;
    elapsedHours = 0;
    numSims = 1000;
  }

  var num20hourSims = Math.min(maxNum20hourSims, numSims);

  //sizeUi();

  var hazSkillVariance = prof/100;
  var skills = [ps,ss,o1,o2,o3,o4];

  var elapsedHazSkill = elapsedHours*hazSkillPerHour;

  var maxSkill = Math.max(ps,ss,o1,o2,o3,o4);
  maxSkill = Math.max(0, maxSkill - elapsedHazSkill);
  var endVoySkill = maxSkill*(1+hazSkillVariance);

  var results = [];
  var resultsRefillCostTotal = [];
  for (var iExtend = 0; iExtend <= numExtends; ++iExtend) {
    results.push([]);
    results[iExtend].length = numSims;
    resultsRefillCostTotal.push(0);
  }

  //disableloops // temp

  var results20hrCostTotal = 0;
  var results20hrRefillsTotal = 0;

  for (var iSim = 0; iSim < numSims; iSim++) {
    var tick = Math.floor(elapsedHours*ticksPerHour);
    var am = ship;
    var refillCostTotal = 0;
    var extend = 0;

    while (0<1) {
      ++tick;
      // sanity escape:
      if (tick == 10000)
        break;

      // hazard && not dilemma
      if (tick%hazardTick == 0
          && tick%hazardAsRewardTick != 0
          && tick%ticksBetweenDilemmas != 0)
      {
        var hazDiff = tick*hazSkillPerTick;

        // pick the skill
        var skillPickRoll = Math.random();
        var skill;
        if (skillPickRoll < psChance) {
          skill = ps;
        } else if (skillPickRoll < psChance+ssChance) {
          skill = ss;
        } else {
          skill = skills[2+randomInt(0,3)];
        }

        // check (roll if necessary)
        var skillVar = hazSkillVariance*skill;
        var skillMin = skill-skillVar;
        if (hazDiff < skillMin) { // automatic success
          am += hazAmPass;
        } else {
          var skillMax = skill+skillVar;
          if (hazDiff >= skillMax) { // automatic fail
            am -= hazAmFail;
          } else { // roll for it
            var skillRoll = randomRange(skillMin, skillMax);
            //test.text += minSkill + "-" + maxSkill + "=" + skillRoll + " "
            if (skillRoll >= hazDiff) {
              am += hazAmPass;
            } else {
              am -= hazAmFail;
            }
          }
        }
      } else if (tick%rewardTick != 0
                 && tick%hazardAsRewardTick != 0
                 && tick%ticksBetweenDilemmas != 0)
      {
        am -= amPerActivity;
      }

      if (am <= 0) { // system failure
        if (extend == maxExtends)
          break;

        var voyTime = tick/ticksPerHour;
        var refillCost = Math.ceil(voyTime*60/dilPerMin);

        if (extend <= numExtends) {
          results[extend][iSim] = tick/ticksPerHour;
          if (extend > 0) {
            resultsRefillCostTotal[extend] += refillCostTotal;
          }
        }

        am = startAm;
        refillCostTotal += refillCost;
        extend++;

        if (voyTime > 20) {
          results20hrCostTotal += refillCostTotal;
          results20hrRefillsTotal += extend;
          break;
        }

        if (extend > numExtends && iSim >= num20hourSims) {
          break;
        }
      } // system failure
    } // foreach tick
  } // foreach sim

  var refills = [];

  // calculate and display results
  for (var extend = 0; extend <= numExtends; ++extend) {
    var exResults = results[extend];

    exResults.sort(function(a,b){return a-b;});
    var voyTime = exResults[Math.floor(exResults.length/2)];

    // compute other results
    var safeTime = exResults[Math.floor(exResults.length/10)];
    var saferTime = exResults[Math.floor(exResults.length/100)];
    var safestTime = exResults[0];

    // compute last dilemma chance
    var lastDilemma = 0;
    var lastDilemmaFails = 0;
    for(var i = 0; i < exResults.length; i++) {
      var dilemma = Math.floor(exResults[i]/hoursBetweenDilemmas);
      if (dilemma > lastDilemma) {
        lastDilemma = dilemma;
        lastDilemmaFails = Math.max(0,i);
      }
    }

    var dilChance = Math.round(100*(exResults.length-lastDilemmaFails)/exResults.length);
    // HACK: if there is a tiny chance of the next dilemma, assume 100% chance of the previous one instead
    if (dilChance == 0) {
      lastDilemma--;
      dilChance = 100;
    }

	var refill = {
		'result': voyTime,
		'safeResult': safeTime,
		'saferResult': saferTime,
		'lastDil': lastDilemma*hoursBetweenDilemmas,
		'dilChance': dilChance,
		'refillCostResult': extend > 0 ? Math.ceil(resultsRefillCostTotal[extend]/numSims) : 0
	}
	refills.push(refill);

    //test.text = maxSkill*(1+hazSkillVariance)/hazSkillPerHour
    // the threshold here is just a guess
    if (maxSkill/hazSkillPerHour > voyTime) {
      var tp = Math.floor(voyTime*hazSkillPerHour);
      if (currentAm == 0) {
        //setWarning(extend, "Your highest skill is too high by about " + Math.floor(maxSkill - voyTime*hazSkillPerHour) + ". To maximize voyage time, redistribute more like this: " + tp + "/" + tp + "/" + tp/4 + "/" + tp/4 + "/" + tp/4 + "/" + tp/4 + ".");
      }
    }
  } // foreach extend

  estimate['refills'] = refills;

  // calculate 20hr results
  estimate['20hrdil'] = Math.ceil(results20hrCostTotal/num20hourSims);
  estimate['20hrrefills'] = Math.round(results20hrRefillsTotal/num20hourSims);

  return estimate;
}

function randomInt(min, max)
{
  return Math.min(max, min + Math.floor(Math.random()*(max-min+1)));
}

function randomRange(min, max)
{
  return min + Math.random()*(max-min);
}