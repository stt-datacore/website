import React from 'react';
import {
    Button,
    Icon,
    Image,
    Input,
    Label,
    Message,
    Popup,
    Rating,
    Segment
} from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';

import { CrewMember } from '../../model/crew';
import { PlayerCrew } from '../../model/player';
import { DataPicker } from '../dataset_presenters/datapicker';
import { IDataGridSetup, IDataPickerState, IEssentialData } from '../dataset_presenters/model';

// interface IPickerFilters {
//     availability: string;
//     potential: string;
// };

// const defaultFilters: IPickerFilters = {
//     availability: '',
//     potential: 'solution'
// };

type CrewMultiPickerProps = {
    pageId: string;
    rosterCrew: (CrewMember | PlayerCrew)[];
    selectedCrew: number[];
    updateSelected: (crewSymbols: number[]) => void;

};

export const CrewMultiPicker = (props: CrewMultiPickerProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { selectedCrew, updateSelected } = props;

    const rosterCrew = props.rosterCrew;

    // const [filters, setFilters] = React.useState<IPickerFilters>(defaultFilters);
    const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);

    const selectedIds = React.useMemo<Set<number>>(() => {
        const selectedIds: number[] = rosterCrew.filter(crew => selectedCrew.includes(crew.id)).map(crew => crew.id);
        return new Set<number>([...selectedIds]);
    }, [selectedCrew]);

    const gridSetup: IDataGridSetup = {
        renderGridColumn: renderGridCrew
    };

    return (
        <React.Fragment>
            <Message	/* Keep track of crew who have been tried for this combo chain. */
                onDismiss={() => updateSelected([])}
                attached
            >
                {t('hints.select_crew')}
            </Message>
            <Segment attached='bottom'>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5em', alignItems: 'center' }}>
                    {renderSelected()}
                    <Input	/* Search for crew by name */
                        iconPosition='left'
                        placeholder={t('crew_picker.search_by_name')}
                        onClick={() => setModalIsOpen(true)}
                    >
                        <input />
                        <Icon name='search' />
                    </Input>
                </div>
            </Segment>
            {/* {selectedCrew.length > 0 && (
                <Popup
                    content={t('clipboard.copied_exclaim')}
                    on='click'
                    position='right center'
                    size='tiny'
                    trigger={
                        <Button icon='clipboard' content={t('fbb.selected.clipboard')} onClick={() => copyFull()} />
                    }
                />
            )} */}
            {modalIsOpen && (
                <DataPicker	/* Search for crew by name */
                    id={`${props.pageId}/crewmultiselect/datapicker`}
                    data={rosterCrew}
                    closePicker={handleSelectedIds}
                    preSelectedIds={selectedIds}
                    selection
                    preFilteredIds={new Set<number>()}
                    search
                    searchPlaceholder={t('crew_picker.search_by_name')}
                    //renderOptions={renderOptions}
                    //renderPreface={(state: IDataPickerState) => <CrewPickerPreface state={state} />}
                    gridSetup={gridSetup}
                />
            )}
        </React.Fragment>
    );

    function renderSelected(): JSX.Element {
        return (
            <React.Fragment>
                {Array.from(selectedIds).map(selectedId => {
                    const crew: CrewMember | undefined = rosterCrew.find(crew => crew.id === selectedId);
                    if (!crew) return <></>;
                    return (
                        <Label key={crew.id} style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center' }}>
                            <Image spaced='right' src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
                            {crew.name}
                            <Icon name='delete' onClick={() => cancelSelection(crew.id)} />
                        </Label>
                    );
                })}
            </React.Fragment>
        );
    }

    function crewMatchesPotentialFilter(crew: CrewMember, filter: string): boolean {
        return true;
    }

    function crewMatchesAvailabilityFilter(crew: CrewMember, filter: string): boolean {
        return true;
    }

    function renderOptions(): JSX.Element {
        return <></>;
        // return (
        //     <CrewPickerOptions
        //         filters={filters}
        //         setFilters={setFilters}
        //     />
        // );
    }

    function renderGridCrew(datum: IEssentialData, isSelected: boolean): JSX.Element {
        const crew: CrewMember | PlayerCrew = datum as CrewMember | PlayerCrew;
        const frozen = ("immortal" in crew && !!crew.immortal) && crew.immortal > 0;
        const highest_owned_rarity = ("highest_owned_rarity" in crew) ? (crew.highest_owned_rarity || 0) : undefined;
        return (
            <React.Fragment>
                <Image>
                    <div style={{ opacity:  1 }}>
                        <img src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} width='72px' height='72px' />
                    </div>
                    {isSelected && (
                        <Label corner='right' color='green' icon='check' />
                    )}
                </Image>
                <div>
                    {frozen && <Icon name='snowflake' />}
                    {crew.name}
                </div>
                <div><Rating defaultRating={highest_owned_rarity === undefined ? crew.max_rarity : highest_owned_rarity} maxRating={crew.max_rarity} icon='star' size='small' disabled /></div>
            </React.Fragment>
        );
    }

    function handleSelectedIds(selectedIds: Set<number>): void {
        const selectedCrew: number[] = [];
        [...selectedIds].forEach(selectedId => {
            const crew: CrewMember | undefined = rosterCrew.find(crew => crew.id === selectedId);
            if (crew) selectedCrew.push(crew.id);
        });
        updateSelected(selectedCrew);
        setModalIsOpen(false);
    }

    function cancelSelection(crewId: number): void {
        updateSelected([...selectedCrew.filter(crew => crew !== crewId)]);
    }

    function copyFull(): void {
        const str = "Attempted: " + selectedCrew.map(id => rosterCrew.find(c => c.id === id)?.name ?? '').join(', ');
        if (navigator.clipboard) {
            navigator.clipboard.writeText(str);
        }
    }
};

