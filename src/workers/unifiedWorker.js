/* eslint-disable */

import voymod from './voymod.js';
import chewable from './chewable.js';
import voyagers from './voyagers.js';

self.addEventListener('message', message => {
	const postResult = (result, inProgress) => {
		self.postMessage({result, inProgress});
		if (!inProgress) self.close();
	};

	if (message.data.worker === 'chewable') {
		chewableEstimate(message.data.config, est => postResult(est, true)).then(estimate =>
			postResult(estimate, false)
		);
	}
	else if (message.data.worker === 'iampicard') {
		voymod().then(mod => {
			let result = mod.calculate(JSON.stringify(message.data), res => {
				postResult(res, true);
			});
			postResult(result, false);
		});
	}
	else if (message.data.worker === 'ussjohnjay') {
		voyagers.forDataCore(message.data, postResult, chewable.getEstimate);
	}
});

// This worker can estimate a single lineup from input config
const chewableEstimate = (config, progress) => {
	return new Promise((resolve, reject) => {
		let estimate = chewable.getEstimate(config, progress);
		resolve(estimate);
	});
};
