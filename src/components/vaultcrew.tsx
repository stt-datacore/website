import React, { PureComponent } from 'react';

import CONFIG from './CONFIG';

import * as TinyColor from 'tinycolor2';

type VaultCrewProps = {
	size: number;
	style?: React.CSSProperties;
	crew: any;
};

class VaultCrew extends PureComponent<VaultCrewProps> {
	render() {
		const SZ = (scale: number) => (this.props.size * scale).toFixed(2);
		let borderColor = new TinyColor(CONFIG.RARITIES[this.props.crew.max_rarity].color);

		let star_reward = `/media/icons/star_reward.png`;
		let star_reward_inactive = `/media/icons/star_reward_inactive.png`;

		let iconStyle: React.CSSProperties = {
			display: 'inline-block',
			height: SZ(2.4) + 'em',
			paddingTop: SZ(0.4) + 'em',
			paddingRight: SZ(0.4) + 'em'
		};

		let rarity = [];
		for (let i = 0; i < this.props.crew.rarity; i++) {
			rarity.push(<img key={i} src={star_reward} style={iconStyle} />);
		}
		for (let i = this.props.crew.rarity; i < this.props.crew.max_rarity; i++) {
			rarity.push(<img key={i} src={star_reward_inactive} style={iconStyle} />);
		}

		let skillicons = [];
		for (let skillName in CONFIG.SKILLS) {
			let skill = this.props.crew.base_skills[skillName];

			if (skill && skill.core && skill.core > 0) {
				skillicons.push(<img key={skillName} src={`media/assets/atlas/icon_${skillName}.png`} style={iconStyle} />);
			}
		}

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

		let startlevel = this.props.crew.level === 100 ? 36 : Math.ceil(this.props.crew.level / 10) * 4;

		let eqimgs = [
			this.props.crew.equipment_slots[startlevel].imageUrl,
			this.props.crew.equipment_slots[startlevel + 1].imageUrl,
			this.props.crew.equipment_slots[startlevel + 2].imageUrl,
			this.props.crew.equipment_slots[startlevel + 3].imageUrl
		];

		if (this.props.crew.equipment) {
			[0, 1, 2, 3].forEach(idx => {
				if (this.props.crew.equipment.indexOf(idx) < 0) {
					eqimgs[idx] = 'items_equipment_box02_icon.png';
				}
			});
		}

		return (
			<div style={divStyle}>
				<div
					style={{
						gridArea: 'portrait',
						position: 'relative',
						backgroundSize: 'cover',
						backgroundImage: 'url("media/assets/collection_vault_vault_item_bg_immortalized_256.png")'
					}}>
					<img src={`/media/assets/${this.props.crew.imageUrlPortrait}`} style={{ width: '100%' }} />
					<div
						style={{
							position: 'absolute',
							bottom: '0px',
							width: '100%',
							textAlign: 'initial',
							backgroundColor: 'rgba(0, 0, 0, 0.5)'
						}}>
						{rarity}
					</div>
                    {(this.props.crew.immortal > 0) && <div
						style={{
							position: 'absolute',
							top: '0px',
							width: '100%',
							textAlign: 'initial',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            fontSize: SZ(1.2) + 'em'
						}}>
						Frozen: {this.props.crew.immortal} in vault
					</div>}
				</div>

				<div style={equipmentColumnStyle}>
					<div style={{ display: 'inline-block' }}>
						<img style={equipmentCellImg} src={`media/assets/${eqimgs[0]}`} />
					</div>
					<div style={{ display: 'inline-block' }}>
						<img style={equipmentCellImg} src={`media/assets/${eqimgs[1]}`} />
					</div>
					<div style={{ display: 'inline-block' }}>
						<img style={equipmentCellImg} src={`media/assets/${eqimgs[2]}`} />
					</div>
					<div style={{ display: 'inline-block' }}>
						<img style={equipmentCellImg} src={`media/assets/${eqimgs[3]}`} />
					</div>
				</div>

				<div style={cardFooter}>
					<div style={cardFooterSkills}>
						<span>{skillicons}</span>
					</div>

					<div style={cardFooterLevel}>
						<span style={{ margin: 'auto' }}>{this.props.crew.level}</span>
					</div>
				</div>
			</div>
		);
	}
}

export default VaultCrew;
