import React from 'react';
import { Header, Grid, Rating, Divider, Message, Button } from 'semantic-ui-react';
import { Link, navigate } from 'gatsby';
import marked, { options } from 'marked';

import Layout from '../components/layout';
import CrewPicker from '../components/crewpicker';
import CommonCrewData from '../components/commoncrewdata';

import { getStoredItem } from '../utils/storage';
import { CrewMember } from '../model/crew';
import { PlayerCrew, PlayerData } from '../model/player';
import { ICrewDemands, ICrewDemandsMeta } from '../utils/equipment';
import { MarkdownRemark } from '../model/game-elements';
import { PlayerContext } from '../context/playercontext';
import { DataContext } from '../context/datacontext';
import { MergedContext } from '../context/mergedcontext';
import { crewCopy } from '../utils/crewutils';
import { OptionsBase, OptionsModal, OptionGroup, OptionsModalProps } from '../components/base/optionsmodal_base';

type BeholdsPageProps = {
	location: any;
};

const BeholdsPage = (props: BeholdsPageProps) => {
	const coreData = React.useContext(DataContext);
	const playerContext = React.useContext(PlayerContext);	

	const { crew: allCrew } = coreData;
	const { strippedPlayerData } = playerContext;
	const isReady = coreData.ready(['crew', 'items', 'all_buffs']);

	return (
		<Layout title='Behold helper'>
			{!isReady &&
				<div className='ui medium centered text active inline loader'>Loading data...</div>
			}
			{isReady &&
				<React.Fragment>
					<MergedContext.Provider value={{
						allCrew,
						playerData: strippedPlayerData ?? {} as PlayerData,
						items: coreData.items
					}}>
						<Header as='h2'>Behold helper</Header>
						<CrewSelector crewList={allCrew} />
					</MergedContext.Provider>
				</React.Fragment>
			}
		</Layout>
	);
};

const CrewSelector = (props: { crewList: PlayerCrew[] }) => {
	const [selectedCrew, setSelectedCrew] = React.useState<string[]>([]);
	const [options, setOptions] = React.useState<BeholdModalOptions>(DEFAULT_BEHOLD_OPTIONS);

	const crewList = crewCopy<PlayerCrew>(props.crewList)
		.sort((a, b) => a.name.localeCompare(b.name));

	const filterCrew = (data: (PlayerCrew | CrewMember)[], searchFilter?: string): (PlayerCrew | CrewMember)[] => {
		const myFilter = searchFilter ??= '';

		// Filtering	
		const portalFilter = (crew: PlayerCrew | CrewMember) => {
			if (options.portal.substr(0, 6) === 'portal' && !crew.in_portal) return false;
			if (options.portal === 'portal-unique' && (crew.unique_polestar_combos?.length ?? 0) === 0) return false;
			if (options.portal === 'portal-nonunique' && (crew.unique_polestar_combos?.length ?? 0) > 0) return false;
			if (options.portal === 'nonportal' && crew.in_portal) return false;
			return true;
		};
		const query = (input: string) => input.toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(myFilter.toLowerCase().replace(/[^a-z0-9]/g, '')) >= 0;
		data = data.filter(crew =>
			true
				&& crew.series
				&& (options.portal === '' || portalFilter(crew))
				&& (options.series.length === 0 || options.series.includes(crew.series))
				&& (options.rarities.length === 0 || options.rarities.includes(crew.max_rarity))
				&& (searchFilter === '' || (query(crew.name) || query(crew.short_name)))
		);

		return data;
	}

	return (
		<React.Fragment>
			<CrewPicker defaultOptions={DEFAULT_BEHOLD_OPTIONS} filterCrew={filterCrew} pickerModal={BeholdOptionsModal} crewList={crewList} handleSelect={onCrewPick} options={options} setOptions={setOptions} />
			<Divider horizontal hidden />
			<CrewComparison crewList={crewList} selectedCrew={selectedCrew} handleDismiss={onCrewDismiss} />
			{selectedCrew.length > 0 &&
				<Message>
					<Message.Header>
						Preview in your roster
					</Message.Header>
					<Button compact icon='add user' color='green' content='Preview all in your roster' onClick={addProspects} />
				</Message>
			}
		</React.Fragment>
	);

	function onCrewPick(crew: PlayerCrew | CrewMember): void {
		if (!selectedCrew.includes(crew.symbol)) {
			selectedCrew.push(crew.symbol);
			setSelectedCrew([...selectedCrew]);
		}
	}

	function onCrewDismiss(selectedIndex: number): void {
		selectedCrew.splice(selectedIndex, 1);
		setSelectedCrew([...selectedCrew]);
	}

	function addProspects(): void {
		const linkUrl = '/playertools?tool=crew';
		const linkState = {
			prospect: selectedCrew
		};
		navigate(linkUrl, { state: linkState });
	}
};

