export function getEpisodeName(node: any) {
    let name = '';
    if (node.episode > 0) {
        name = `Episode ${node.episode} - `;
    }
    if (node.cadet) {
        name = 'Cadet - ';
    }
    if (name.length === 0) {
        name = 'Distress Call - ';
    }
    name += node.name || node.episode_title;
    return name;
}