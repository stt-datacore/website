import createVoyMod from './voymod.mjs';
import wasmUrl from './voymod.wasm?url';

export default function voymod() {
    return createVoyMod({
        locateFile(path: string) {
        console.log('[voymod locateFile]', path, '=>', wasmUrl);
        return path.endsWith('.wasm') ? wasmUrl : path;
        }
    });
}