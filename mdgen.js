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
    let rawmd = scanForMarkdown('./static');
    let allmd = rawmd.map(s => s.replace('./static/', ''));
    let org = {};
    let i = 0;
    for (let file of allmd) {
        let sp = file.split("/");

        // We neither want nor need the crew pages:
        if (sp[0] === 'crew') continue;

        org[sp[0]] ??= [];
        org[sp[0]].push({
            file: sp[1]
        });
        let oi = org[sp[0]].length - 1;
        let filepath = rawmd[i];
        let contents = fs.readFileSync(filepath, 'utf-8').split('---\n');
        let headers = contents[1].split("\n");
        let mapped = headers.map(h => {
            let x = h.indexOf(":");
            if (x === -1) return ['', ''];
            let front = h.slice(0, x);
            let back = h.slice(x+1);
            return [front, back];
        });
        for (let mp of mapped) {
            if (!mp || !mp[0]) continue;
            if (mp.length < 2) mp.push('');
            let txt = mp[1].trim();
            if (txt.startsWith("\"") && txt.endsWith("\"")) txt = txt.slice(1, txt.length - 1);
            if (txt.startsWith("'") && txt.endsWith("'")) txt = txt.slice(1, txt.length - 1);
            if (!Number.isNaN(Number(txt))) txt = Number(txt);
            else if (['true', 'false'].includes(txt.toLowerCase())) txt = Boolean(txt);
            org[sp[0]][oi][mp[0]] = txt;
        }
        i++;
    }
    fs.writeFileSync('./static/structured/markdown_pages.json', JSON.stringify(org, null, 4));
})();