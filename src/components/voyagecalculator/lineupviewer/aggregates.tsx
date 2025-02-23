import React from 'react';
import {
	Icon,
	Popup,
	Table
} from 'semantic-ui-react';

import { GlobalContext } from '../../../context/globalcontext';
import CONFIG from '../../CONFIG';
import { POPUP_DELAY, voySkillScore } from '../utils';
import { LayoutContext, ViewerContext } from './context';

export const Aggregates = () => {
	const { t } = React.useContext(GlobalContext).localized;
	const { voyageConfig, ship, shipData } = React.useContext(ViewerContext);
	const { layout } = React.useContext(LayoutContext);
	const landscape = layout === 'grid-cards' || layout === 'grid-icons';

	return (
		<React.Fragment>
			{!landscape &&
				<React.Fragment>
					<div style={{ marginBottom: '1em' }}>
						<div style={{margin:'auto'}}>
							{renderCrewBonusesTable()}
						</div>
					</div>
					{renderAggregateTable(['command_skill', 'diplomacy_skill', 'engineering_skill', 'security_skill', 'medicine_skill', 'science_skill'])}
				</React.Fragment>
			}
			{landscape &&
				<div style={{ textAlign: 'center' }}>
					<div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2em' }}>
						<div>
							{renderCrewBonusesTable()}
						</div>
						{renderAggregateTable(['command_skill', 'diplomacy_skill', 'engineering_skill'])}
						{renderAggregateTable(['security_skill', 'medicine_skill', 'science_skill'])}
					</div>
				</div>
			}
		</React.Fragment>
	);

	function renderCrewBonusesTable(): JSX.Element {
		return (
			<Table collapsing celled selectable striped unstackable compact='very' style={{ margin: '0 auto' }}>
				<Table.Body>
					{renderAntimatterRow()}
				</Table.Body>
			</Table>
		);
	}

	function renderAntimatterRow(): JSX.Element {
		return (
			<Table.Row>
				<Table.Cell>{t('ship.antimatter')}</Table.Cell>
				<Table.Cell className='iconic' style={{width: '2.2em'}}>&nbsp;</Table.Cell>
				<Table.Cell style={{ textAlign: 'right', fontSize: '1.1em' }}>
					{ship && (
						<Popup mouseEnterDelay={POPUP_DELAY} trigger={<span style={{ cursor: 'help', fontWeight: 'bolder' }}>{voyageConfig.max_hp}</span>}>
							<Popup.Content>
								{ship.antimatter} ({t('voyage.lineup.level_n_ship', { n: ship.level.toString() })})
								<br />+{shipData.shipBonus} ({t('voyage.lineup.ship_trait_bonus')})
								<br />+{shipData.crewBonus} ({t('voyage.lineup.crew_trait_bonuses')})
							</Popup.Content>
						</Popup>
					)}
					{!ship && <span>{voyageConfig.max_hp}</span>}
				</Table.Cell>
				<Table.Cell className='iconic' textAlign='center'>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em' }} className='invertibleIcon' />
				</Table.Cell>
			</Table.Row>
		);
	}

	function renderAggregateTable(skills: string[]): JSX.Element {
		return (
			<Table collapsing celled selectable striped unstackable compact='very' style={{ margin: '0 auto' }}>
				<Table.Body>
					{skills.map((entry, idx) => {
						const agg = voyageConfig.skill_aggregates[entry];
						// Running voyage (i.e. Voyage)
						if (typeof(agg) === 'number') {
							return (
								<Table.Row key={idx}>
									<Table.Cell>{CONFIG.SKILLS[entry]}</Table.Cell>
									<Table.Cell></Table.Cell>
									<Table.Cell style={{ textAlign: 'right', fontSize: '1.1em' }}>
										<b>{Math.round(agg)}</b>
									</Table.Cell>
									<Table.Cell className='iconic' textAlign='center'>
										<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${entry}.png`} style={{ height: '1em', verticalAlign: 'middle' }} />
									</Table.Cell>
								</Table.Row>
							);
						// Calculated voyage (i.e. IVoyageCalcConfig)
						} else {
							const score = Math.floor(voySkillScore(agg));
							return (
								<Table.Row key={idx}>
									<Table.Cell>{CONFIG.SKILLS[entry]}</Table.Cell>
									<Table.Cell className='iconic'>
										{voyageConfig.skills.primary_skill === entry && <Icon name='star' color='yellow' />}
										{voyageConfig.skills.secondary_skill === entry && <Icon name='star' color='grey' />}
									</Table.Cell>
									<Table.Cell style={{ textAlign: 'right', fontSize: '1.1em' }}>
										<span style={{ fontWeight: 'bolder' }}>
											{score}
										</span>
									</Table.Cell>
									<Table.Cell className='iconic' textAlign='center'>
										<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${entry}.png`} style={{ height: '1em', verticalAlign: 'middle' }} />
									</Table.Cell>
								</Table.Row>
							);
						}
					})}
				</Table.Body>
			</Table>
		);
	}
};
