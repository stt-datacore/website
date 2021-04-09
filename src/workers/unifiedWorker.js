/* eslint-disable */

import voymod from './voymod.js';
import chewable from './chewable.js';

self.addEventListener('message', message => {
	if (message.data.worker === 'chewable') {
		chewableEstimate(message.data.config).then(estimate => {
			self.postMessage(estimate);
			self.close();
		});
	}
	else {
		voymod().then(mod => {
			let result = mod.calculate(JSON.stringify(message.data), progressResult => {
				self.postMessage({ progressResult });
			});

			self.postMessage({ result });

			// close this worker
			self.close();
		});
	}
});

// This worker can estimate a single lineup from input config
const chewableEstimate = config => {
	return new Promise((resolve, reject) => {
		let estimate = chewable.getEstimate(config);
		resolve(estimate);
	});
};
