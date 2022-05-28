import React from 'react';
import { Card, Image } from 'semantic-ui-react';
import { getRarityColor } from '../../utils/assets';

function getRarityStars(rarity: number) {
	const retVal = [];
	for (let i = 0; i < rarity; ++i) {
		retVal.push('\u2605');
	}
	return retVal.join('');
}

function CrewCard({crew}) {
    return (
        <Card>
            <Card.Content>
                <Image
                    floated="left"
                    size="tiny"
                    src={crew.image}
                    bordered
                    style={{
                        borderColor: `${getRarityColor(crew.rarity)}`
                    }}
                />
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
