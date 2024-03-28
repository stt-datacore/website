beforeEach(() => {
  sessionStorage.clear();
});

describe('Home page', () => {
  it('Renders correctly', () => {
    cy.visit('/');

    cy.get('h2').contains('Crew Stats');
    cy.get('th').contains('Crew').click();
    cy.get('tbody>tr').eq(0).contains('"Bullseye" Kyle');
  });
});

describe('Crew page', () => {
  it('Shows correct details', () => {
    cy.visit('/crew/dsc_adira_tal_new_crew/');

    // Check flavour text
    cy.get('#crew_flavor_text').contains('their memories');
    // Check ranks are showing
    cy.get('.label').contains('Voyage Rank');
  })
})