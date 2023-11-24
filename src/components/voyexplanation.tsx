import React from 'react';
import { Icon, Popup } from "semantic-ui-react";

const text = (
  <>
    <p>Click any value in this column to automatically filter by the skill order of the selected crew.</p>
  </>
);

const VoyageExplanation = () => (
  <Popup wide trigger={<Icon name="help" />} header={'Voyage and Triplet Ratings'} content={text}/>
);

export default VoyageExplanation;
