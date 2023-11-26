import React from 'react';
import { Icon, Popup } from "semantic-ui-react";

const text = (
  <>
    <p>DataCore now shows STT Power Ratings sourced from the CAB STT Power Ratings website (cabtools.app) maintained by <i>A Traveling Man</i>.</p>
    <p>CAB Power Ratings are a system designed to help rank crew by their overall value, taking into account factors including their voyage power, potential event usage, gauntlet power, collections, and more.</p>
    <p>You can find a detailed description of how the CAB STT Overall Power Rating is calculated on the Power Ratings website.</p>
    <p>DataCore shows both the "overall power rating", which is a decimal number, and the "overall rank", which tells you how a crew's overall power rating compares to other crew of the same rarity.</p>
    <p>Like all ranks and ratings, CAB power ratings should only be considered a guide or tool - how valuable a crew is to a player depends on how much the player values different aspects of the game, and which crew a player already owns.</p>
  </>
);

const CABExplanation = () => (
  <Popup wide trigger={<Icon name="help" />} header={'CAB STT Power Ratings'} content={text}/>
);

export default CABExplanation;
