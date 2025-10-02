import React, { PureComponent } from 'react';
import { Popup } from 'semantic-ui-react';
import TinyColor from 'tinycolor2';

import { Link } from 'gatsby';

import CONFIG from './CONFIG';
import { formatTierLabel } from '../utils/crewutils';
import { PlayerCrew, PlayerData } from '../model/player';
import { CrewMember, EquipmentSlot, Skill } from '../model/crew';
import { BuffStatTable } from '../utils/voyageutils';
import { EquipmentItem } from '../model/equipment';

type VaultCrewProps = {
	playerData?: PlayerData;
	buffs?: BuffStatTable;
	size: number;
	style?: React.CSSProperties;
	crew: PlayerCrew;
	itemsReady: boolean;
	items?: EquipmentItem[];
	allCrew?: CrewMember[];
};

function formatCrewStats(crew: PlayerCrew, playerData?: PlayerData, allCrew?: CrewMember[], buffs?: BuffStatTable): React.JSX.Element {
	let skills = [] as React.JSX.Element[];
	for (let skillName in CONFIG.SKILLS) {
		let skill = crew[skillName];

		if (skill && skill.core && skill.core > 0) {
			let skillShortName = CONFIG.SKILLS_SHORT.find(c => c.name === skillName)?.short;
			skills.push(
				<p key={skillShortName}>
					<span>{skillShortName}</span> <b>{skill.core}</b>{' '}
					<span>
						{' '}
						{skill.min}-{skill.max}
					</span>
				</p>
			);
		}
	}
	return (
		<div>
			<h4>Tier {formatTierLabel(crew)}</h4>
			{skills}
			<Link to={`/crew/${crew.symbol}/`}>Full details</Link>
		</div>
	);
}

