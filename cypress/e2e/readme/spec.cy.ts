function openReadme() {
  cy.get('#readme-button').click();
}

describe('readme_language', () => {
  it('should show default markdown on open', () => {
    openReadme();
    cy.contains('Welcome to Chainlit!');
  });

  it.skip('should show Portguese markdown on pt-BR language', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, 'language', {
          value: 'pt-BR'
        });
      }
    });
    openReadme();
    cy.contains('Bem-vindo ao Chainlit!');
  });

  it.skip('should fallback to default markdown on Klingon language', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, 'language', {
          value: 'tlh'
        });
      }
    });
    openReadme();
    cy.contains('Welcome to Chainlit!');
  });
});
