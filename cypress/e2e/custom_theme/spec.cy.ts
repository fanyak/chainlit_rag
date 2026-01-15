describe('Custom Theme', () => {
  it.skip('should have the roboto font family and green bg in dark theme', () => {
    // The hsl value is converted to rgb
    cy.get('body').should('have.css', 'background-color', 'rgb(85, 255, 0)');
    cy.get('body').should('have.css', 'font-family', 'Roboto, sans-serif');
  });

  it.skip('should have the poppins font family and red bg in light theme', () => {
    cy.visit('/');
    cy.get('#theme-toggle').click();
    //cy.contains('Light').click();
    cy.contains('Φωτεινό Θέμα').click(); // Verify that the theme has changed
    // The hsl value is converted to rgb
    cy.get('body').should('have.css', 'background-color', 'rgb(255, 0, 0)');
    cy.get('body').should('have.css', 'font-family', 'Poppins, sans-serif');
  });
});
