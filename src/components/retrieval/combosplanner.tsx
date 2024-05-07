import React from 'react';
import { Label } from 'semantic-ui-react';

import { IPolestar } from './model';
import { RetrievalContext } from './context';
import { PolestarConstellations } from './constellations';

type CombosPlannerProps = {
	uniqueCombos: IPolestar[][];
};

export const CombosPlanner = (props: CombosPlannerProps) => {
	const { uniqueCombos } = props;

	const neededIdSets: number[][] = [];
	uniqueCombos.forEach(combo => {
		const neededIds = combo.filter(polestar => polestar.owned === 0).map(polestar => polestar.id);
		if (!neededIdSets.find(ns => ns.length === neededIds.length && ns.every(neededId => neededIds.includes(neededId))))
		neededIdSets.push(neededIds);
	});

	const usefulAloneIds: number[] = neededIdSets.filter(ns => ns.length === 1).map(ns => ns[0]);
	const usefulOtherIds: number[] = [];
	neededIdSets.forEach(ns => {
		if (ns.length > 1) {
			if (ns.every(neededId => !usefulAloneIds.includes(neededId))) {
				ns.forEach(neededId => {
					if (!usefulOtherIds.includes(neededId))
						usefulOtherIds.push(neededId);
				});
			}
		}
	});

	if (usefulAloneIds.length === 0 && usefulOtherIds.length === 0)
		return <></>;

	return (
		<React.Fragment>
			Unlock retrieval options for this crew by acquiring 1 or more <Label color='yellow'>needed polestars</Label>
			<UsefulPolestars usefulAloneIds={usefulAloneIds} usefulOtherIds={usefulOtherIds} />
		</React.Fragment>
	);
};

type UsefulPolestarsProps = {
	usefulAloneIds: number[];
	usefulOtherIds: number[];
};

// Useful polestars are all unowned polestar that unlock retrievals by themselves (i.e. usefulAlone)
//	or other unowned polestars that together unlock retrievals WITHOUT also relying on a usefulAlone polestar
const UsefulPolestars = (props: UsefulPolestarsProps) => {
	const { allKeystones } = React.useContext(RetrievalContext);
	const { usefulAloneIds, usefulOtherIds } = props;

	if (usefulAloneIds.length === 0 && usefulOtherIds.length === 0) return <></>;

	const allPolestars = allKeystones.filter(k => k.type === 'keystone') as IPolestar[];
	const usefulAlone = allPolestars.filter(polestar => usefulAloneIds.includes(polestar.id));
	const usefulOthers = allPolestars.filter(polestar => usefulOtherIds.includes(polestar.id)); // Should either be 0 or 2+

	return (
		<React.Fragment>
			{renderUsefulPolestars()}
			{renderUsableConstellations()}
		</React.Fragment>
	);

	function renderUsefulPolestars(): JSX.Element {
		return (
			<div style={{ marginTop: '1em' }}>
				{usefulAlone.length > 0 && (
					<React.Fragment>
						<div>You need <b>exactly 1</b> of the following: {renderPolestarsInline(usefulAlone)}</div>
						{usefulOthers.length > 1 && (
							<div>Or <b>some combination</b> of the following: {renderPolestarsInline(usefulOthers)}</div>
						)}
					</React.Fragment>
				)}
				{usefulAlone.length === 0 && (
					<div>You need <b>some combination</b> of the following: {renderPolestarsInline(usefulOthers)}</div>
				)}
			</div>
		);
	}

	function renderPolestarsInline(polestars: IPolestar[]): JSX.Element {
		if (polestars.length === 1)
			return <Label>{polestars[0].short_name}</Label>;

		return (
			<div style={{ marginTop: '.5em', textAlign: 'center' }}>
				<Label.Group>
					{polestars.map((p, pdx) => (
						<Label key={pdx}>
							{p.short_name}
						</Label>
					))}
				</Label.Group>
			</div>
		);
	}

	function renderUsableConstellations(): JSX.Element {
		const usablePolestars = allPolestars.filter(polestar => polestar.owned_crate_count > 0 &&
			(usefulAloneIds.includes(polestar.id) || usefulOtherIds.includes(polestar.id)));
		if (usablePolestars.length === 0) return <></>;

		return (
			<div style={{ marginTop: '1em' }}>
				{usablePolestars.sort((a, b) => {
					if (b.owned_total_odds === a.owned_total_odds)
						return b.owned_best_odds - a.owned_best_odds;
					return b.owned_total_odds - a.owned_total_odds;
				}).map(p =>
					<PolestarConstellations key={p.symbol} polestar={p} />
				)}
			</div>
		);
	}
};
