import React from 'react';
import { Button, Dropdown, Form, Popup } from 'semantic-ui-react';

import { RetrievalOptions } from '../../model/game-elements';

import { UserContext } from './context'
import { GlobalContext } from '../../context/globalcontext';

type CrewChecklistProps = {
	attemptedCrew: string[];
	updateAttempts: (crewSymbols: string[]) => void;
};

const CrewChecklist = (props: CrewChecklistProps) => {
	const userContext = React.useContext(UserContext);
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;

	const { bossCrew } = userContext;
	const { updateAttempts } = props;

	const [options, setOptions] = React.useState<RetrievalOptions>({ initialized: false, list: []});

	React.useEffect(() => {
		if (props.attemptedCrew)
			if (options && !options.initialized) populatePlaceholders();
	}, [props.attemptedCrew]);

	if (!options) {
		populatePlaceholders();
		return (<></>);
	}
	const copyFull = () => {
		let str = "Attempted: " + props.attemptedCrew.map(symbol => bossCrew.find(c => c.symbol === symbol)?.name ?? '').join(", ");
		if (navigator.clipboard) {
			navigator.clipboard.writeText(str);
		}
	}
	return (
		<div style={{ margin: '2em 0' }}>
			{t('fbb.attempted.title')}
			<Form.Field
				placeholder={t('behold_helper.search_for_crew')}
				control={Dropdown}
				clearable
				fluid
				multiple
				search
				selection
				options={options.list}
				value={props.attemptedCrew}
				onFocus={() => { if (!options.initialized) populateOptions(); }}
				onChange={(e, { value }) => updateAttempts(value) }
			/>
			<div style={{marginTop:"0.5em"}}>
				<Popup
					content={t('clipboard.copied_exclaim')}
					on='click'
					position='right center'
					size='tiny'
					trigger={
						<Button icon='clipboard' content={t('fbb.attempted.clipboard')} onClick={() => copyFull()} />
					}
				/>
			</div>
		</div>
	);

	function populatePlaceholders(): void {
		const options: RetrievalOptions = { initialized: false, list: [] };
		if (props.attemptedCrew.length > 0) {
			let crewList = [...bossCrew];
			options.list = crewList.filter(c => props.attemptedCrew.includes(c.symbol)).map(c => {
				return { key: c.symbol, value: c.symbol, text: c.name, image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` }};
			});
		}
		else {
			options.list = [{ key: 0, value: 0, text: 'Loading...' }];
		}
		setOptions({...options});
	}

	function populateOptions(): void {
		const crewList = [...bossCrew];
		options.list = crewList.sort((a, b) => a.name.localeCompare(b.name)).map(c => {
			return { key: c.symbol, value: c.symbol, text: c.name, image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` }};
		});
		options.initialized = true;
		setOptions({...options});
	}
};

export default CrewChecklist;
