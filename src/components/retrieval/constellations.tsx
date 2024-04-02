import React from 'react';
import { Label } from 'semantic-ui-react';

import { IConstellation, IPolestar } from './model';
import { RetrievalContext } from './context';

type ConstellationPolestarsProps = {
	constellation: IConstellation;
	polestars: IPolestar[];
	setActiveConstellation?: (constellation: string) => void;
	setActivePolestar?: (polestar: string) => void;
};

// Show chances of acquiring a given set of polestars from a given constellation
export const ConstellationPolestars = (props: ConstellationPolestarsProps) => {
	const { constellation, polestars, setActiveConstellation, setActivePolestar } = props;

	if (polestars.length === 1) {
		return (
			<OneConstellationPolestar
				constellation={constellation} polestar={polestars[0]}
				setActiveConstellation={setActiveConstellation} setActivePolestar={setActivePolestar}
			/>
		);
	}

	return (
		<div key={constellation.symbol} style={{ marginTop: '1em' }}>
			Open the <b><span style={{ cursor: setActiveConstellation ? 'zoom-in' : undefined }} onClick={() => setActiveConstellation && setActiveConstellation(constellation.symbol) }>{constellation.name}</span></b>{` `}
			for a <b>{(polestars.length/constellation.keystones.length*100).toFixed(1)}%</b> chance of acquiring an unowned polestar:{` `}
			<div style={{ marginTop: '.5em', textAlign: 'center' }}>
				<Label.Group>
					{polestars.map((p, pdx) => (
						<Label key={pdx} style={{ cursor: setActivePolestar ? 'zoom-in' : undefined }} onClick={() => setActivePolestar && setActivePolestar(p.symbol)}>
							{p.short_name} <span style={{ fontWeight: 'normal', marginLeft: '1em' }}>({(1/constellation.keystones.length*100).toFixed(1)}%)</span>
						</Label>
					))}
				</Label.Group>
			</div>
			{constellation.owned > 1 && <p>You own {constellation.owned} of this constellation.</p>}
		</div>
	);
};

type PolestarConstellationsProps = {
	polestar: IPolestar;
	setActiveConstellation?: (constellation: string) => void;
	setActivePolestar?: (polestar: string) => void;
};

// Show owned constellations that might yield a given polestar
export const PolestarConstellations = (props: PolestarConstellationsProps) => {
	const { allKeystones } = React.useContext(RetrievalContext);
	const { polestar, setActiveConstellation, setActivePolestar } = props;

	const constellations: IConstellation[] = [];

	const ownedConstellations = allKeystones.filter(k => k.type !== 'keystone' && k.owned > 0) as IConstellation[];
	ownedConstellations.filter(k => k.keystones.includes(polestar.id))
		.forEach(k => {
			for (let i = 0; i < k.owned; i++) {
				const newName = k.owned > 1 ? `${k.short_name} #${i+1}` : k.short_name;
				constellations.push({...k, short_name: newName});
			}
		});

	if (constellations.length === 1) {
		return (
			<OneConstellationPolestar
				constellation={constellations[0]} polestar={polestar}
				setActiveConstellation={setActiveConstellation} setActivePolestar={setActivePolestar}
			/>
		);
	}

	return (
		<div style={{ marginTop: '1em' }}>
			<div>
				Open 1 of the following constellations for a chance at acquiring <Label>{polestar.short_name}</Label>
				<span style={{ whiteSpace: 'nowrap' }}>(open all for a <b>{(polestar.owned_total_odds * 100).toFixed(1)}%</b> chance)</span>:
			</div>
			<ul style={{ columns: 2 }}>
				{constellations.sort((a, b) => 1/b.keystones.length - 1/a.keystones.length).map((k, kdx) => (
					<li key={kdx} style={{ cursor: setActiveConstellation ? 'zoom-in' : undefined }} onClick={() => setActiveConstellation && setActiveConstellation(k.symbol) }>
						<b>{k.short_name}</b> ({(1/k.keystones.length*100).toFixed(1)}%)
					</li>
				))}
			</ul>
		</div>
	);
};

// Show single polestar from single constellation inline
type OneConstellationPolestarProps = {
	constellation: IConstellation;
	polestar: IPolestar;
	setActiveConstellation?: (constellation: string) => void;
	setActivePolestar?: (polestar: string) => void;
};

const OneConstellationPolestar = (props: OneConstellationPolestarProps) => {
	const { constellation, polestar, setActiveConstellation, setActivePolestar } = props;

	return (
		<div style={{ marginTop: '1em' }}>
			Open the{` `}
			{<span style={{ cursor: setActiveConstellation ? 'zoom-in' : undefined }} onClick={() => setActiveConstellation && setActiveConstellation(constellation.symbol) }>
				 <b>{constellation.name}</b>
			 </span>}{` `}
			for a {(1/constellation.keystones.length*100).toFixed(1)}% chance of acquiring{` `}
			<Label style={{ cursor: setActivePolestar ? 'zoom-in' : undefined }} onClick={() => setActivePolestar && setActivePolestar(polestar.symbol)}>
				{polestar.short_name}
			</Label>
		</div>
	);
};
