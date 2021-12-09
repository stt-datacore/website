// Based on Chewable C++'s STT Voyage Estimator
//  https://codepen.io/somnivore/pen/Nabyzw

/* eslint-disable */

function getEstimate(config, reportProgress = () => true) {
  // required input (starting numbers)
  var ps = config.ps;
  var ss = config.ss;
  var o1 = config.others[0];
  var o2 = config.others[1];
  var o3 = config.others[2];
  var o4 = config.others[3];
  var startAm = config.startAm;

  // optional input (proficiency ratio)
  var prof = config.prof ?? 20;

  // optional input (ongoing voyage)
  var elapsedSeconds = config.elapsedSeconds ? config.elapsedSeconds : 0;
  var currentAm = config.currentAm ?? 0;

  // optional input (simulations)
  var numSims = config.numSims ?? 5000;

  // returned estimate
  var estimate = {};

  // output
  var numExtends = config.noExtends ? 0 : 2;
  var maxExtends = 100;
  var maxNum20hourSims = 100;

  // variables
  var allSkills = [ps, ss, o1, o2, o3, o4];
  const ticksPerCycle = 28;
  const secondsPerTick = 20;
  const secondsInMinute = 60;
  const minutesInHour = 60;
  const hazardTick = 4;
  const rewardTick = 7;
  const hazardAsRewardTick = 28;
  const ticksPerMinute = secondsInMinute/secondsPerTick;
  const ticksPerHour = ticksPerMinute*minutesInHour;
  const cycleSeconds = ticksPerCycle*secondsPerTick;
  const cyclesPerHour = minutesInHour*secondsInMinute/cycleSeconds;
  const hazPerCycle = 6;
  const amPerActivity = 1;
  const hoursBetweenDilemmas = 2;
  const dilemmasPerHour = 1/hoursBetweenDilemmas;
  const ticksBetweenDilemmas = hoursBetweenDilemmas*minutesInHour*ticksPerMinute;
  const skillIncPerHaz = 32;
  const hazPerHour = hazPerCycle*cyclesPerHour-dilemmasPerHour;
  const ticksPerHazard = 4;
  const hazAmPass = 5;
  const hazAmFail = 30;
  const minPerHour = 60;
  const psChance = 0.35;
  const ssChance = 0.25;
  const osChance = 0.1;
  const skillChances = [psChance,ssChance,osChance,osChance,osChance,osChance];
  const dilPerMin = 5;
  const num20hourSims = Math.min(maxNum20hourSims, numSims);

  const formatResults = (finished) => {
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
      var moonshotTime = exResults[exResults.length-Math.floor(exResults.length/100)];

      // compute chance of dilemma closest to median
      const lastDilemma = Math.max(Math.floor(elapsedSeconds/7200)*2+2, Math.round(voyTime/2)*2);
      const lastDilemmaSuccesses = exResults.filter(r => r >= lastDilemma).length;

      var refill = {
         'all': exResults,
         'result': voyTime,
         'safeResult': safeTime,
         'saferResult': saferTime,
         'moonshotResult': moonshotTime,
         'lastDil': lastDilemma,
         'dilChance': 100*lastDilemmaSuccesses/exResults.length,
         'refillCostResult': extend > 0 ? Math.ceil(resultsRefillCostTotal[extend]/exResults.length) : 0
      }

      refills.push(refill);
    } // foreach extend

    estimate['refills'] = refills;

    // calculate 20hr results
    let num20hrSims = deterministic ? 1 : num20hourSims;
    estimate['20hrdil'] = Math.ceil(results20hrCostTotal/num20hrSims);
    estimate['20hrrefills'] = Math.round(results20hrRefillsTotal/num20hrSims);

    estimate['final'] = finished;
    estimate['deterministic'] = deterministic;

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

  //sizeUi();

  var hazSkillVariance = prof/100;
  var skills = [ps,ss,o1,o2,o3,o4];

  var elapsedTicks = Math.floor(elapsedSeconds/secondsPerTick);
  var elapsedCycles = Math.floor(elapsedTicks/ticksPerCycle);
  var dilemmaForHazards = Math.floor(elapsedHours/hoursBetweenDilemmas);
  var elapsedHazCount =
    elapsedCycles*hazPerCycle+Math.floor(elapsedTicks%ticksPerCycle/ticksPerHazard)-dilemmaForHazards;
  var elapsedHazSkill = elapsedHazCount*skillIncPerHaz;
  var deterministic = false;
  var maxSkill = Number.isFinite(ps) ? Math.max(ps,ss,o1,o2,o3,o4)*(1+hazSkillVariance)
                                      : Math.max(...[ps, ss, o1, o2, o3, o4].map(s => s.core + s.range_max));
  deterministic = maxSkill < elapsedHazSkill;

  if (deterministic)
    numSims = 1;   // With no more skill checks there can only be one voyage length

  var results = [];
  var resultsRefillCostTotal = [];
  for (var iExtend = 0; iExtend <= numExtends; ++iExtend) {
    results.push([]);
    //results[iExtend].length = numSims;
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
    var hazDiff = elapsedHazSkill;

    while (0<1) {
      ++tick;
      // sanity escape:
      if (tick == 10000)
        break;

      // hazard && not dilemma or reward
      if (tick%hazardTick == 0 && tick%rewardTick != 0 && tick%ticksBetweenDilemmas != 0)
      {
        hazDiff += skillIncPerHaz;

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
        var skillVar =  hazSkillVariance*skill ;
        var skillMin = Number.isFinite(skill) ? skill-skillVar : skill.core + skill.range_min;

        if (hazDiff <= skillMin) { // automatic success
          am += hazAmPass;
        } else {
          var skillMax = Number.isFinite(skill) ? skill+skillVar : skill.core + skill.range_max;

          if (hazDiff > skillMax) { // automatic fail
            am -= hazAmFail;
          } else { // roll for it
            var skillRoll = randomInt(skillMin, skillMax);
            //test.text += minSkill + "-" + maxSkill + "=" + skillRoll + " "
            if (skillRoll >= hazDiff) {
              am += hazAmPass;
            } else {
              am -= hazAmFail;
            }
          }
        }
      } else if (tick%ticksBetweenDilemmas != 0) {
        am -= amPerActivity;
      }

      if (am <= 0) { // system failure
        if (extend == maxExtends)
          break;

        var voyTime = tick/ticksPerHour;
        var refillCost = Math.ceil(voyTime*60/dilPerMin);

        if (extend <= numExtends) {
          results[extend].push(tick/ticksPerHour);

          if (extend > 0) {
            resultsRefillCostTotal[extend] += refillCostTotal;
          }
        }

        am = startAm;
        refillCostTotal += refillCost;
        extend++;

        if (voyTime > 20) {
          results20hrCostTotal += refillCostTotal;
          results20hrRefillsTotal += extend - 1;
          break;
        }

        if (extend > numExtends && iSim >= num20hourSims) {
          break;
        }
      } // system failure
    } // foreach tick

    if (iSim > 0 && iSim % 100 == 0)
      reportProgress(formatResults(false));
  } // foreach sim

  return formatResults(true);
}

function randomInt(min, max)
{
  return Math.min(max, min + Math.floor(Math.random()*(max-min+1)));
}

function randomRange(min, max)
{
  return Math.floor(min + Math.random()*(max-min+1));
}

module.exports.getEstimate = getEstimate;
