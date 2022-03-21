import React from 'react';
import { Table, Rating, Dropdown, Button } from 'semantic-ui-react';
import { Link } from 'gatsby';

type ProspectPickerProps = {
	pool: any[];
	prospects: any[];
	setProspects: (prospects: any[]) => void;
};

const ProspectPicker = (props: ProspectPickerProps) => {
	const { pool, prospects, setProspects } = props;

	const [selection, setSelection] = React.useState('');

	if (pool.length == 0) return (<></>);

	const poolList = pool.map((c) => (
		{
			key: c.symbol,
			value: c.symbol,
			image: { avatar: true, src: `${process.env.GATSBY_ASSETS_URL}${c.imageUrlPortrait}` },
			text: c.name
		}
	));

	return (
		<React.Fragment>
			<Dropdown search selection clearable
				placeholder='Select Crew'
				options={poolList}
				value={selection}
				onChange={(e, { value }) => setSelection(value)}
			/>
			<Button compact icon='add user' color='green' content='Add Crew' onClick={() => { addProspect(); }} style={{ marginLeft: '1em' }} />
			<Table celled striped collapsing unstackable compact="very">
				<Table.Body>
					{prospects.map((p, prospectNum) => (
						<Table.Row key={prospectNum}>
							<Table.Cell><img width={24} src={`${process.env.GATSBY_ASSETS_URL}${p.imageUrlPortrait}`} /></Table.Cell>
							<Table.Cell><Link to={`/crew/${p.symbol}/`}>{p.name}</Link></Table.Cell>
							<Table.Cell>
								<Rating size='large' icon='star' rating={p.rarity} maxRating={p.max_rarity}
									onRate={(e, {rating, maxRating}) => { fuseProspect(prospectNum, rating); }} />
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

	function addProspect(): void {
		if (selection == '') return;
		let valid = pool.find((c) => c.symbol == selection);
		if (valid) {
			let prospect = {
				symbol: valid.symbol,
				name: valid.name,
				imageUrlPortrait: valid.imageUrlPortrait,
				rarity: valid.max_rarity,
				max_rarity: valid.max_rarity
			};
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