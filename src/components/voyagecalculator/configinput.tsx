import React from 'react';
import { Header, Grid, Card, Image } from 'semantic-ui-react';

import { IVoyageInputConfig } from '../../model/voyage';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../../components/CONFIG';

import { ConfigEditor } from './configeditor';
import { Calculator } from './calculator';

const VOYAGE_DEBUGGING: boolean = true;

type ConfigInputProps = {
	voyageConfig: IVoyageInputConfig | undefined;
};

export const ConfigInput = (props: ConfigInputProps) => {
	const [voyageConfig, setVoyageConfig] = React.useState<IVoyageInputConfig | undefined>(undefined);

	React.useEffect(() => {
		const printDebug = (): void => {
			if (!VOYAGE_DEBUGGING) return;
			console.log(debug.reduce((prev, curr) => prev + '\n\n' + curr, '***** CONFIG INPUT *****'));
		};
		const debug: string[] = [];
		if (props.voyageConfig) {
			if (voyageConfig)
				debug.push(`Existing config: ${voyageConfig.skills.primary_skill}, ${voyageConfig.skills.secondary_skill}, ${voyageConfig.ship_trait}`);
			else
				debug.push('Existing config: None');
			debug.push(`New config: ${props.voyageConfig.skills.primary_skill}, ${props.voyageConfig.skills.secondary_skill}, ${props.voyageConfig.ship_trait}`);
			printDebug();
		}
		setVoyageConfig(props.voyageConfig);
	}, [props.voyageConfig]);

	if (voyageConfig && voyageConfig.skills.primary_skill !== '' && voyageConfig.skills.secondary_skill !== '')
		return <InputConfigCard voyageConfig={voyageConfig} setVoyageConfig={setVoyageConfig} />;

	return (
		<React.Fragment>
			<Header as='h3'>
				No Voyage Configuration Available
			</Header>
			<p>Import your player data to help tailor this tool to your current voyage and roster. Otherwise, you can manually create a voyage and view the best crew in the game for any possible configuration.</p>
			<ConfigEditor voyageConfig={voyageConfig} updateConfig={setVoyageConfig} />
		</React.Fragment>
	);
};

type InputConfigCardProps = {
	voyageConfig: IVoyageInputConfig;
	setVoyageConfig: (voyageConfig: IVoyageInputConfig) => void;
};

const InputConfigCard = (props: InputConfigCardProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { SHIP_TRAIT_NAMES } = globalContext.localized;
	const { voyageConfig, setVoyageConfig } = props;

	return (
		<React.Fragment>
			<Grid columns={2} stackable>
				<Grid.Column width={13}>
					<Card.Group>
						<Card>
							<Card.Content>
								<Image floated='right' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${voyageConfig.skills.primary_skill}.png`} style={{ height: '2em' }} />
								<Card.Header>{CONFIG.SKILLS[voyageConfig.skills.primary_skill]}</Card.Header>
								<p>primary</p>
							</Card.Content>
						</Card>
						<Card>
							<Card.Content>
								<Image floated='right' src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${voyageConfig.skills.secondary_skill}.png`} style={{ height: '2em' }} />
								<Card.Header>{CONFIG.SKILLS[voyageConfig.skills.secondary_skill]}</Card.Header>
								<p>secondary</p>
							</Card.Content>
						</Card>
						<Card>
							<Card.Content>
								<Card.Header>{voyageConfig.ship_trait !== '' ? (SHIP_TRAIT_NAMES[voyageConfig.ship_trait] ?? voyageConfig.ship_trait) : '(None)'}</Card.Header>
								<p>ship trait</p>
							</Card.Content>
						</Card>
					</Card.Group>
				</Grid.Column>
				<Grid.Column width={3} textAlign='right'>
					<ConfigEditor voyageConfig={voyageConfig} updateConfig={setVoyageConfig} />
				</Grid.Column>
			</Grid>
			<Calculator voyageConfig={voyageConfig} />
		</React.Fragment>
	);
};
