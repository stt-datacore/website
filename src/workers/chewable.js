// Based on Chewable C++'s STT Voyage Estimator
//  https://codepen.io/somnivore/pen/Nabyzw

/* eslint-disable */

function getEstimate(config, resolve) {
  // required input (starting numbers)
  var ps = config.ps;
  var ss = config.ss;
  var o1 = config.others[0];
  var o2 = config.others[1];
  var o3 = config.others[2];
  var o4 = config.others[3];
  var startAm = config.startAm;

  // optional input (proficiency ratio)
  var prof = config.prof ? config.prof : 20;

  // optional input (ongoing voyage)
  var elapsedSeconds = config.elapsedSeconds ? config.elapsedSeconds : 0;
  var currentAm = config.currentAm ? config.currentAm : 0;

  // optional input (simulations)
  var numSims = config.numSims ? config.numSims : 5000;

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

  const formatResults = finished => {
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
        var dilemma = Math.floor(exResults[i]/2);
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
         'lastDil': lastDilemma*2,
         'dilChance': dilChance,
         'refillCostResult': extend > 0 ? Math.ceil(resultsRefillCostTotal[extend]/numSims) : 0
      }

      if (createBins) {
        var bins = [];

        for (result of exResults) {
 	  			let bin = Math.floor(result);
          console.log(bin);
          bin -= (bin % 60);

          if (bins.lenth > 0 && bin == bins[bins.length - 1].result)
	    			++bins[bins.length - 1].count;
          else
            bins.push({result: bin, count: 1});
        }

        refill.bins = bins;
      }

      refills.push(refill);
    } // foreach extend

    estimate['refills'] = refills;

    // calculate 20hr results
    estimate['20hrdil'] = Math.ceil(results20hrCostTotal/num20hourSims);
    estimate['20hrrefills'] = Math.round(results20hrRefillsTotal/num20hourSims);

    estimate['final'] = finished;

    return estimate;
  }; //end formatResults()

  // more input
  var elapsedHours = elapsedSeconds/3600;
  var ship = currentAm;
  if (ship == 0)
    ship = startAm;

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

      if (isim % 100 == 99)
        resolve(formatResults());
  } // foreach sim

  return formatResults();
}

function randomInt(min, max)
{
  return Math.min(max, min + Math.floor(Math.random()*(max-min+1)));
}

function randomRange(min, max)
{
  return min + Math.random()*(max-min);
}

module.exports.getEstimate = getEstimate;
