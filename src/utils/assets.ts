import CONFIG from '../components/CONFIG';

type IconObject = {
    file: string,
    atlas_info?: string,
}

export function getIconPath(icon: IconObject, relative?: boolean) {
    let file = icon.file
        .replace(/^\//, '') // remove leading slash if present
        .replace(/\//g, '_') // convert all slashes to underscores
        .replace(/\.png$/, ''); // remove extension if present
    file += '.png'; // add the extension

    // some objects have an atlas info. not sure if this value matters,
    //  but we have to prepend the file to find the image.
    if (icon.atlas_info) {
        file = `atlas/${file}`;
    }

    // asset host specified in the env
    if (!!relative) {
        return file;
    }
    else {
        return `${process.env.GATSBY_ASSETS_URL}${file}`;
    }

}

export function getRarityColor(rarity: number) {
    return CONFIG.RARITIES[rarity].color;
}
