import React from "react";
import { CryoCollection, PlayerCollection } from "../../model/player";
import { GlobalContext } from "../../context/globalcontext";
import { Form, Dropdown } from "semantic-ui-react";
import { Collection } from "../../model/collections";

export interface CollectionDropDownProps {
    style?: React.CSSProperties;
    collections?: (PlayerCollection | CryoCollection | Collection)[];
    filter?: number[];
    multiple?: boolean;
    selection?: number[];
    showMilestones?: boolean | 'auto';
    setSelection: (value?: number | number[]) => void;
    customRender?: (collection: Collection | CryoCollection | PlayerCollection) => JSX.Element;
}

export const CollectionDropDown = (props: CollectionDropDownProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t, COLLECTIONS } = globalContext.localized;
    const playerCollections: (PlayerCollection | CryoCollection | Collection)[] = props.collections ?? globalContext.player.playerData?.player.character.cryo_collections ?? globalContext.core.collections;
    const { filter, selection, setSelection, multiple, customRender } = props;
    const showMilestones = props.showMilestones === 'auto' ? playerCollections.every(pc => "milestone" in pc) : (props.showMilestones ?? false);

    const collectionsOptions = playerCollections
        .filter(collection => (!("milestone" in collection)) || (collection.milestone.goal != 'n/a' && collection.milestone.goal > 0))
        .sort((a, b) => a.name.localeCompare(b.name))
        .filter(f => !filter?.length || filter.includes(Number(f.type_id)))
        .map(collection => {
            let localized = COLLECTIONS[`cc-${collection.type_id}`];
            return {
                key: collection.type_id,
                value: collection.type_id,
                text: (localized?.name || collection.name) + (showMilestones && "milestone" in collection ? ` (${collection.progress} / ${collection.milestone.goal})` : ''),
                content: customRender ? customRender(collection) : undefined
            };
        });

    return (
        <Form.Field
            placeholder={t('hints.filter_by_collections')}
            control={Dropdown}
            clearable
            multiple={multiple}
            search
            selection
            options={collectionsOptions}
            value={selection}
            onChange={(e, { value }) => setSelection(value as number[] | number)}
            closeOnChange
        />
    )

}