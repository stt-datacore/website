import React from 'react';
import { Link, navigate } from 'gatsby';
import { Step, Icon, Button, Message, Popup } from 'semantic-ui-react';

import { CrewMember } from '../model/crew';
import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';
import CrewPicker from '../components/crewpicker';
import { crewCopy } from '../utils/crewutils';
import { useStateWithStorage } from '../utils/storage';

import { BeholdOptionsModal, BeholdModalOptions, DEFAULT_BEHOLD_OPTIONS } from '../components/behold/optionsmodal';
import { ClassicView } from '../components/behold/classicview';
import { StandardView } from '../components/behold/standardview';
import { TableView } from '../components/behold/tableview';

type BeholdsPageProps = {
	location: any;
};

const BeholdsPage = (props: BeholdsPageProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const crewList = crewCopy<CrewMember>(globalContext.core.crew)
		.sort((a, b) => a.name.localeCompare(b.name));

	let crewFromUrl = [] as string[];
	if (props.location) {
		const urlParams = new URLSearchParams(props.location.search);
		if (urlParams.has('crew')) crewFromUrl = urlParams.getAll('crew');
	}

	return (
		<DataPageLayout
			pageTitle={t('menu.tools.behold_helper')}
			pageDescription={t('behold_helper.heading')}
			playerPromptType='recommend'
		>
			<React.Fragment>
				<BeholdHelper crewList={crewList} initSelection={crewFromUrl} />
			</React.Fragment>
		</DataPageLayout>
	);
};

type BeholdHelperProps = {
	crewList: CrewMember[];
	initSelection: string[];
};

const BeholdHelper = (props: BeholdHelperProps) => {
	const { crewList } = props;
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;

	const [selectedCrew, setSelectedCrew] = useStateWithStorage<string[]>('behold/crew', props.initSelection);
	const [crewView, setCrewView] = useStateWithStorage('behold/view', 'classic'); // Do not use rememberForever on this
	const [options, setOptions] = React.useState<BeholdModalOptions>(DEFAULT_BEHOLD_OPTIONS);

	const filterCrew = (data: CrewMember[], searchFilter: string = ''): CrewMember[] => {
		// Filtering
		const portalFilter = (crew: CrewMember) => {
			if (options.portal.slice(0, 6) === 'portal' && !crew.in_portal) return false;
			if (options.portal === 'portal-unique' && (crew.unique_polestar_combos?.length ?? 0) === 0) return false;
			if (options.portal === 'portal-nonunique' && (crew.unique_polestar_combos?.length ?? 0) > 0) return false;
			if (options.portal === 'nonportal' && crew.in_portal) return false;
			return true;
		};
		const query = (input: string) => input.toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(searchFilter.toLowerCase().replace(/[^a-z0-9]/g, '')) >= 0;
		data = data.filter(crew =>
			true
				&& (options.portal === '' || portalFilter(crew))
				&& (options.series.length === 0 || (crew.series && options.series.includes(crew.series)))
				&& (options.rarities.length === 0 || options.rarities.includes(crew.max_rarity))
				&& (searchFilter === '' || (query(crew.name) || query(crew.short_name)))
		);

		return data;
	};

	const permalink = selectedCrew.reduce((prev, curr) => { if (prev !== '') prev += '&'; return prev+'crew='+curr; }, '');

	return (
		<React.Fragment>
			<CrewPicker defaultOptions={DEFAULT_BEHOLD_OPTIONS} pickerModal={BeholdOptionsModal}
				options={options} setOptions={setOptions}
				crewList={crewList} filterCrew={filterCrew} handleSelect={onCrewPick}
			/>

			{selectedCrew.length > 0 && (
				<React.Fragment>
					<Step.Group fluid widths={4}>
						<Step active={crewView === 'classic'} onClick={() => setCrewView('classic')}>
							<Icon name='block layout' />
							<Step.Content>
								<Step.Title>{t('behold_helper.views.classic.title')}</Step.Title>
								<Step.Description>{t('behold_helper.views.classic.description')}</Step.Description>
							</Step.Content>
						</Step>
						<Step active={crewView === 'details'} onClick={() => setCrewView('details')}>
							<Icon name='newspaper' />
							<Step.Content>
								<Step.Title>{t('behold_helper.views.standard.title')}</Step.Title>
								<Step.Description>{t('behold_helper.views.standard.description')}</Step.Description>
							</Step.Content>
						</Step>
						<Step active={crewView === 'table'} onClick={() => setCrewView('table')}>
							<Icon name='table' />
							<Step.Content>
								<Step.Title>{t('behold_helper.views.table.title')}</Step.Title>
								<Step.Description>{t('behold_helper.views.table.description')}</Step.Description>
							</Step.Content>
						</Step>
						<Step onClick={() => setSelectedCrew([])}>
							<Icon name='x' color='red' />
							<Step.Content>
								<Step.Title>{t('behold_helper.views.dismiss_all.title')}</Step.Title>
								<Step.Description>{t('behold_helper.views.dismiss_all.description')}</Step.Description>
							</Step.Content>
						</Step>
					</Step.Group>

					{crewView === 'classic' &&
						<ClassicView selectedCrew={selectedCrew} crewList={crewList} handleDismiss={onCrewDismiss} />
					}
					{crewView === 'details' &&
						<StandardView selectedCrew={selectedCrew} crewList={crewList} handleDismiss={onCrewDismiss} />
					}
					{crewView === 'table' &&
						<TableView selectedCrew={selectedCrew} crewList={crewList} />
					}

					{false && selectedCrew.length > 1 &&
						<div style={{ marginTop: '2em', textAlign: 'right' }}>
							<Button size='large' fluid onClick={() => addProspects(selectedCrew)} disabled>
								<Icon name='add user' color='green' />
								{t('behold_helper.preview_all')}
							</Button>
						</div>
					}

					<Message style={{ marginTop: '2em' }}>
						<Message.Header>{t('behold_helper.share_page_heading')}</Message.Header>
						<p>{tfmt('behold_helper.share_help', {
							permalink: <Link to={`/behold?${permalink}`}>{t('global.permalink')}</Link>
						})}</p>
						<Popup
							content='Copied!'
							on='click'
							position='right center'
							size='tiny'
							trigger={
								<Button icon='clipboard' content={t('global.copy_permalink_clipboard')}
									onClick={() => navigator.clipboard.writeText(`${process.env.GATSBY_DATACORE_URL}/behold?${permalink}`)}
								/>
							}
						/>
					</Message>
				</React.Fragment>
			)}
		</React.Fragment>
	);

	function onCrewPick(crew: CrewMember): void {
		if (!selectedCrew.includes(crew.symbol)) {
			selectedCrew.push(crew.symbol);
			setSelectedCrew([...selectedCrew]);
		}
	}

	function onCrewDismiss(selectedIndex: number): void {
		selectedCrew.splice(selectedIndex, 1);
		setSelectedCrew([...selectedCrew]);
	}

	function addProspects(crewSymbols: string[]): void {
		const linkUrl = '/playertools?tool=crew';
		const linkState = {
			prospect: crewSymbols
		};
		navigate(linkUrl, { state: linkState });
	}
};

export default BeholdsPage;
