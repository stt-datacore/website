// Adapted from Chewable C++'s STT Voyage Estimator
//  https://codepen.io/somnivore/pen/Nabyzw

/* eslint-disable */

function getEstimate(config, reportProgress = () => true) {
    /**
     * required input (starting numbers)
     * @type {number}
     */
    var ps = config.ps;
    /**
     * required input (starting numbers)
     * @type {number}
     */
    var ss = config.ss;

    if (!config.others) config.others = [0,0,0,0];

    var o1 = config.others[0];
    var o2 = config.others[1];
    var o3 = config.others[2];
    var o4 = config.others[3];
    var startAm = config.startAm;

    // optional input (proficiency ratio)
    var prof = config.prof ?? 20;

    // optional input (the time to compute)
    var selectedTime = config.selectedTime ?? 20;

    // optional input (ongoing voyage)
    var elapsedSeconds = config.elapsedSeconds ? config.elapsedSeconds : 0;

    if (elapsedSeconds) {
        let nextHour = Math.ceil(elapsedSeconds / 3600);
        if (nextHour % 2) nextHour++;
        if (selectedTime < nextHour) {
            selectedTime = nextHour + 2;
        }
    }

    var currentAm = config.currentAm ?? config.startAm;

    // optional input (simulations)
    var numSims = config.numSims ?? 5000;

    /**
     * returned estimate
     * @type {import("../model/worker").Estimate}
     */
    var estimate = {};

    // output
    var numExtends = config.noExtends ? 0 : 2;
    var maxExtends = 100;
    var maxNumSelectedTimeSims = 100;

    // variables
    var allSkills = [ps, ss, o1, o2, o3, o4];
    const ticksPerCycle = 28;
    const secondsPerTick = 20;
    const secondsInMinute = 60;
    const minutesInHour = 60;
    //const hazardTick = 4;
    //const rewardTick = 7;
    //const hazardAsRewardTick = 28;
    const ticksPerMinute = secondsInMinute/secondsPerTick;
    const ticksPerHour = ticksPerMinute*minutesInHour;
    const cycleSeconds = ticksPerCycle*secondsPerTick;
    const cyclesPerHour = minutesInHour*secondsInMinute/cycleSeconds;
    const hazPerCycle = 6;
    //const amPerActivity = 1;
    const hoursBetweenDilemmas = 2;
    const dilemmasPerHour = 1/hoursBetweenDilemmas;
    //const ticksBetweenDilemmas = hoursBetweenDilemmas*minutesInHour*ticksPerMinute;
    const skillIncPerHaz = 32;
    const hazPerHour = hazPerCycle*cyclesPerHour-dilemmasPerHour;
    const ticksPerHazard = 4;
    const hazAmPass = 5;
    const hazAmFail = 30;
    //const minPerHour = 60;
    const psChance = 0.35;
    const ssChance = 0.25;
    const osChance = 0.1;
    //const skillChances = [psChance,ssChance,osChance,osChance,osChance,osChance];
    const dilPerMin = 5;
    const numSelectedTimeSims = Math.min(maxNumSelectedTimeSims, numSims);
    const maxCostPerHazard = ticksPerHazard+hazAmFail-1;

    /**
     *
     * @param {boolean} finished
     * @returns {import("../model/worker").Estimate}
     */
    const formatResults = (finished) => {
      /**
       * @type {import("../model/worker").Refill[]}
       */
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

        /**
         * @type {import("../model/worker").Refill}
         */
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

      // calculate SelectedTime results
      var timeSims = deterministic ? 1 : numSelectedTimeSims;
      estimate['dilhr20'] = Math.ceil(resultsSelectedTimeCostTotal/timeSims);
      estimate['refillshr20'] = Math.round(resultsSelectedTimeRefillsTotal/timeSims);

      estimate['final'] = finished;
      estimate['deterministic'] = deterministic;

      return estimate;
    }; //end formatResults()

    // more input
    var elapsedHours = elapsedSeconds/3600;

    if (Math.min(ps,ss,o1,o2,o3,o4,startAm) == 0) {
      ps = ss = 3000;
      o1 = o2 = o3 = o4 = 1000;
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
    const maxSkill = Number.isFinite(ps) ? Math.max(ps,ss,o1,o2,o3,o4)*(1+hazSkillVariance)
                                        : Math.max(...[ps, ss, o1, o2, o3, o4].map(s => s.core + s.range_max));
    const minSkill = Number.isFinite(ps) ? Math.min(ps,ss,o1,o2,o3,o4)*(1-hazSkillVariance)
                                        : Math.min(...[ps, ss, o1, o2, o3, o4].map(s => s.core + s.range_min));
    deterministic = maxSkill < elapsedHazSkill || config.vfast;

    let hazardScore = 0;
    // Create an array functions to be called at each hazard tick (including rewards and dilemmaas)
    const allHazards = Array.from({length:hazPerHour*(selectedTime + 16)}, (v, n) => {
      if (n%7 == 6) // reward found instead of hazard
        return () => 29;

      if (n%90== 89) // dilemma
        return () => 30;

      if (maxSkill < hazardScore)
        return () => 0;

      hazardScore += skillIncPerHaz;

      if (minSkill > hazardScore)
        return () => (hazAmFail + hazAmPass);

      const skillChance =
        skill => Math.max(0, Math.min(1, ((skill.core+skill.range_max)-hazardScore)/(skill.range_max-skill.range_min)));
      const probaility = [psChance*skillChance(ps), ssChance*skillChance(ss),
                          ...config.others?.map(s => osChance*skillChance(s))].reduce((all, p) => all + p, 0);
      //console.log(probaility);
      return config.vfast ? () => probaility*(hazAmFail+hazAmPass)
                          : () => (Math.random() < probaility) ? hazAmFail+hazAmPass : 0;
    });

    //console.log(allHazards.map(h => h()));
    if (deterministic)
      numSims = 1;   // With no more skill checks there can only be one voyage length

    /**
     * @type {number[][]}
     */
    var results = [];
    /**
     * @type {number[]}
     */
    var resultsRefillCostTotal = [];
    for (var iExtend = 0; iExtend <= numExtends; ++iExtend) {
      results.push([]);
      //results[iExtend].length = numSims;
      resultsRefillCostTotal.push(0);
    }

    var resultsSelectedTimeCostTotal = 0;
    var resultsSelectedTimeRefillsTotal = 0;
    var maxTicks = am => {
      var maxCompetedHazards = Math.floor(amLeft/33);
      amLeft -= maxCompetedHazards*33;
      var ticks = Math.min(3, amLeft);
      return (maxCompletedCycles*ticksPerCycle+maxCompetedHazards*ticksPerHazard+ticks, amLeft-ticks);
    }

    for (var iSim = 0; iSim < numSims; iSim++) {
      var tick = Math.floor(elapsedHours*ticksPerHour);
      var am = currentAm;
      var refillCostTotal = 0;
      var extend = 0;

      while ((extend < numExtends || iSim < numSelectedTimeSims) && extend < maxExtends) {
        while (am > maxCostPerHazard) {
          const potHazEncountered = Math.floor(am/maxCostPerHazard);
          const nextTick = tick+(potHazEncountered*ticksPerHazard);
          const startHaz = Math.floor(tick/ticksPerHazard);
          const endHaz = Math.ceil(nextTick/ticksPerHazard);
          const amAdded = allHazards.slice(startHaz, endHaz).reduce((total, h) => total + h(), 0);
          let amLost = potHazEncountered*maxCostPerHazard
          am -=  amLost - amAdded;
          //console.log({tick: [tick, nextTick], amAdded, amLost, haz: [startHaz, endHaz]});
          tick = nextTick;
        }

        while (am > 0) {
          let haz = Math.floor(tick/ticksPerHazard);
          am -= tick%ticksPerHazard==3 ? hazAmFail - allHazards[haz]() : 1;
          ++tick;
          //console.log({tick, haz, to: allHazards[haz], am});
        }

        //console.log({tick, am});
        var voyTime = tick/ticksPerHour;
        var refillCost = Math.ceil(voyTime*60/dilPerMin);

        if (extend <= numExtends) {
          results[extend].push(tick/ticksPerHour);

          if (extend > 0) {
            resultsRefillCostTotal[extend] += refillCostTotal;
          }
        }

        if (voyTime > selectedTime) {
          resultsSelectedTimeCostTotal += refillCostTotal;
          resultsSelectedTimeRefillsTotal += extend;
          break;
        }

        am = startAm;
        refillCostTotal += refillCost;
        extend++;
      }

      if (iSim > 0 && iSim % 100 == 0)
        reportProgress(formatResults(false));
    } // foreach sim

    return formatResults(true);
  }

  module.exports.getEstimate = getEstimate;