class VaultCrew extends PureComponent<VaultCrewProps> {
	render() {
		const { allCrew, playerData, buffs, crew, itemsReady, items } = this.props;
		const SZ = (scale: number) => (this.props.size * scale).toFixed(2);
		let borderColor = new TinyColor(CONFIG.RARITIES[crew.max_rarity].color);

		let star_reward = `${process.env.GATSBY_ASSETS_URL}atlas/star_reward.png`;
		let star_reward_inactive = `${process.env.GATSBY_ASSETS_URL}atlas/star_reward_inactive.png`;

		let iconStyle: React.CSSProperties = {
			display: 'inline-block',
			height: SZ(2.4) + 'em',
			paddingTop: SZ(0.4) + 'em',
			paddingRight: SZ(0.4) + 'em'
		};

		let rarity = [] as React.JSX.Element[];
		for (let i = 0; i < crew.rarity; i++) {
			rarity.push(<img key={i} src={star_reward} style={iconStyle} />);
		}
		for (let i = crew.rarity; i < crew.max_rarity; i++) {
			rarity.push(<img key={i} src={star_reward_inactive} style={iconStyle} />);
		}

		let skillicons = [] as React.JSX.Element[];
		let skills_sorted: [string, Skill][] = Object.entries(crew.base_skills)
			.sort((a, b) => (a[1] as Skill).core - (b[1] as Skill).core);
		skills_sorted.forEach((s) => {
			let skillName = s[0];
			skillicons.push(<img key={skillName} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skillName}.png`} style={iconStyle} />);
		});

		let divStyle: React.CSSProperties = this.props.style || {};
		divStyle.display = 'grid';
		divStyle.width = SZ(22) + 'em';
		divStyle.height = SZ(20) + 'em';
		divStyle.gridTemplateColumns = `${SZ(16)}em ${SZ(6)}em`;
		divStyle.gridTemplateRows = `${SZ(16)}em ${SZ(4)}em`;
		divStyle.gridTemplateAreas = "'portrait equipment' 'footer footer'";
		divStyle.borderWidth = SZ(0.2) + 'em';
		divStyle.borderRadius = SZ(0.2) + 'em';
		divStyle.borderStyle = 'solid';
		divStyle.borderColor = borderColor.toHexString();
		divStyle.backgroundColor = borderColor
			.clone()
			.darken(50)
			.toHexString();

		let equipmentColumnStyle: React.CSSProperties = {
			gridArea: 'equipment',
			display: 'grid',
			textAlign: 'center',
			gridTemplateRows: 'repeat(4, 1fr)',
			margin: SZ(0.2) + 'em',
			gap: SZ(0.1) + 'em'
		};

		let equipmentCellImg: React.CSSProperties = {
			height: SZ(3) + 'em',
			borderWidth: SZ(0.2) + 'em',
			borderStyle: 'solid',
			borderColor: borderColor.toHexString(),
			borderRadius: SZ(0.4) + 'em'
		};

		let cardFooter: React.CSSProperties = {
			gridArea: 'footer',
			display: 'grid',
			gridTemplateColumns: '1fr 1fr',
			backgroundColor: borderColor
				.clone()
				.darken(40)
				.toHexString(),
			padding: SZ(0.4) + 'em',
			width: '98%',
			height: '90%'
		};

		let cardFooterSkills: React.CSSProperties = {
			justifySelf: 'start',
			backgroundColor: borderColor
				.clone()
				.darken(50)
				.toHexString(),
			padding: SZ(0.1) + 'em'
		};

		let cardFooterLevel: React.CSSProperties = {
			justifySelf: 'end',
			backgroundColor: borderColor
				.clone()
				.darken(50)
				.toHexString(),
			padding: SZ(0.1) + 'em',
			fontSize: SZ(2.2) + 'em',
			color: 'white',
			display: 'flex'
		};

		// Dec levels can be either end of one equip range or start of the next (e.g. lvl 20 is 10-20 or 20-30)
		//	Assume at the start of next range unless has multiple equips
		let startlevel = Math.floor(crew.level / 10) * 4;
		if (crew.level % 10 == 0 && crew.equipment.length > 1) startlevel = startlevel - 4;
		let eqimgs = [] as string[];
		if (!crew.equipment_slots[startlevel] || !itemsReady) {
			//console.error(`Missing equipment slots information for crew '${crew.name}'`);
			//console.log(crew);
			eqimgs = [
				'items_equipment_box02_icon.png',
				'items_equipment_box02_icon.png',
				'items_equipment_box02_icon.png',
				'items_equipment_box02_icon.png'
			];
		} else {
			for (let i = startlevel; i < startlevel + 4; i++) {
				let found = items?.find((item) => item.symbol === crew.equipment_slots[i].symbol);
				if (found) {
					crew.equipment_slots[i] ??= {} as EquipmentSlot;
					crew.equipment_slots[i].imageUrl = found.imageUrl;
				}
			}
			eqimgs = [
				crew.equipment_slots[startlevel].imageUrl ?? "",
				crew.equipment_slots[startlevel + 1].imageUrl ?? "",
				crew.equipment_slots[startlevel + 2].imageUrl ?? "",
				crew.equipment_slots[startlevel + 3].imageUrl ?? ""
			];
		}

		if (crew.equipment) {
			[0, 1, 2, 3].forEach(idx => {
				if ((crew.equipment as number[]).indexOf(idx) < 0) {
					eqimgs[idx] = 'items_equipment_box02_icon.png';
				}
			});
		}

		let portraitDivStyle: React.CSSProperties = {
			gridArea: 'portrait',
			position: 'relative'
		};

		if (crew.immortal > 0 || (crew.rarity === crew.max_rarity && crew.level === 100 && crew.equipment.length === 4)) {
			// For immortalized crew only
			portraitDivStyle.backgroundSize = 'cover';
			portraitDivStyle.backgroundImage = `url(${process.env.GATSBY_ASSETS_URL}collection_vault_vault_item_bg_immortalized_256.png)`;
		}

		return (
			<div style={divStyle}>
				<div style={portraitDivStyle}>
					<Popup
						on="click"
						header={crew.name}
						content={formatCrewStats(crew, playerData, allCrew, buffs)}
						trigger={<img src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} style={{ width: '100%' }} />}
					/>

					<div
						style={{
							position: 'absolute',
							bottom: '0px',
							width: '100%',
							textAlign: 'initial',
							backgroundColor: 'rgba(0, 0, 0, 0.5)'
						}}
					>
						{rarity}
					</div>
					{crew.immortal > 0 && (
						<div
							style={{
								position: 'absolute',
								top: '0px',
								width: '100%',
								textAlign: 'initial',
								backgroundColor: 'rgba(0, 0, 0, 0.5)',
								fontSize: SZ(1.2) + 'em'
							}}
						>
							Frozen: {crew.immortal} in vault
						</div>
					)}
				</div>

				<div style={equipmentColumnStyle}>
					<div style={{ display: 'inline-block' }}>
						<img style={equipmentCellImg} src={`${process.env.GATSBY_ASSETS_URL}${eqimgs[0]}`} />
					</div>
					<div style={{ display: 'inline-block' }}>
						<img style={equipmentCellImg} src={`${process.env.GATSBY_ASSETS_URL}${eqimgs[1]}`} />
					</div>
					<div style={{ display: 'inline-block' }}>
						<img style={equipmentCellImg} src={`${process.env.GATSBY_ASSETS_URL}${eqimgs[2]}`} />
					</div>
					<div style={{ display: 'inline-block' }}>
						<img style={equipmentCellImg} src={`${process.env.GATSBY_ASSETS_URL}${eqimgs[3]}`} />
					</div>
				</div>

				<div style={cardFooter}>
					<div style={cardFooterSkills}>
						<span>{skillicons}</span>
					</div>

					<div style={cardFooterLevel}>
						<span style={{ margin: 'auto' }}>{crew.level}</span>
					</div>
				</div>
			</div>
		);
	}
}

export default VaultCrew;