type CrewComparisonProps = {
	selectedCrew: string[];
	handleDismiss: (selectedIndex: number) => void;	
	crewList: (PlayerCrew | CrewMember)[];
};

export interface CrewComparisonEntry {
	markdown: string;
	crew: (PlayerCrew | CrewMember);
	crewDemands: ICrewDemandsMeta;
	markdownRemark: MarkdownRemark;
}

const CrewComparison = (props: CrewComparisonProps) => {
	const { selectedCrew } = props;

	const entries = [] as CrewComparisonEntry[];
	selectedCrew.forEach(symbol => {
		const crew = props.crewList.find(crew => crew.symbol === symbol);
		if (!crew) {
			console.error(`Crew ${symbol} not found in crew.json!`);
			return;
		}
		// This emulates the Gatsby markdown output until the transition to dynamic loading entirely
		entries.push({
			markdown: marked(crew.markdownContent),
			crew,
			crewDemands: {
				factionOnlyTotal: crew.factionOnlyTotal,
				totalChronCost: crew.totalChronCost,
				craftCost: crew.craftCost
			},
			markdownRemark: {
				frontmatter: {
					bigbook_tier: crew.bigbook_tier,
					events: crew.events,
					in_portal: crew.in_portal
				}
			}
		});
	});

	return (
		<Grid columns={3} stackable centered padded divided>
			{entries.map((entry, idx) => (
				<Grid.Column key={idx}>
					<Message onDismiss={() => { props.handleDismiss(idx); }}>
						<Message.Header>
							<Link to={`/crew/${entry.crew.symbol}/`}>
								{entry.crew.name}
							</Link>
						</Message.Header>
						<Rating defaultRating={entry.crew.max_rarity} maxRating={entry.crew.max_rarity} icon='star' size='small' disabled />
					</Message>
					<CommonCrewData compact={true} crewDemands={entry.crewDemands} crew={entry.crew} markdownRemark={entry.markdownRemark} roster={undefined} />
					{entry.markdown && (
						<React.Fragment>
							<div dangerouslySetInnerHTML={{ __html: entry.markdown }} />
							<div style={{ marginTop: '1em' }}>
								<a href={`https://www.bigbook.app/crew/${entry.crew.symbol}`}>View {entry.crew.name} on Big Book</a>
							</div>
						</React.Fragment>
					)}
				</Grid.Column>
			))}
		</Grid>
	);
};



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

	protected checkState() {
		const { options } = this.state;

		const isDefault = options.portal === '' && options.series.length === 0 && options.rarities.length === 0;
		const isDirty = options.portal !== ''
			|| options.series.length !== this.props.options.series.length || !this.props.options.series.every(s => options.series.includes(s))
			|| options.rarities.length !== this.props.options.rarities.length || !this.props.options.rarities.every(r => options.rarities.includes(r));

		if (this.state.isDefault != isDefault || this.state.isDirty != isDirty) {
			this.setState({ ... this.state, isDefault, isDirty });
		}
	}
	

};



export default BeholdsPage;
