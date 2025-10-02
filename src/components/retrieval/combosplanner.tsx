import React from 'react';
import { Label } from 'semantic-ui-react';

import { IPolestar } from './model';
import { RetrievalContext } from './context';
import { PolestarConstellations } from './constellations';
import { GlobalContext } from '../../context/globalcontext';

type CombosPlannerProps = {
	uniqueCombos: IPolestar[][];
};

export const CombosPlanner = (props: CombosPlannerProps) => {
	const { uniqueCombos } = props;
	const { t, tfmt } = React.useContext(GlobalContext).localized;

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
			{tfmt('retrieval.combo_needs.unlock_retrieval_by_needed_polestars_fmt', {
				needed_polestars: (
					<Label color='yellow'>
						<span style={{ color: 'black' }}>
							{t('retrieval.combo_needs.needed_polestars')}
						</span>
					</Label>
				)
			})}
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
	const { t, tfmt } = React.useContext(GlobalContext).localized;

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

	function renderUsefulPolestars(): React.JSX.Element {
		return (
			<div style={{ marginTop: '1em' }}>
				{usefulAlone.length > 0 && (
					<React.Fragment>
						<div>
							{tfmt('retrieval.combo_needs.need_exact_n', {
								n: '1',
								y: renderPolestarsInline(usefulAlone)
							})}
						</div>
						{usefulOthers.length > 1 && (
							<div>
								{tfmt('retrieval.combo_needs.or_some_combination', {
									y: renderPolestarsInline(usefulOthers)
								})}
							</div>
						)}
					</React.Fragment>
				)}
				{usefulAlone.length === 0 && (
					<div>
						{tfmt('retrieval.combo_needs.some_combination', {
							y: renderPolestarsInline(usefulOthers)
						})}
					</div>
				)}
			</div>
		);
	}

	function renderPolestarsInline(polestars: IPolestar[]): React.JSX.Element {
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

	function renderUsableConstellations(): React.JSX.Element {
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
