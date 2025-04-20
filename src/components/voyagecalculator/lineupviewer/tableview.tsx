import React from 'react';
import {
	Button,
	Grid,
	Icon,
	Popup,
	Table
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';
import { GlobalContext } from '../../../context/globalcontext';
import { isQuipped } from '../../../utils/crewutils';

import { AvatarView } from '../../item_presenters/avatarview';
import { renderKwipmentBonus } from '../../item_presenters/item_presenter';

import { getCrewTraitBonus, getCrewEventBonus, POPUP_DELAY } from '../utils';

import { LayoutContext, ViewerContext } from './context';
import { Aggregates } from './aggregates';
import { AssignmentCard, CrewVoyageSkills } from './assignmentcard';
import { CrewFinder } from './crewfinder';
import { loadAndScaleImage } from '../../../utils/misc';

export const TableView = () => {
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES, t } = globalContext.localized;
	const { configSource, voyageConfig, rosterType, ship, assignments, highlightedSkills } = React.useContext(ViewerContext);
	const { layout } = React.useContext(LayoutContext);

	const [assignmentImages, setAssignmentImages] = React.useState({} as { [key: string]: string });

	const compact = layout === 'table-compact';
	const exportKey = `__voyage_table_view_export`;

	const jsx = React.useMemo(() => {
		return renderSkillAssignments(0, true);
	}, [assignmentImages]);

	React.useEffect(() => {
		(async () => {
			const newstuff = {} as { [key: string]: string }
			for (let a of assignments) {
				let imgurl = `${process.env.GATSBY_ASSETS_URL}${a.crew.imageUrlPortrait}`;
				newstuff[a.name] = await loadAndScaleImage(imgurl, 0.2);
			}
			setAssignmentImages(newstuff);
		})();
	}, [assignments]);

	return (
		<>
			<Grid columns={2} stackable>
				<Grid.Column width={compact ? 8 : 9}>
					{renderShip()}
					{[0, 2, 4, 6, 8, 10].map(index => renderSkillAssignments(index))}
				</Grid.Column>
				<Grid.Column width={compact ? 8 : 7} verticalAlign='middle'>
					<Aggregates />
				</Grid.Column>
			</Grid>
			<Popup
				openOnTriggerClick={true}
				openOnTriggerMouseEnter={false}
				closeOnPortalMouseLeave={false}
				openOnTriggerFocus={false}
				trigger={
					<Button style={{ margin: '1em 0' }} onClick={richCopy}>
						<Icon name='clipboard' style={{ margin: '0 0.5em 0 0' }} />
						<span>{t('clipboard.copy')}</span>
					</Button>
				}
				content={t('clipboard.copied_exclaim')}
			/>
			<div id={exportKey} style={{ display: 'none' }}>
				<Aggregates for_export={true} />
				{jsx}
			</div>
		</>
	);

	function richCopy() {
		if (typeof navigator !== 'undefined' && typeof document !== 'undefined') {
			const el = document.getElementById(exportKey);
			if (el) {
				const blob = new Blob([el.innerHTML], { type: 'text/html' });
				navigator.clipboard.write([
					new ClipboardItem({
						[blob.type]: blob
					})
				]);
			}
		}
	}

	function renderShip(): JSX.Element {
		if (!ship) return <></>;
		return (
			<Table fixed selectable striped unstackable compact='very' className={`voyageLineup ${compact ? 'compactView' : ''}`}>
				<Table.Body>
					<Table.Row>
						<Table.Cell width={configSource === 'player' ? 4 : 5}>{t('ship.ship')}</Table.Cell>
						<Table.Cell width={configSource === 'player' ? 6 : 8} style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
							<b>{ship.name}</b>
						</Table.Cell>
						<Table.Cell width={1} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }} />
						<Table.Cell width={2} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
							{ship.traits?.includes(voyageConfig.ship_trait) &&
								<span style={{ cursor: 'help' }}>
									<Popup content='+150 AM' mouseEnterDelay={POPUP_DELAY} trigger={<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />} />
								</span>
							}
						</Table.Cell>
						{configSource === 'player' && (
							<Table.Cell width={3} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
								{/* Ship finder deprecated as it's no longer needed */}
							</Table.Cell>
						)}
					</Table.Row>
				</Table.Body>
			</Table>
		);
	}

	function renderSkillAssignments(index: number, for_export?: boolean): JSX.Element {
		const seated = for_export ? assignments : assignments.slice(index, index + 2);
		return (
			<Table key={index} fixed selectable striped unstackable compact='very' className={`voyageLineup ${compact ? 'compactView' : ''}`}>
				<Table.Body>
					{seated.map((assignment, idx) => {
						const { crew, name, trait, bestRank } = assignment;
						const highlight = (highlightedSkills?.length && highlightedSkills.every(hs => crew?.skill_order?.includes(hs)))
						const imgdata = for_export ? assignmentImages[assignment.name] : undefined;
						return (
							<Table.Row key={idx} style={{
								backgroundColor: !highlight ? undefined : (idx % 2 ? 'forestgreen' : 'darkgreen')
							}}>
								<Table.Cell width={configSource === 'player' ? 4 : 5}>
									<div style={{ whiteSpace: 'nowrap', overflowX: 'hidden', textOverflow: 'ellipsis' }}>
										{name}
									</div>
								</Table.Cell>
								{!for_export && <Table.Cell width={configSource === 'player' ? 6 : 8} style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
									<Popup mouseEnterDelay={POPUP_DELAY} trigger={
										<div style={{ cursor: 'help', display: 'flex', alignItems: 'center', columnGap: '.3em' }}>
											{!compact && (
												<AvatarView
													mode='crew'
													item={crew}
													partialItem={true}
													size={32}
													style={{ verticalAlign: 'middle' }}
													ignorePlayer={rosterType !== 'myCrew'}
													hideRarity={rosterType !== 'myCrew'}
												/>
											)}
											<div style={{ whiteSpace: 'nowrap', overflowX: 'hidden', textOverflow: 'ellipsis' }}>
												<b>{crew.name}</b>{!!highlight && <Icon name='check' style={{ margin: '0 0.5em' }} />}
											</div>
										</div>
									}>
										<Popup.Content>
											<AssignmentCard assignment={assignment} showSkills={true} />
										</Popup.Content>
									</Popup>
								</Table.Cell>}
								{!!for_export &&
									(<React.Fragment>
										{!compact && <Table.Cell>
											<AvatarView
												src={imgdata}
												mode='crew'
												item={crew}
												partialItem={true}
												size={32}
												style={{ verticalAlign: 'middle' }}
												ignorePlayer={rosterType !== 'myCrew'}
												hideRarity={true}
											/>
										</Table.Cell>}
										<Table.Cell>
											<b>{crew.name}</b>{!!highlight && <Icon name='check' style={{ margin: '0 0.5em' }} />}
										</Table.Cell>
										<Table.Cell>
											<CrewVoyageSkills
												crew={crew}
												showProficiency={voyageConfig.voyage_type === 'encounter'}
											/>
										</Table.Cell>
									</React.Fragment>)}
								<Table.Cell width={1} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
									{!for_export && isQuipped(crew) && (
										<Popup wide content={renderKwipmentBonus((crew.kwipment as number[][]).map(q => typeof q === 'number' ? q : q[1]), globalContext.core.items, crew.kwipment_prospects, t)} mouseEnterDelay={POPUP_DELAY} trigger={
											<span style={{ cursor: 'help' }}>
												<img src={`${process.env.GATSBY_ASSETS_URL}atlas/ContinuumUnlock.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
											</span>
										} />
									)}
									{!!for_export && isQuipped(crew) && (
										renderKwipmentBonus((crew.kwipment as number[][]).map(q => typeof q === 'number' ? q : q[1]), globalContext.core.items, crew.kwipment_prospects, t, undefined, true)
									)}
								</Table.Cell>
								<Table.Cell width={2} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
									<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', columnGap: '.5em' }}>
										{renderVPBonus(crew, for_export)}
										{renderTraitBonus(crew, trait, for_export)}
									</div>
								</Table.Cell>
								{!for_export && configSource === 'player' && (
									<Table.Cell width={3} className='iconic' style={{ fontSize: `${compact ? '1em' : '1.1em'}` }}>
										<CrewFinder crew={crew} bestRank={bestRank} />
									</Table.Cell>
								)}
							</Table.Row>
						);
					})}
				</Table.Body>
			</Table>
		);
	}

	function renderTraitBonus(crew: PlayerCrew, trait: string, for_export?: boolean): JSX.Element {
		const traitBonus: number = getCrewTraitBonus(voyageConfig, crew, trait);
		if (traitBonus === 0) return <></>;
		let bonusText: string = '';
		if (traitBonus === 25)
			bonusText = `${TRAIT_NAMES[trait]} +25 AM`;
		else
			bonusText = `+${traitBonus} AM`;
		if (for_export) {
			return <>{bonusText}</>;
		}
		return (
			<Popup content={bonusText} mouseEnterDelay={POPUP_DELAY} trigger={
				<span style={{ cursor: 'help' }}>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
				</span>
			} />
		);
	}

	function renderVPBonus(crew: PlayerCrew, for_export?: boolean): JSX.Element {
		if (voyageConfig.voyage_type !== 'encounter') return <></>;
		const crewVP: number = getCrewEventBonus(voyageConfig, crew);
		if (crewVP === 0) return <></>;
		let bonusText = `+${crewVP} VP`;
		if (for_export) {
			return <>{bonusText}</>
		}
		return (
			<Popup content={bonusText} mouseEnterDelay={POPUP_DELAY} trigger={
				<span style={{ cursor: 'help' }}>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/victory_point_icon.png`} style={{ height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
				</span>
			} />
		);
	}
};
