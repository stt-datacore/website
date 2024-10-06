import React from 'react';
import { DropdownItemProps } from 'semantic-ui-react';
import { OptionsBase, OptionsModal, OptionGroup, OptionsModalProps, ModalOption } from '../../components/base/optionsmodal_base';
import CONFIG from '../CONFIG';
import { GlobalContext } from '../../context/globalcontext';
import { TranslateMethod } from '../../model/player';

export interface BeholdModalOptions extends OptionsBase {
	portal: string;
	series: string[];
	rarities: number[];
}

export const DEFAULT_BEHOLD_OPTIONS = {
	portal: '',
	series: [],
	rarities: []
} as BeholdModalOptions;

export class BeholdOptionsModal extends OptionsModal<BeholdModalOptions> {
	static contextType = GlobalContext;
	declare context: React.ContextType<typeof GlobalContext>;
	state: { isDefault: boolean; isDirty: boolean; options: any; modalIsOpen: boolean; };
	declare props: any;

    protected getOptionGroups(): OptionGroup[] {
		const { t } = this.context.localized;

		const rarityOptions =
			CONFIG.RARITIES.map((r, i) => {
				if (i === 0) return undefined;
				return  { key: `${i}*`, value: i, text: `${i}* ${r.name}` }
			}).filter(f => f !== undefined) as ModalOption[];

		const portalOptions = [
			{ key: 'none', value: '', text: t('options.portal_status.none') },
			{ key: 'portal', value: 'portal', text: t('options.portal_status.retrievable') },
			{ key: 'portal-unique', value: 'portal-unique', text: t('options.portal_status.uniquely_retrievable') },
			{ key: 'portal-nonunique', value: 'portal-nonunique', text: t('options.portal_status.not_uniquely_retrievable') },
			{ key: 'nonportal', value: 'nonportal', text: t('options.portal_status.not_retrievable') }
		];

		const seriesOptions = [
			{ key: 'tos', value: 'tos', text: t('series.tos') },
			{ key: 'tas', value: 'tas', text: t('series.tas') },
			{ key: 'tng', value: 'tng', text: t('series.tng') },
			{ key: 'ds9', value: 'ds9', text: t('series.ds9') },
			{ key: 'voy', value: 'voy', text: t('series.voy') },
			{ key: 'ent', value: 'ent', text: t('series.ent') },
			{ key: 'dsc', value: 'dsc', text: t('series.dsc') },
			{ key: 'pic', value: 'pic', text: t('series.pic') },
			{ key: 'low', value: 'low', text: t('series.low') },
			{ key: 'snw', value: 'snw', text: t('series.snw') },
			{ key: 'vst', value: 'vst', text: t('series.vst') },
			{ key: 'original', value: 'original', text: t('series.original') },
		];

        return [
            {
                title: `${t('hints.filter_by_portal_status')}:`,
                key: 'portal',
                options: portalOptions,
                multi: false,
				initialValue: ''
            },
            {
                title: `${t('hints.filter_by_series')}:`,
                key: 'series',
                multi: true,
                options: seriesOptions,
				initialValue: [] as string[]
            },
            {
                title: `${t('hints.filter_by_rarity')}:`,
                key: "rarities",
                multi: true,
                options: rarityOptions,
				initialValue: [] as number[]
            }]
    }

    protected getDefaultOptions(): BeholdModalOptions {
        return DEFAULT_BEHOLD_OPTIONS;
    }

	constructor(props: OptionsModalProps<BeholdModalOptions>) {
		super(props);

		this.state = {
			isDefault: false,
			isDirty: false,
			options: props.options,
			modalIsOpen: false
		}
	}

	protected checkState(): boolean {
		const { options } = this.state;

		const isDefault = options.portal === '' && options.series.length === 0 && options.rarities.length === 0;
		const isDirty = options.portal !== ''
			|| options.series.length !== this.props.options.series.length || !this.props.options.series.every(s => options.series.includes(s))
			|| options.rarities.length !== this.props.options.rarities.length || !this.props.options.rarities.every(r => options.rarities.includes(r));

		if (this.state.isDefault !== isDefault || this.state.isDirty !== isDirty) {
			this.setState({ ...this.state, isDefault, isDirty });
			return true;
		}

		return false;
	}

};