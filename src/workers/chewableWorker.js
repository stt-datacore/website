/* eslint-disable */

const chewable = require('./chewable');

self.addEventListener('message', message => {
	chewableEstimate(config = message.data).then(estimate => {
		self.postMessage(estimate);
		self.close();
	});
});

// This worker can estimate a single lineup from input config
const chewableEstimate = config => {
	return new Promise((resolve, reject) => {
		let estimate = chewable.getEstimate(config);
		resolve(estimate);
	});
};
