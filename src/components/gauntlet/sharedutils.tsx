import React from 'react';
import { Table, Label } from 'semantic-ui-react';
import { PlayerCrew, TranslateMethod } from '../../model/player';
import { GauntletBucketType, getCritColor } from '../../utils/gauntlet';


export function renderElevatedCritTable(crew: PlayerCrew, buckets: GauntletBucketType[], t: TranslateMethod) {
        if (!buckets?.length) return <></>
        if (!buckets?.length) return <></>
        return (
            <div style={{maxHeight: '15em', overflowY: 'auto', padding: '0.25em'}}>
                <Table striped>
                    {buckets.map((bucket, idx) => {
                        const { key, name, crit, count } = bucket;
                        return (
                            <Table.Row key={`gpcrit_${crew.symbol}_${key}_${crit}`}>
                                <Table.Cell>
                                    {count}
                                </Table.Cell>
                                <Table.Cell>
                                    {name || key}
                                </Table.Cell>
                                <Table.Cell>
                                    <div style={{minWidth: '4em'}}>
                                    <Label color={getCritColor(crit)}>
                                        {t('global.n_%', { n: crit })}
                                    </Label>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table>
            </div>
        )
    }
