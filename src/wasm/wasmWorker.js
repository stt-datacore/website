/* eslint-disable */

import wasm from './voymod.js';

self.addEventListener('message', message => {
	wasm().then(mod => {
		let result = mod.calculate(JSON.stringify(message.data), progressResult => {
			self.postMessage({ progressResult });
		});

		self.postMessage({ result });

		// close this worker
		self.close();
	});
});
