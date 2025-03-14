import React from 'react';
import {
	Button,
	Icon,
	Image,
	Label,
	Message,
	Popup,
	Rating,
	Segment
} from 'semantic-ui-react';

import { BossCrew } from '../../model/boss';
import { GlobalContext } from '../../context/globalcontext';

import { IDataGridSetup, IEssentialData } from '../dataset_presenters/model';
import { DataPicker } from '../dataset_presenters/datapicker';

import { SolverContext, UserContext } from './context'

type CrewChecklistProps = {
	attemptedCrew: string[];
	updateAttempts: (crewSymbols: string[]) => void;
};

const CrewChecklist = (props: CrewChecklistProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { bossCrew } = React.useContext(UserContext);
	const { bossBattle } = React.useContext(SolverContext);
	const { attemptedCrew, updateAttempts } = props;

	const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);

	const selectedIds = React.useMemo<Set<number>>(() => {
		const attemptedIds: number[] = bossCrew.filter(crew => attemptedCrew.includes(crew.symbol)).map(crew => crew.id);
		return new Set<number>([...attemptedIds]);
	}, [attemptedCrew]);

	const gridSetup: IDataGridSetup = {
		renderGridColumn: renderGridCrew
	};

	return (
		<React.Fragment>
			<Message	/* Keep track of crew who have been tried for this combo chain. */
				onDismiss={() => updateAttempts([])}
				attached
			>
				{t('fbb.attempted.title')}
			</Message>
			<Segment attached='bottom'>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5em', alignItems: 'center' }}>
					{renderAttempts()}
					<Button onClick={() => setModalIsOpen(true)}>
						<Icon name='search' color='red' />
						Search for crew
					</Button>
				</div>
			</Segment>
			{attemptedCrew.length > 0 && (
				<Popup
					content={t('clipboard.copied_exclaim')}
					on='click'
					position='right center'
					size='tiny'
					trigger={
						<Button icon='clipboard' content={t('fbb.attempted.clipboard')} onClick={() => copyFull()} />
					}
				/>
			)}
			{modalIsOpen && (
				<DataPicker	/* Search for crew by name */
					id={`fbb/${bossBattle.id}-${bossBattle.chainIndex}/crewchecklist/datapicker`}
					data={bossCrew}
					closePicker={handleSelectedIds}
					preSelectedIds={selectedIds}
					selection
					search
					searchPlaceholder={t('crew_picker.search_by_name')}
					gridSetup={gridSetup}
				/>
			)}
		</React.Fragment>
	);

	function renderAttempts(): JSX.Element {
		return (
			<React.Fragment>
				{Array.from(selectedIds).map(selectedId => {
					const crew: BossCrew | undefined = bossCrew.find(crew => crew.id === selectedId);
					if (!crew) return <></>;
					return (
						<Label key={crew.id} style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center' }}>
							<Image spaced='right' src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
							{crew.name}
							<Icon name='delete' onClick={() => cancelAttempt(crew.symbol)} />
						</Label>
					);
				})}
			</React.Fragment>
		);
	}

	function renderGridCrew(datum: IEssentialData, isSelected: boolean): JSX.Element {
		const crew: BossCrew = datum as BossCrew;
		return (
			<React.Fragment>
				<Image>
					<div style={{ opacity: isSelected ? .5 : 1 }}>
						<img src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} width='72px' height='72px' />
					</div>
					{isSelected && (
						<Label corner='right' color='red' icon='x' />
					)}
				</Image>
				<div>{crew.name}</div>
				<div><Rating defaultRating={crew.highest_owned_rarity} maxRating={crew.max_rarity} icon='star' size='small' disabled /></div>
			</React.Fragment>
		);
	}

	function handleSelectedIds(selectedIds: Set<number>): void {
		const attemptedCrew: string[] = [];
		[...selectedIds].forEach(selectedId => {
			const crew: BossCrew | undefined = bossCrew.find(crew => crew.id === selectedId);
			if (crew) attemptedCrew.push(crew.symbol);
		});
		updateAttempts(attemptedCrew);
		setModalIsOpen(false);
	}

	function cancelAttempt(crewSymbol: string): void {
		updateAttempts([...attemptedCrew.filter(crew => crew !== crewSymbol)]);
	}

	function copyFull(): void {
		const str = "Attempted: " + attemptedCrew.map(symbol => bossCrew.find(c => c.symbol === symbol)?.name ?? '').join(', ');
		if (navigator.clipboard) {
			navigator.clipboard.writeText(str);
		}
	}
};

export default CrewChecklist;
