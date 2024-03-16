import React from 'react';
import { InView } from 'react-intersection-observer';
import { Grid, Icon, Label, SemanticCOLORS } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';

import { IPolestar } from './model';
import { RetrievalContext } from './context';

type CombosGridProps = {
	combos: IPolestar[][];
	fuseIndex: number;
};

export const CombosGrid = (props: CombosGridProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { polestarTailors } = React.useContext(RetrievalContext);
	const { combos, fuseIndex } = props;

	const addedPolestars = polestarTailors.added;
	const disabledPolestars = polestarTailors.disabled;

	const [paginationPage, setPaginationPage] = React.useState<number>(1);

	const data: IPolestar[][] = combos.slice().sort(sortCombos);

	// Pagination
	const itemsPerPage = 10, itemsToShow = itemsPerPage*paginationPage;

	return (
		<React.Fragment>
			<Grid columns='equal' textAlign='center'>
				{data.slice(0, itemsToShow).map((combo, cdx) =>
					<Grid.Row key={'combo'+cdx}>
						{combo.sort(sortPolestars).map((polestar, pdx) => (
							<Grid.Column key={'combo'+cdx+',polestar'+pdx}>
								<img width={32} src={`${process.env.GATSBY_ASSETS_URL}${polestar.icon.file.slice(1).replace(/\//g, '_')}`} />
								<br />{polestar.short_name}
								{playerData && (
									<React.Fragment>
										<br />{renderCount(polestar)}
									</React.Fragment>
								)}
							</Grid.Column>
						))}
					</Grid.Row>
				)}
			</Grid>
			{itemsToShow < data.length && (
				<InView as='div' style={{ margin: '2em 0', textAlign: 'center' }}
					onChange={(inView, entry) => { if (inView) setPaginationPage(prevState => prevState + 1); }}
				>
					<Icon loading name='spinner' /> Loading...
				</InView>
			)}
		</React.Fragment>
	);

	// Sort by combo length, then least polestars needed, then most polestars owned, then polestar type/name
	function sortCombos(a: IPolestar[], b: IPolestar[]): number {
		const missing = (polestars: IPolestar[]) => polestars.reduce((prev, curr) => prev + (curr.owned === 0 ? 1 : 0), 0);
		const owned = (polestars: IPolestar[]) => polestars.reduce((prev, curr) => prev + curr.owned, 0);
		if (a.length === b.length) {
			const aMissing = missing(a), bMissing = missing(b);
			if (aMissing === bMissing) {
				const aOwned = owned(a), bOwned = owned(b);
				if (aOwned === bOwned) {
					let sortResult = 0;
					for (let i = 0; i < a.length; i++) {
						sortResult = sortPolestars(a[i], b[i]);
						if (sortResult !== 0) break;
					}
					return sortResult;
				}
				return bOwned - aOwned;
			}
			return aMissing - bMissing;
		}
		return a.length - b.length;
	}

	// Match in-game sort: traits first (alpha), then rarity, then skills (alpha)
	function sortPolestars(a: IPolestar, b: IPolestar): number {
		if (a.filter.type !== b.filter.type) {
			if (a.filter.type === 'trait')
				return -1;
			else if (b.filter.type === 'trait')
				return 1;
			return a.filter.type.localeCompare(b.filter.type);
		}
		return a.name.localeCompare(b.name);
	}

	function renderCount(polestar: IPolestar): JSX.Element {
		let color: SemanticCOLORS | undefined = undefined;

		if (disabledPolestars.includes(polestar.id))
			color = 'orange';
		else if (fuseIndex > polestar.owned && addedPolestars.filter(added => added === polestar.symbol).length > 0)
			color = 'blue';
		else if (polestar.owned === 0)
			color = 'yellow';

		return (
			<Label color={color}>
				{polestar.owned}
			</Label>
		);
	}
};
