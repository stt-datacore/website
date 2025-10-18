import React from 'react';
import { Table, Rating, Dropdown, Button } from 'semantic-ui-react';
import { Link } from 'gatsby';
import { CrewMember } from '../model/crew';
import { PlayerCrew } from '../model/player';
import { LockedProspect } from '../model/game-elements';
import { DropDownItem } from '../utils/misc';
import { GlobalContext } from '../context/globalcontext';

type ProspectPickerProps = {
	pool: (CrewMember | PlayerCrew)[];
	prospects: LockedProspect[];
	setProspects: (prospects: LockedProspect[]) => void;
};

const ProspectPicker = (props: ProspectPickerProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { pool, prospects, setProspects } = props;
	enum OptionsState {
		Uninitialized,
		Initializing,
		Initialized,
	};

	const [selection, setSelection] = React.useState('');
	const [options, setOptions] = React.useState({
		state: OptionsState.Uninitialized,
		list: [] as DropDownItem[]
	});

	React.useEffect(() => {
		if (options.state !== OptionsState.Uninitialized) {
			setOptions({ ... options, state: OptionsState.Uninitialized });
		}
	}, [pool]);

	if (pool.length == 0) return (<></>);

	const placeholder = options.state === OptionsState.Initializing ? t('global.loading_please_wait_ellipses') : t('prospect_picker.select_crew');

	return (
		<React.Fragment>
			<Dropdown search selection clearable
				placeholder={placeholder}
				options={options.list}
				value={selection}
				onFocus={() => { if (options.state === OptionsState.Uninitialized) populateOptions(); }}
				onChange={(e, { value }) => setSelection(value as string)}
			/>
			<Button compact icon='add user' color='green' content={t('prospect_picker.add_crew')} onClick={() => { addProspect(); }} style={{ marginLeft: '1em' }} />
			<Table celled striped collapsing unstackable compact="very">
				<Table.Body>
					{prospects.map((p, prospectNum) => (
						<Table.Row key={prospectNum}>
							<Table.Cell><img width={24} src={`${process.env.GATSBY_ASSETS_URL}${p.imageUrlPortrait}`} /></Table.Cell>
							<Table.Cell><Link to={`/crew/${p.symbol}/`}>{p.name}</Link></Table.Cell>
							<Table.Cell>
								<Rating size='large' icon='star' rating={p.rarity} maxRating={p.max_rarity}
									onRate={(e, {rating, maxRating}) => { fuseProspect(prospectNum, rating as number); }} />
							</Table.Cell>
							<Table.Cell>
								<Button compact icon='trash' color='red' onClick={() => deleteProspect(prospectNum)} />
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		</React.Fragment>
	);

	function populateOptions(): void {
		setOptions({
			state: OptionsState.Initializing,
			list: []
		});
		// Populate inside a timeout so that UI can update with a "Loading" placeholder first
		setTimeout(() => {
			const populatePromise = new Promise<DropDownItem[]>((resolve, reject) => {
				const poolList = pool.map((c) => (
					{
						key: c.symbol,
						value: c.symbol,
						image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` },
						text: c.name
					} as DropDownItem
				));
				resolve(poolList);
			});
			populatePromise.then((poolList) => {
				setOptions({
					state: OptionsState.Initialized,
					list: poolList
				});
			});
		}, 0);
	}

	function addProspect(): void {
		if (selection == '') return;
		let valid = pool.find((c) => c.symbol == selection);
		if (valid) {
			let prospect = {
				symbol: valid.symbol,
				name: valid.name,
				imageUrlPortrait: valid.imageUrlPortrait,
				rarity: valid.max_rarity,
				max_rarity: valid.max_rarity,
			} as LockedProspect;
			prospects.push(prospect);
			setProspects([...prospects]);
		};
		setSelection('');
	}


	function fuseProspect(prospectNum: number, rarity: number): void {
		if (rarity == 0) return;
		prospects[prospectNum].rarity = rarity;
		setProspects([...prospects]);
	}

	function deleteProspect(prospectNum: number): void {
		prospects.splice(prospectNum, 1);
		setProspects([...prospects]);
	}
};

export default ProspectPicker;