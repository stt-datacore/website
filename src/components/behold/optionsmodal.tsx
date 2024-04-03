import { OptionsBase, OptionsModal, OptionGroup, OptionsModalProps } from '../../components/base/optionsmodal_base';

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
	state: { isDefault: boolean; isDirty: boolean; options: any; modalIsOpen: boolean; };
	props: any;

    protected getOptionGroups(): OptionGroup[] {
        return [
            {
                title: "Filter by retrieval option:",
                key: 'portal',
                options: BeholdOptionsModal.portalOptions,
                multi: false,
				initialValue: ''
            },
            {
                title: "Filter by series:",
                key: 'series',
                multi: true,
                options: BeholdOptionsModal.seriesOptions,
				initialValue: [] as string[]
            },
            {
                title: "Filter by rarity:",
                key: "rarities",
                multi: true,
                options: BeholdOptionsModal.rarityOptions,
				initialValue: [] as number[]
            }]
    }
    protected getDefaultOptions(): BeholdModalOptions {
        return DEFAULT_BEHOLD_OPTIONS;
    }

	static readonly portalOptions = [
		{ key: 'none', value: '', text: 'Show all crew' },
		{ key: 'portal', value: 'portal', text: 'Only show retrievable crew' },
		{ key: 'portal-unique', value: 'portal-unique', text: 'Only show uniquely retrievable crew' },
		{ key: 'portal-nonunique', value: 'portal-nonunique', text: 'Only show non-uniquely retrievable crew' },
		{ key: 'nonportal', value: 'nonportal', text: 'Only show non-retrievable crew' }
	];

	static readonly seriesOptions = [
		{ key: 'tos', value: 'tos', text: 'The Original Series' },
		{ key: 'tas', value: 'tas', text: 'The Animated Series' },
		{ key: 'tng', value: 'tng', text: 'The Next Generation' },
		{ key: 'ds9', value: 'ds9', text: 'Deep Space Nine' },
		{ key: 'voy', value: 'voy', text: 'Voyager' },
		{ key: 'ent', value: 'ent', text: 'Enterprise' },
		{ key: 'dsc', value: 'dsc', text: 'Discovery' },
		{ key: 'pic', value: 'pic', text: 'Picard' },
		{ key: 'low', value: 'low', text: 'Lower Decks' },
		{ key: 'snw', value: 'snw', text: 'Strange New Worlds' },
		{ key: 'vst', value: 'vst', text: 'Very Short Treks' },
		{ key: 'original', value: 'original', text: 'Timelines Originals' }
	];

	static readonly rarityOptions = [
		{ key: '1*', value: 1, text: '1* Common' },
		{ key: '2*', value: 2, text: '2* Uncommon' },
		{ key: '3*', value: 3, text: '3* Rare' },
		{ key: '4*', value: 4, text: '4* Super Rare' },
		{ key: '5*', value: 5, text: '5* Legendary' }
	];

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