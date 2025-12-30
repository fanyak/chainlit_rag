const SELECTORS = {
  ORDER_BUTTON: '.btn.btn-primary',
  ORDER_BUTTON_TEXT: '.btn.btn-primary span',
  ORDER_CODE_BOX: 'code'
} as const;

function login() {
  return cy.request({
    method: 'GET',
    url: '/auth/custom',
    followRedirect: false // test the status 302 redirect (see main.py)
  });
}
describe('Load the order Page', () => {
  beforeEach(() => {
    cy.visit('/order');
    cy.url().should('include', '/order');
  });
  it('the un-authenticated user should see subscribe buttons but be directed to login on click', () => {
    cy.get(SELECTORS.ORDER_BUTTON).should('be.visible');
    cy.get(SELECTORS.ORDER_BUTTON).should('have.length', 2);
    cy.get(SELECTORS.ORDER_BUTTON_TEXT).should('contain.text', 'Subscribe Now');

    cy.get(SELECTORS.ORDER_BUTTON).first().click();
    cy.url().should('include', '/auth/oauth/'); // redirected to oauth login
  });

  describe('authenticate via custom endpoint, include referer and create order', () => {
    beforeEach(() => {
      login().then((response) => {
        // test redirect status
        expect(response.status).to.be.equal(302);
        // Verify cookie is set in response headers
        expect(response.headers).to.have.property('set-cookie');
        const cookies = Array.isArray(response.headers['set-cookie'])
          ? response.headers['set-cookie']
          : [response.headers['set-cookie']];
        expect(cookies[0]).to.contain('access_token');
      });
    });
    it('should request and have access to /user', () => {
      cy.intercept('GET', '/user').as('user');
      cy.reload();
      cy.wait('@user').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
      });
    });
    it('the redirect url should inlude the referer path to /order', () => {
      // should include the referer path when redirected to login/callback
      cy.url().should('include', '/order');
    });
    it('the authenticated user should be able to create order', () => {
      // we did not follow redirects after authenticating.
      cy.visit('/order');
      cy.location('pathname').should('eq', '/order');
      cy.get(SELECTORS.ORDER_BUTTON).first().click();
      cy.get(SELECTORS.ORDER_BUTTON).first().should('have.attr', 'disabled');
      cy.get(SELECTORS.ORDER_CODE_BOX)
        .as('codeBox')
        .invoke('text')
        .then((text) => {
          expect(text.length).to.be.gte(16);
        });
    });
  });
});
