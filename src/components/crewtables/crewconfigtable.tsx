import React from 'react';
import { Link } from 'gatsby';
import { Table, Rating, Checkbox, Button } from 'semantic-ui-react';

import { InitialOptions, LockedProspect } from '../../model/game-elements';
import { GlobalContext } from '../../context/globalcontext';
import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';
import { CrewHoverStat, CrewTarget } from '../../components/hovering/crewhoverstat';
import { crewMatchesSearchFilter } from '../../utils/crewsearch';

import { IRosterCrew, RosterType, ICrewFilter } from './model';
import { descriptionLabel, SpecialViews } from './commonoptions';
import { CrewTraitMatchesCell } from './filters/crewtraits';
import { ItemHoverStat } from '../hovering/itemhoverstat';
import { OptionsPanelFlexRow } from '../stats/utils';
import { CompletionState } from '../../model/player';

type CrewConfigTableProps = {
	pageId: string;
	rosterType: RosterType;
	initOptions?: InitialOptions;
	rosterCrew: IRosterCrew[];
	crewFilters: ICrewFilter[];
	tableConfig?: ITableConfigRow[];
	renderTableCells?: (crew: IRosterCrew) => React.JSX.Element;
	lockableCrew?: LockedProspect[];
	loading?: boolean;
	extraSearchContent?: React.JSX.Element;
	specialView?: SpecialViews;
};

export const CrewConfigTable = (props: CrewConfigTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { CREW_ARCHETYPES } = globalContext.localized;
	const { playerData } = globalContext.player;
	const { pageId, rosterType, initOptions, rosterCrew, crewFilters, lockableCrew, extraSearchContent, specialView } = props;

	const [focusedCrew, setFocusedCrew] = React.useState<IRosterCrew | undefined | null>(undefined);

	const showOwned = (['allCrew', 'offers', 'buyBack'].includes(rosterType)) && !!playerData;
	const showTraitMatches = !!crewFilters.find(crewFilter => crewFilter.id === 'traits_matched');

	const pseudos = ['name'];
	if (rosterType === 'myCrew') pseudos.push('level', 'q_bits', 'is_new');
	if ((['allCrew', 'offers', 'buyBack'].includes(rosterType)) && playerData) pseudos.push('highest_owned_rarity');
	pseudos.push('ranks.traitRank');
	pseudos.push('quipment_score');
	pseudos.push('collections.length');
	pseudos.push('date_added');

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: t('base.crew'), pseudocolumns: pseudos },
		{ width: 1, column: 'max_rarity', title: t('base.rarity'), reverse: true, tiebreakers: ['rarity'] },
	];
	if (showTraitMatches) {
		tableConfig.push(
			{ width: 1, column: 'traits_matched.length', title: t('options.trait_match.matches'), reverse: true, tiebreakers: ['max_rarity', 'rarity'] }
		);
	}
	(props.tableConfig ?? []).forEach(column => tableConfig.push(column));

	return (
		<React.Fragment>
			<SearchableTable
				showSortDropdown
				extraSearchContent={extraSearchContent}
				defaultPaginationRows={props.initOptions?.rows}
				id={`${pageId}/table_`}
				data={rosterCrew}
				config={tableConfig}
				renderTableRow={(crew, idx, highlighted) =>
					renderTableRow(
						crew,
						idx ?? -1,
						highlighted ?? false,
						setFocusedCrew
					)
				}
				filterRow={(crew, filters, filterType) =>
					showThisCrew(crew, filters, filterType ?? '')
				}
				overflowX='auto'
				showFilterOptions={true}
				showPermalink={rosterType === 'allCrew'}
				initOptions={initOptions}
				lockable={lockableCrew}
			/>
			<CrewHoverStat targetGroup={pageId+'/targetClass'} />
			<ItemHoverStat targetGroup={pageId+'/targetClassItem'} />
		</React.Fragment>
	);

	function showThisCrew(crew: IRosterCrew, filters: [], filterType: string): boolean {
		// Apply filters
		let showCrew = true;
		for (let i = 0; i < crewFilters.length; i++) {
			if (!crewFilters[i].filterTest(crew)) {
				showCrew = false;
				break;
			}
		}
		if (!showCrew) return false;
		return crewMatchesSearchFilter(crew, filters, filterType);
	}

	function renderTableRow(crew: IRosterCrew, idx: number, highlighted: boolean, setCrew: React.Dispatch<React.SetStateAction<IRosterCrew | null | undefined>> | undefined = undefined): React.JSX.Element {
		const attributes = {
			positive: highlighted
		};

		setCrew ??= (e) => { return; };

		return (
			<Table.Row key={idx} {...attributes}
				// style={{
				// 	backgroundColor: specialView === 'as_immortalized' && crew.immortal === CompletionState.DisplayAsImmortalOwned ? 'darkgreen' : undefined
				// }}
				>
				<Table.Cell className='sticky'>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '60px auto',
							gridTemplateAreas: `'icon stats' 'icon description'`,
							gridGap: '1px'
						}}
					>
						<div style={{ gridArea: 'icon' }}>
							<CrewTarget inputItem={crew} targetGroup={pageId+'/targetClass'} >
								<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							</CrewTarget>
						</div>
						<div style={{ gridArea: 'stats' }}>
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{CREW_ARCHETYPES[crew.symbol]?.name ?? crew.name}</Link></span>
						</div>
						<div style={{ gridArea: 'description' }}>{descriptionLabel(t, crew, showOwned, specialView === 'as_immortalized')}</div>
					</div>
				</Table.Cell>
				<Table.Cell>
					<Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size='large' disabled />
				</Table.Cell>
				{showTraitMatches && <CrewTraitMatchesCell crew={crew} />}
				{props.renderTableCells && props.renderTableCells(crew)}
			</Table.Row>
		);
	}
};
