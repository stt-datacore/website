import React from 'react';
import { OptionsBase, OptionsModal, OptionGroup, ModalOption, OptionsModalProps } from '../base/optionsmodal_base';
import CONFIG from '../CONFIG';
import { ShipAbilityPicker } from '../crewtables/shipoptions';

export interface ShipCrewModalOptions extends OptionsBase {
	rarities: number[];
	abilities: string[];
}

export const DEFAULT_SHIP_OPTIONS = {
	rarities: [],
	abilities: [],
} as ShipCrewModalOptions;

export class ShipCrewOptionsModal extends OptionsModal<ShipCrewModalOptions> {
	protected setAbility(abilities: string[]) {
		let opt = { ... this.state.options } as ShipCrewModalOptions;

		if (!('abilities' in opt) || (JSON.stringify(opt['abilities']) != JSON.stringify(abilities))) {
			opt.abilities = abilities;
			this.setState({ ... this.state, options: opt });
		}
	}

	protected getOptionGroups(): OptionGroup[] {
		const abilityOptions = [] as ModalOption[];
		const { t } = this.context.localized;

		const rarityOptions =
			CONFIG.RARITIES.map((r, i) => {
				if (i === 0) return undefined;
				return { key: `${i}*`, value: i, text: `${i}* ${r.name}` }
			}).filter(f => f !== undefined) as ModalOption[];

		Object.keys(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT).forEach((key, idx) => {
			if (idx >= 9) return;
			abilityOptions.push({
				key: key,
				value: key,
				text: CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[key]
			});
		});

		return [
			{
				title: `${t('hints.filter_by_rarity')}:`,
				key: "rarities",
				multi: true,
				options: rarityOptions,
				initialValue: [] as number[]
			},
			{
				title: `${t('hints.filter_by_ship_ability')}:`,
				key: 'abilities',
				options: abilityOptions,
				multi: false,
				initialValue: [] as number[],
				renderContent: () => <div style={{ margin: "0.5em 0px" }}>
					<ShipAbilityPicker fluid selectedAbilities={this.state.options['abilities'] as string[]} setSelectedAbilities={(a) => this.setAbility(a)} />
				</div>

			}]
	}

	protected getDefaultOptions(): ShipCrewModalOptions {
		return DEFAULT_SHIP_OPTIONS;
	}

	constructor(props: OptionsModalProps<ShipCrewModalOptions>) {
		super(props);

		this.state = {
			isDefault: false,
			isDirty: false,
			options: props.options ?? {},
			modalIsOpen: false,
		}
	}

	protected checkState(): boolean {
		const { options } = this.state;

		const j1 = JSON.stringify(options);
		const j2 = JSON.stringify(this.props.options);
		const j3 = JSON.stringify(this.getDefaultOptions());

		const isDirty = j2 !== j1;
		const isDefault = j1 === j3;

		if (this.state.isDefault != isDefault || this.state.isDirty != isDirty) {
			this.setState({ ... this.state, isDefault, isDirty });
			return true;
		}

		return false;
	}

};
