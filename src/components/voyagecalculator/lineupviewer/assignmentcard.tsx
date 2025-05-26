import React from 'react';
import {
	Card,
	Icon,
	Label,
	Popup
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';
import { GlobalContext } from '../../../context/globalcontext';
import { isQuipped } from '../../../utils/crewutils';

import CONFIG from '../../CONFIG';
import { AvatarView } from '../../item_presenters/avatarview';
import { renderKwipmentBonus } from '../../item_presenters/item_presenter';

import { getCrewTraitBonus, getCrewEventBonus, POPUP_DELAY, voySkillScore } from '../utils';

import { IAssignment } from './model';
import { ViewerContext } from './context';
import { CrewFinder } from './crewfinder';
import { QuipmentPopover } from '../quipment/quipmentpopover';

export type AssignmentCardProps = {
	assignment: IAssignment;
	showSkills: boolean;
};

export const AssignmentCard = (props: AssignmentCardProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { TRAIT_NAMES, t } = globalContext.localized;
	const { voyageConfig, rosterType, highlightedSkills } = React.useContext(ViewerContext);
	const { assignment: { crew, name, trait, bestRank }, showSkills } = props;

	const highlight = (highlightedSkills?.length && highlightedSkills.every(hs => crew?.skill_order?.includes(hs)))

	return (
		<Card style={{
				padding: '.5em',
				textAlign: 'center',
				height: 'calc(100% + 1em)',
				//minHeight: language === 'en' ? '100%' : 'calc(96px + 9em)',
			}}>
			{(voyageConfig.state === 'pending' && (bestRank || crew.immortal > 0 || crew.active_status > 0)) &&
				<Label corner='right' style={{ fontSize: '1.1em', textAlign: 'right', padding: '.4em .4em 0 0' }}>
					<CrewFinder crew={crew} bestRank={bestRank} />
				</Label>
			}
			<div style={{ margin: '0 auto' }}>
				<AvatarView
					mode='crew'
					crewBackground='rich'
					targetGroup='voyageLineupHover'
					item={crew}
					partialItem={voyageConfig.state === 'pending'}
					size={96}
					ignorePlayer={rosterType !== 'myCrew'}
					hideRarity={rosterType !== 'myCrew'}
				/>
			</div>
			<div style={{ marginBottom: '2em' }}>
				<div style={{ fontSize: '1.1em', fontWeight: 'bolder' }}>
					<Popup mouseEnterDelay={POPUP_DELAY} trigger={<span style={{ cursor: 'help' }}>{crew.name}</span>}>
						<Popup.Content>
							<CrewVoyageSkills
								crew={crew}
								showProficiency={voyageConfig.voyage_type === 'encounter'}
							/>
						</Popup.Content>
					</Popup>
				</div>
				<div style={{display: 'flex', flexDirection: 'row', alignItems: "center", justifyContent: 'center', gap: '1em'}}>
					{isQuipped(crew) && (
						<div style={{paddingBottom: "0.1em"}}>
							<QuipmentPopover crew={crew} />
						</div>
					)}
					{renderCrewVP()}
					{renderTraitBonus()}
				</div>
				{renderCritTraitBonus()}
				{showSkills && (
					<CrewVoyageSkills
						crew={crew}
						showProficiency={voyageConfig.voyage_type === 'encounter'}
					/>
				)}
			</div>
			<Label attached='bottom'
				style={{
					whiteSpace: 'wrap',
					overflow: 'wrap',
					backgroundColor: !highlight ? undefined : 'forestgreen'
				}}>
				{name}
			</Label>
			{!!highlight &&
			<Label corner='left'>
			<Icon name='check' style={{margin: '0'}} />
			</Label>
			}

		</Card>
	);

	function renderCrewVP(): JSX.Element {
		const crewVP: number = getCrewEventBonus(voyageConfig, crew);
		if (crewVP === 0) return <></>;
		return (
			<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '.3em', flexWrap: 'nowrap' }}>
				<span>+{t('global.n_%', { n: crewVP * 100 })}</span>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/victory_point_icon.png`} style={{ height: '1em' }} className='invertibleIcon' />
			</div>
		);
	}

	function renderTraitBonus(): JSX.Element {
		const traitBonus: number = getCrewTraitBonus(voyageConfig, crew, trait);
		if (traitBonus === 0) return <></>;
		if (traitBonus === 25) {
			return (
				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '.5em' }}>
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em' }} className='invertibleIcon' />
					<span>{TRAIT_NAMES[trait]}</span>
				</div>
			);
		}
		return (
			<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '.3em' }}>
				<span>+{traitBonus}</span>
				<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_antimatter.png`} style={{ height: '1em' }} className='invertibleIcon' />
			</div>
		);
	}

	function renderCritTraitBonus(): JSX.Element {
		if (voyageConfig.voyage_type === 'encounter' && 'event_content' in voyageConfig) {
			let traits = crew.traits.filter(f => voyageConfig.event_content?.encounter_traits?.includes(f));
			if (traits?.length) {
				return (
					<div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '.5em' }}>
						<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_shipability_overcharge.png`} style={{ height: '1em' }} className='invertibleIcon' />
						<span>{traits?.map(trait => TRAIT_NAMES[trait]).join(", ")}</span>
					</div>
				)
			}
		}
		return <></>
	}
};

type CrewVoyageSkillsProps = {
	crew: PlayerCrew;
	showProficiency: boolean;
};

export const CrewVoyageSkills = (props: CrewVoyageSkillsProps) => {
	const { crew, showProficiency } = props;
	if (!('skills' in crew)) return <></>;
	return (
		<React.Fragment>
			{Object.keys(crew.skills).map(skill =>
				<Label key={skill}>
					{CONFIG.SKILLS_SHORT.find(c => c.name === skill)?.short}{` `}
					<b>{Math.floor(voySkillScore(crew.skills[skill]))}</b>
					{showProficiency && (
						<React.Fragment>
							{` `}({crew.skills[skill].range_min}-{crew.skills[skill].range_max})
						</React.Fragment>
					)}
				</Label>
			)}
		</React.Fragment>
	);
};
