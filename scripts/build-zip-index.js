#!/usr/bin/env node
/**
 * Build zip-general.json from zips.co.il general zip per settlement.
 * Run: node scripts/build-zip-index.js
 */
const fs = require('fs');
const path = require('path');

const settlements = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../assets/data/israel-settlements.json'), 'utf8')
);

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function fetchGeneralZip(settlement) {
    const url = 'https://zips.co.il/city/' + encodeURIComponent(settlement.name) + '/' + settlement.id;
    const res = await fetch(url, { headers: { 'User-Agent': 'VIPO-BuildScript/1.0' } });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/מיקוד כללי:\s*(\d{7})/);
    if (!match) return null;
    return match[1];
}

async function main() {
    const map = {};
    let found = 0;
    for (let i = 0; i < settlements.length; i += 1) {
        const s = settlements[i];
        try {
            const zip = await fetchGeneralZip(s);
            if (zip) {
                map[zip] = { city: s.name, lat: s.lat, lon: s.lon };
                found += 1;
            }
        } catch (err) {
            // skip
        }
        if (i % 20 === 19) {
            process.stderr.write('progress ' + (i + 1) + '/' + settlements.length + '\n');
        }
        await sleep(120);
    }
    const out = path.join(__dirname, '../assets/data/zip-general.json');
    fs.writeFileSync(out, JSON.stringify(map));
    console.log('saved', out, 'entries', found);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
