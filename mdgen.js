import fs from 'fs';


function scanForMarkdown(dir) {
    let contents = fs.readdirSync(dir);
    let results = [];
    for (let file of contents) {
        if (fs.statSync(`${dir}/${file}`).isDirectory()) {
            results = results.concat(scanForMarkdown(`${dir}/${file}`));
        }
        else if (file.endsWith('.md')) {
            results.push(`${dir}/${file}`);
        }
    }
    return results;
}

(() => {
    let allmd = scanForMarkdown('./static');
    allmd = allmd.map(s => s.replace('./static/', ''));
    let org = {};
    for (let file of allmd) {
        let sp = file.split("/");
        org[sp[0]] ??= [];
        org[sp[0]].push(sp[1]);
    }
    fs.writeFileSync('./static/structured/markdown_pages.json', JSON.stringify(org, null, 4));
})();