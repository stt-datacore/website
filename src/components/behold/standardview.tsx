import React from 'react';
import { Button, Icon, Divider } from 'semantic-ui-react';
import { navigate } from 'gatsby';

import { CrewMember } from '../../model/crew';
import { CrewPresenter } from '../../components/item_presenters/crew_presenter';
import { ClassicPresenter } from '../../components/item_presenters/classic_presenter';
import { DEFAULT_MOBILE_WIDTH } from '../../components/hovering/hoverstat';
import { marked } from 'marked';

type StandardViewProps = {
	selectedCrew: string[];
	crewList: CrewMember[];
	handleDismiss: (selectedIndex: number) => void;
};

export const StandardView = (props: StandardViewProps) => {
	const { selectedCrew } = props;

	const data = [] as CrewMember[];
	selectedCrew.forEach(symbol => {
		const crew = props.crewList.find(crew => crew.symbol === symbol);
		if (!crew) {
			console.error(`Crew ${symbol} not found in crew.json!`);
			return;
		}
		data.push(crew);
	});

	let segmentWidth = '32%';
	if (data.length === 1) segmentWidth = '96%';
	else if (data.length === 2) segmentWidth = '48%';

	return (
		<div style={{ marginTop: '2em' }}>
			{data.map((crew, index) => (
				<div key={crew.symbol}>
					<CrewPresenter
						width={window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : '100%'}
						imageWidth={window.innerWidth < DEFAULT_MOBILE_WIDTH ? undefined : '50%'}
						selfRender={true}
						selfPrepare={true}
						storeName='beholdsPage'
						hover={window.innerWidth < DEFAULT_MOBILE_WIDTH}
						crew={crew} />
					<ClassicPresenter
						crew={crew}
						fields={['ranks', 'crew_demands', 'cross_fuses', 'date_added']}
					/>
					<div style={{ marginTop: '1em' }}>
						{crew.markdownContent && <div dangerouslySetInnerHTML={{ __html: marked.parse(crew.markdownContent) }} style={{ fontSize: '1.1em' }} />}
						<div style={{ marginTop: '1em', textAlign: 'right' }}>
							<a href={`https://www.bigbook.app/crew/${crew.symbol}`} target='_blank'>
								View {crew.name} on Big Book
							</a>
						</div>
					</div>
					<div style={{ marginTop: '1em', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
						{false && <Button onClick={() => addProspects([crew.symbol])}>
							<Icon name='add user' color='green' />
							Preview {crew.short_name} in your roster
						</Button>}
						<Button onClick={() => { props.handleDismiss(index); }}>
							<Icon name='x' color='red' />
							Dismiss {crew.short_name}
						</Button>
					</div>
					<Divider />
				</div>
			))}
		</div>
	);

	function addProspects(crewSymbols: string[]): void {
		const linkUrl = '/playertools?tool=crew';
		const linkState = {
			prospect: crewSymbols
		};
		navigate(linkUrl, { state: linkState });
	}
};
