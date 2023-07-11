import React from 'react';
import { Dropdown, Form } from 'semantic-ui-react';

type CrewChecklistProps = {
	crewList: string[];
	attemptedCrew: string[];
	updateAttempts: (crewSymbols: string[]) => void;
};

const CrewChecklist = (props: CrewChecklistProps) => {
	const { updateAttempts } = props;

	const [options, setOptions] = React.useState(undefined);

	React.useEffect(() => {
		if (props.attemptedCrew)
			if (options && !options.initialized) populatePlaceholders();
	}, [props.attemptedCrew]);

	if (!options) {
		populatePlaceholders();
		return (<></>);
	}

	return (
		<div style={{ margin: '2em 0' }}>
			Keep track of crew who have been tried for this combo chain.
			<Form.Field
				placeholder='Search for crew'
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
		</div>
	);

	function populatePlaceholders(): void {
		const options = { initialized: false, list: [] };
		if (props.attemptedCrew.length > 0) {
			let crewList = [...props.crewList];
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
		const crewList = [...props.crewList];
		options.list = crewList.sort((a, b) => a.name.localeCompare(b.name)).map(c => {
			return { key: c.symbol, value: c.symbol, text: c.name, image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` }};
		});
		options.initialized = true;
		setOptions({...options});
	}
};

export default CrewChecklist;
