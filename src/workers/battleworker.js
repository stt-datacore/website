/* eslint-disable */
//battleworker.js
import { iterateBattle, IterateBattleConfig } from "./battleworkerutils";

// eslint-disable-next-line no-restricted-globals
self.onmessage = (message) => {
    const postResult = (result, inProgress) => {
        postMessage({ result, inProgress });
        if (!inProgress) self.close();
    };

    if (message.data) {
        const config = message.data;
        const { rate, fbb_mode, input_ship: ship, crew: set, opponent, defense, offense, time, activation_offsets, fixed_delay: fixed_activation_delay, simulate } = config;
        let result = iterateBattle(rate, fbb_mode, ship, set, opponent, defense, offense, time, activation_offsets, fixed_activation_delay, simulate);
        postResult(result, false);
    }    
};
