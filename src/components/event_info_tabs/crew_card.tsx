import React from 'react';
import { Card, Image } from 'semantic-ui-react';
import { getRarityColor } from '../../utils/assets';
import { PlayerCrew } from '../../model/player';
import { MergedContext } from '../../context/mergedcontext';
import { CrewTarget } from '../hovering/crewhoverstat';

function getRarityStars(rarity: number) {
	const retVal = [] as string[];
	for (let i = 0; i < rarity; ++i) {
		retVal.push('\u2605');
	}
	return retVal.join('');
}

export interface CrewCardBrief {
    key: string;
    symbol: string;
    name: string;
    image: string;
    rarity: number;
    skills: { key: string, imageUrl: string }[];
    traits: string[];
}

export interface CrewCardProps {
    crew: CrewCardBrief;
    sysCrew?: PlayerCrew;
}

function CrewCard(props: CrewCardProps) {
    const context = React.useContext(MergedContext);
    const { crew } = props;

    const sysCrew = props.sysCrew ?? context.allCrew?.find(f => f.symbol === crew.symbol);
    
    return (
        <Card>
            <Card.Content>
                <CrewTarget targetGroup='event_info' inputItem={sysCrew}>
                    <Image
                        floated="left"
                        size="tiny"
                        src={crew.image}
                        bordered
                        style={{
                            borderColor: `${getRarityColor(crew.rarity)}`
                        }}
                    />
                </CrewTarget>
                <Card.Header>{crew.name}</Card.Header>
                <Card.Meta>
                    <p>{getRarityStars(crew.rarity)}</p>
                    <p>
                        {crew.skills.map(skill => (
                            <Image key={skill.key} width={30} height={30} inline spaced src={skill.imageUrl} />
                        ))}
                    </p>
                </Card.Meta>
                <Card.Description>
                    {crew.traits.join(', ')}
                </Card.Description>
            </Card.Content>
        </Card>
    );
}

export default CrewCard;