// type CrewPickerOptionsProps = {
//     filters: IPickerFilters;
//     setFilters: (filters: IPickerFilters) => void;
// };

// const CrewPickerOptions = (props: CrewPickerOptionsProps) => {
//     const { t } = React.useContext(GlobalContext).localized;
//     const { userType } = React.useContext(UserContext);
//     const { filters, setFilters } = props;

//     const potentialOptions: DropdownItemProps[] = [
//         {	/* Show all crew */
//             key: 'all',
//             text: t('base.all_crew'),
//             value: ''
//         },
//         {	/* Only show potential solutions */
//             key: 'solution',
//             text: 'Only show potential solutions',
//             value: 'solution'
//         },
//         {	/* Only show optimal crew */
//             key: 'optimal',
//             text: 'Only show optimal crew',
//             value: 'optimal'
//         }
//     ];

//     const availabilityOptions: DropdownItemProps[] = [
//         {	/* Show all crew */
//             key: 'all',
//             text: t('base.all_crew'),
//             value: ''
//         },
//         {	/* Only show owned crew */
//             key: 'owned',
//             text: t('crew_ownership.owned'),
//             value: 'owned'
//         },
//         {	/* Only show unfrozen crew */
//             key: 'thawed',
//             text: t('options.crew_status.thawed'),
//             value: 'thawed'
//         }
//     ];

//     return (
//         <Form>
//             <Form.Group widths='equal'>
//                 <Form.Field	/* Filter by potential */
//                     placeholder='Filter by potential'
//                     control={Dropdown}
//                     clearable
//                     selection
//                     options={potentialOptions}
//                     value={filters.potential}
//                     onChange={(e, { value }) => setFilters({...filters, potential: value})}
//                 />
//                 {userType === 'player' && (
//                     <Form.Field
//                         placeholder={t('hints.filter_by_availability')}
//                         control={Dropdown}
//                         clearable
//                         selection
//                         options={availabilityOptions}
//                         value={filters.availability}
//                         onChange={(e, { value }) => setFilters({...filters, availability: value})}
//                     />
//                 )}
//             </Form.Group>
//             <Form.Group style={{ justifyContent: 'end', marginBottom: '0' }}>
//                 <Form.Field>
//                     <Button	/* Reset */
//                         content={t('global.reset')}
//                         onClick={() => setFilters({...defaultFilters})}
//                     />
//                 </Form.Field>
//             </Form.Group>
//         </Form>
//     );
// };

type CrewPickerPrefaceProps = {
    state: IDataPickerState;
};

const CrewPickerPreface = (props: CrewPickerPrefaceProps) => {
    const { data } = props.state;
    if (data.length === 0) return <></>;
    return (
        <React.Fragment>
            Crew who have been marked as tried are tagged <Icon name='x' fitted />. Tap a crew to toggle. You can select multiple crew.
            {` `}
            {data.length > 1 && <>Double-tap to select an individual crew more quickly.</>}
            {data.length === 1 && <>Double-tap or press enter to select an individual crew more quickly.</>}
        </React.Fragment>
    );
};


