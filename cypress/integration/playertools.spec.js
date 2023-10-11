const playerTools = [
	'voyage',
	'event-planner',
	'crew',
	'crew-mobile',
	'crew-retrieval',
	'cite-optimizer',
	'collections',
	'fleetbossbattles',
	'ships',
	'factions',
	'items',
	'unneeded',
	'other',
	'charts'
];


before(() => {
	sessionStorage.clear();
	cy.visit('/playertools');
	cy.fixture('player').then((player) => {
		cy.get('textarea').then($destination => {
			const pasteEvent = Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
				clipboardData: {
					getData: (type = 'text') => JSON.stringify(player),
				},
			});
			$destination[0].dispatchEvent(pasteEvent);
		});
		cy.get('h4', {timeout: 20000});
    });
});

describe("Player tools", () => {
	playerTools.forEach((tool) => {
		it(tool, () => {
			cy.visit('/playertools?tool=' + tool);
			cy.get('h4').contains('Hello,');
		});
	});
});

