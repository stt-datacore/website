import React from 'react';
import { Link } from 'gatsby';
import { Table, Rating } from 'semantic-ui-react';

import { InitialOptions, LockedProspect } from '../../model/game-elements';
import { GlobalContext } from '../../context/globalcontext';
import { SearchableTable, ITableConfigRow } from '../../components/searchabletable';
import { CrewHoverStat, CrewTarget } from '../../components/hovering/crewhoverstat';
import { crewMatchesSearchFilter } from '../../utils/crewsearch';

import { IRosterCrew, RosterType, ICrewFilter } from './model';
import { descriptionLabel } from './commonoptions';
import { CrewTraitMatchesCell } from './filters/crewtraits';
import { ItemHoverStat } from '../hovering/itemhoverstat';

type CrewConfigTableProps = {
	pageId: string;
	rosterType: RosterType;
	initOptions?: InitialOptions;
	rosterCrew: IRosterCrew[];
	crewFilters: ICrewFilter[];
	tableConfig?: ITableConfigRow[];
	renderTableCells?: (crew: IRosterCrew) => JSX.Element;
	lockableCrew?: LockedProspect[];
	loading?: boolean;
};

export const CrewConfigTable = (props: CrewConfigTableProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { pageId, rosterType, initOptions, rosterCrew, crewFilters, lockableCrew } = props;

	const [focusedCrew, setFocusedCrew] = React.useState<IRosterCrew | undefined | null>(undefined);

	const showOwned = (rosterType === 'allCrew' || rosterType === 'buyBack') && !!playerData;
	const showTraitMatches = !!crewFilters.find(crewFilter => crewFilter.id === 'traits_matched');

	const pseudos = ['name'];
	if (rosterType === 'myCrew') pseudos.push('level', 'q_bits');
	if ((rosterType === 'allCrew' || rosterType === 'buyBack') && playerData) pseudos.push('highest_owned_rarity');
	pseudos.push('quipment_score');
	pseudos.push('collections.length');
	pseudos.push('date_added');

	const tableConfig: ITableConfigRow[] = [
		{ width: 3, column: 'name', title: 'Crew', pseudocolumns: pseudos },
		{ width: 1, column: 'max_rarity', title: 'Rarity', reverse: true, tiebreakers: ['rarity'] },
	];
	if (showTraitMatches) {
		tableConfig.push(
			{ width: 1, column: 'traits_matched.length', title: 'Matches', reverse: true, tiebreakers: ['max_rarity', 'rarity'] }
		);
	}
	(props.tableConfig ?? []).forEach(column => tableConfig.push(column));

	return (
		<React.Fragment>
			<SearchableTable
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

	function renderTableRow(crew: IRosterCrew, idx: number, highlighted: boolean, setCrew: React.Dispatch<React.SetStateAction<IRosterCrew | null | undefined>> | undefined = undefined): JSX.Element {
		const attributes = {
			positive: highlighted
		};

		setCrew ??= (e) => { return; };

		return (
			<Table.Row key={idx} {...attributes}>
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
							<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
						</div>
						<div style={{ gridArea: 'description' }}>{descriptionLabel(crew, showOwned)}</div>
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
