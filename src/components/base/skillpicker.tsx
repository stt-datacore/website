import React from 'react';
import { GlobalContext } from '../../context/globalcontext';
import CONFIG from '../CONFIG';
import { Dropdown, DropdownItemProps } from 'semantic-ui-react';

export interface SkillPickerProps {
    style?: React.CSSProperties;
    fluid?: boolean;
    multiple?: boolean;
    placeholder?: string;
    short?: boolean;
    value?: string | string[];
    setValue: ((value?: string) => void) | ((value?: string[]) => void);
}

export const SkillPicker = (props: SkillPickerProps) => {
    const context = React.useContext(GlobalContext);
    const { style, fluid, multiple, short, value, setValue, placeholder } = props;

    const { t } = context.localized;
    const options = [] as DropdownItemProps[];

    if (short) {
        CONFIG.SKILLS_SHORT.forEach((skill) => {
            options.push({
                key: skill.name,
                value: skill.name,
                text: skill.short
            })
        });
    }
    else {
        Object.entries(CONFIG.SKILLS).forEach(([skill, name]) => {

            options.push({
                key: skill,
                value: skill,
                text: name
            });
        });
    }

    return <Dropdown
        style={style}
        search
        selection
        clearable
        fluid={fluid}
        multiple={multiple}
        placeholder={placeholder ?? t('global.search')}
        labeled
        options={options}
        value={value}
        onChange={(e, { value }) => setValue(value as any)}
    />

}