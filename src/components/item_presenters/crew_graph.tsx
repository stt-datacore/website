import React from "react";
import { CrewMember, EquipmentSlot } from "../../model/crew";
import { GlobalContext } from "../../context/globalcontext";
import { Accordion, Icon, Rating, Segment, SemanticICONS } from "semantic-ui-react";
import { StandardTreeComponent, TreeComponentProps } from "../base/tree";
import { CryoCollection } from "../../model/player";
import CONFIG from "../CONFIG";
import { prettyObtained } from "../../utils/crewutils";
import { printFancyPortal } from "../base/utils";
import { IRosterCrew } from "../crewtables/model";
import { decamelify } from "../../utils/misc";
import { AvatarView } from "./avatarview";
import { getIconPath } from "../../utils/assets";

export interface CrewGraphAccordionProps {
    crew: CrewMember;
    initialExpand?: boolean;
}

export const CrewGraphAccordion = (props: CrewGraphAccordionProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
	const [isActive, setIsActive] = React.useState<boolean>(false);
    const { crew, initialExpand: externActive } = props;

    React.useEffect(() => {
        if (externActive !== undefined) {
            setIsActive(externActive);
        }
    }, [externActive]);

	return (
		<Accordion>
			<Accordion.Title
				active={isActive}
				onClick={() => setIsActive(!isActive)}
			>
                <Icon name={isActive ? 'caret down' : 'caret right' as SemanticICONS} />
				{t('global.object_graph')}
			</Accordion.Title>
			<Accordion.Content active={isActive}>
				{isActive && (
					<Segment>
		                <CrewGraph crew={crew} />
                    </Segment>
				)}
			</Accordion.Content>
		</Accordion>
	);
}

export interface CrewGraphProps {
    crew: CrewMember;
}

export const CrewGraph = (props: CrewGraphProps) => {
    const crew = structuredClone(props.crew);
    delete (crew as any).origin;
    const globalContext = React.useContext(GlobalContext);
    const { t, TRAIT_NAMES } = globalContext.localized;
    const portalTraits = Object.keys(TRAIT_NAMES).filter(trait => globalContext.core.crew.some(c => c.in_portal && c.traits.includes(trait)));

    return (<>
        <StandardTreeComponent
            rootLabel={(key, data) => {
                if (key === '0') return data.name;
                else {
                    let parts = key.split('.');
                    let tag = parts[parts.length-1];
                    return t(`base.${tag}`) || t(`global.${tag}`) || undefined;
                }
            }}
            keyRenderer={(key, data) => {
                let parts = key.split('.');
                if (typeof key === 'string' && key.endsWith("_skill")) {
                    return CONFIG.SKILLS[parts[parts.length-1]];
                }
                let text = parts[parts.length - 1];
                if (text.toUpperCase() === text) return text;
                return decamelify(text);
                //return undefined;
            }}
            dataRenderer={(key, data) => {
                if (typeof data === 'string' && data.endsWith("_skill")) {
                    return CONFIG.SKILLS[data];
                }
                return undefined;
            }}
            config={[{
                obtained: {
                    renderContent: (obtained: string) =>  {
                        return prettyObtained({ obtained }, t, true);
                    }
                },
                in_portal: {
                    renderContent: (obtained: string) =>  {
                        return printFancyPortal(crew as IRosterCrew, t)
                    }
                },
                imageUrlPortrait: {
                    renderContent: (data: string, key) => {
                        return <><img style={{width: '48px'}} src={`${process.env.VITE_ASSETS_URL}${data}`} /></>
                    }
                },
                imageUrlFullBody: {
                    renderContent: (data: string, key) => {
                        return <><img style={{width: '125px'}} src={`${process.env.VITE_ASSETS_URL}${data}`} /></>
                    }
                },
                equipment_slots: {
                    renderChild: (slot: EquipmentSlot) => {
                        let eq = globalContext.core.items.find(f => f.symbol === slot.symbol);
                        return <div style={{display: 'grid', borderTop: '1px solid #567', gridTemplateAreas: `'a a' 'b c'`, padding: '1em 0', gridTemplateColumns: '72px auto ', alignItems: 'center', gap: '0.5em',}}>
                            <div style={{gridArea: 'a'}}>
                                {t('base.level')}{' '}{slot.level}
                            </div>
                            <div style={{gridArea: 'b'}}>
                            <AvatarView
                                mode='item'
                                symbol={slot.symbol}
                                useDirect={true}
                                targetGroup='crew_page_items'
                                style={{marginRight: "0.5em"}}
                                size={48}
                                />
                            </div>
                            <div style={{gridArea: 'c'}}>
                                {eq?.name}
                            </div>
                        </div>
                    }
                },
                traits: {
                    renderChild: (child: string) => {
                        if (portalTraits.includes(child)) {
                            return (
                                <div style={{
                                    height: '72px',
                                    display: 'grid',
                                    alignItems: 'center',
                                    gap: '1em',
                                    gridTemplateAreas: `'img text'`,
                                    gridTemplateColumns: '64px auto'
                                }}>
                                    <img style={{gridArea: 'img', height: '48px'}} src={`${process.env.VITE_ASSETS_URL}items_keystones_${child}.png`} />
                                    <div style={{gridArea: 'text'}}>
                                        {TRAIT_NAMES[child] || child}
                                    </div>
                                </div>
                            );

                        }
                        else {
                            return (
                                <div>
                                    {TRAIT_NAMES[child] || child}
                                </div>
                            );

                        }
                    },
                },
                series: {
                    renderContent: (data: string) => {
                        return t(`series.${data}`);
                    }
                },
                max_rarity: {
                    renderContent: (value, key) => {
                        return (
                            <>{CONFIG.RARITIES[value].name}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<Rating title={CONFIG.RARITIES[value].name} size='tiny' icon='star' maxRating={crew.max_rarity} rating={value} /></>
                        )

                    }
                },
                action: {
                    bonus_type: {
                        renderContent: (value) => {
                            return CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[value]
                        }
                    },
                    ability: {
                        type: {
                            renderContent: (value) => {
                                return CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[value]
                            }
                        },
                        condition: {
                            renderContent: (value) => {
                                return CONFIG.CREW_SHIP_BATTLE_TRIGGER[value];
                            }
                        }
                    },
                    icon: {
                        file: {
                            renderContent: (data: any, key) => {
                                return <><img style={{width: '48px'}} src={`${process.env.VITE_ASSETS_URL}${crew.imageUrlPortrait}`} /></>
                            }
                        }
                    }
                },
                collections: {
                    renderChild: (data: string, key, config) => {
                        let col = globalContext.core.collections.find(f => f.name === data);
                        if (col) {
                            return <div style={{
                                display: 'grid',
                                gridTemplateAreas: `'img text'`,
                                gridTemplateColumns: '159px auto',
                                alignItems: 'center',
                                gap: '1em',
                                margin: '1em 0'
                                }}>
                                <img src={`${process.env.VITE_ASSETS_URL}${col.image}`} style={{width: '132px', gridArea: 'img'}} />
                                <div style={{gridArea: 'text'}}>
                                    {col.name}
                                </div>
                            </div>
                        }
                        else {
                            return <>{data}</>
                        }
                    }
                },
                cap_achiever: {
                    date: {
                        renderContent: (value) => {
                            return `${new Date(value * 1000)}`;
                        }
                    }
                },
            }]}
            data={[crew]}
        />
    </>)
}
