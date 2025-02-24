const fs = require('fs');

const STATIC_PATH = `${__dirname}/../static/structured/locales`;

const languages = ['en', 'de', 'fr', 'sp'];

function comp(a, b, current) {
    current ??= "";
    if (current) current = current + "."
    let akeys = Object.keys(a);
    let bkeys = Object.keys(b);
    let allkeys = [... new Set(akeys.concat(bkeys)) ];
    let missinga = allkeys.filter(f => !akeys.includes(f)).map(m => current + m);
    let missingb = allkeys.filter(f => !bkeys.includes(f)).map(m => current + m);
    for (let k of allkeys) {
        if (typeof a[k] !== 'string' && typeof b[k] !== 'string' && a[k] && b[k]) {
            let deeper = comp(a[k], b[k], current + k);
            missinga = missinga.concat(deeper.missinga);
            missingb = missingb.concat(deeper.missingb);
        }
    }
    return { missinga, missingb };
}

function main() {

    const files = languages.map((lang) => `${STATIC_PATH}/${lang}/translation.json`);

    const translations = {};
    let x = 0;
    for (let file of files) {
        translations[languages[x++]] = JSON.parse(fs.readFileSync(file, 'utf-8'))
    }

    for (let l1 of languages) {
        for (let l2 of languages) {
            if (l1 === l2) continue;
            console.log(`\n\n------------------------\nCompare ${l1} to ${l2}`);
            if (!translations[l1]) {
                console.log(`No translation for ${l1}`)
                process.exit(-1);
            }
            if (!translations[l2]) {
                console.log(`No translation for ${l2}`)
                process.exit(-1);
            }
            const { missinga, missingb } = comp(translations[l1], translations[l2]);
            if (missinga.length) {
                console.log(`\nMissing from ${l1}\n`);
                for (let m of missinga) {
                    console.log(m);
                }
            }
            if (missingb.length) {
                console.log(`\nMissing from ${l2}\n`);
                for (let m of missingb) {
                    console.log(m);
                }
            }
        }
    }

}

main();
