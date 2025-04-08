import React from 'react';
import {
	Grid,
	Popup,
	Table
} from 'semantic-ui-react';

import { GlobalContext } from '../../../context/globalcontext';
import { AvatarView } from '../../item_presenters/avatarview';

import { POPUP_DELAY } from '../utils';

import { LayoutContext, ViewerContext } from './context';
import { Aggregates } from './aggregates';
import { AssignmentCard } from './assignmentcard';
import { CrewFinder } from './crewfinder';

export const GridView = () => {
	const { t } = React.useContext(GlobalContext).localized;
	const { voyageConfig, rosterType, ship, shipData, assignments } = React.useContext(ViewerContext);
	const { layout } = React.useContext(LayoutContext);

	return (
		<React.Fragment>
			{renderShip()}
			{layout === 'grid-cards' &&
				<div>
					<Grid columns={6} doubling centered padded>
						{renderCards()}
					</Grid>
				</div>
			}
			{layout === 'grid-icons' &&
				<Grid columns={12} doubling centered padded>
					{renderIcons()}
				</Grid>
			}

			<div style={{ marginTop: '2em' }}>
				<Aggregates />
			</div>
		</React.Fragment>
	);

	function renderShip(): JSX.Element {
		if (!ship) return (<></>);
		return (
			<Table celled selectable striped unstackable collapsing compact='very' style={{ margin: '0 auto 2em' }}>
				<Table.Body>
					<Table.Row>
						<Table.Cell width={5}>{t('ship.ship')}</Table.Cell>
						<Table.Cell width={8} style={{ fontSize: '1.1em' }}>
							<b>{ship.name}</b>
						</Table.Cell>
						<Table.Cell width={2} className='iconic' style={{ fontSize: '1.1em' }}>
							{/* Ship finder deprecated as it's no longer needed */}
							{/* {voyageConfig.state === 'pending' && rosterType === 'myCrew' &&
								<span style={{ cursor: 'help' }}>
									<Popup content={`On voyage selection screen, tap ${shipData.direction} ${shipData.index} times to select ship`} mouseEnterDelay={POPUP_DELAY} trigger={
										<span style={{ whiteSpace: 'nowrap' }}>
											<Icon name={`arrow ${shipData.direction}` as SemanticICONS} />{shipData.index}
										</span>
									} />
								</span>
							} */}
						</Table.Cell>
						<Table.Cell width={1} className='iconic'>
							{shipData.shipBonus > 0 &&
								<span style={{ cursor: 'help' }}>
									<Popup content={`+${shipData.shipBonus} AM`} mouseEnterDelay={POPUP_DELAY} trigger={<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />} />
								</span>
							}
						</Table.Cell>
					</Table.Row>
				</Table.Body>
			</Table>
		);
	}

	function renderCards(): JSX.Element {
		return (
			<React.Fragment>
				{assignments.map((assignment, idx) => {
					return (
						<Grid.Column key={idx}>
							<AssignmentCard assignment={assignment} showSkills={false} />
						</Grid.Column>
					);
				})}
			</React.Fragment>
		);
	}

	function renderIcons(): JSX.Element {
		return (
			<React.Fragment>
				{assignments.map((assignment, idx) => {
					const { crew, name, trait, bestRank } = assignment;
					return (
						<Grid.Column key={idx}>
							<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', rowGap: '.3em' }}>
								<Popup mouseEnterDelay={POPUP_DELAY} trigger={
									<div style={{ cursor: 'help' }}>
										<AvatarView
											crewBackground='rich'
											mode='crew'
											size={48}
											item={crew}
											partialItem={true}
											ignorePlayer={rosterType !== 'myCrew'}
											hideRarity={rosterType !== 'myCrew'}
										/>
									</div>
								}>
									<Popup.Content>
										<AssignmentCard assignment={assignment} showSkills={true} />
									</Popup.Content>
								</Popup>
								<div style={{ fontSize: '1.1em' }}>
									{voyageConfig.state === 'pending' && <CrewFinder crew={crew} bestRank={bestRank} />}
								</div>
							</div>
						</Grid.Column>
					);
				})}
			</React.Fragment>
		);
	}
};
