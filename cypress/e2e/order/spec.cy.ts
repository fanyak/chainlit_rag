const SELECTORS = {
  ORDER_BUTTON: '.btn.btn-primary',
  ORDER_BUTTON_TEXT: '.btn.btn-primary span',
  ORDER_CODE_BOX: 'code',
  SUCCESS_URL:
    '/order/success?t=1bd96bba-bcd0-430e-be76-303cd9c58f1c&s=7002976631972601&eventId=0&eci=5',
  SUCCESS_ICON: 'div.bg-green-100',
  NON_EXIST_TRANSACTION_URL:
    '/order/success?t=1e305611-4694-4a51-a33c-d98d4ccdb081&s=7002976631972601&eventId=0&eci=5',
  FAILURE_ICON: 'svg.text-red-600'
} as const;

function login() {
  cy.setCookie('oauth_state', 'your_jwt_token');
  cy.setCookie('your_jwt_token', JSON.stringify({ referer_path: '/order' }));
  return cy.request({
    method: 'GET',
    url: '/auth/custom',
    followRedirect: false // test the status 302 redirect (see main.py)
  });
}
describe('Load the order Page', () => {
  beforeEach(() => {
    // create the referer url before authenticating
    cy.visit('/order');
    // Wait for auth check to complete and confirm we stay on /order
    cy.wait(3000);
    cy.location('pathname').should('eq', '/order');
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
        // we are not following redirects, but the url should include the referer path
        // to /order
        expect(response.headers.location).to.include(
          '/login/callback?success=True&referer=%2Forder'
        );
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
    it('after login we should still be on page /order', () => {
      // if followRedirect is false, the browser remains on /order
      cy.location('pathname').should('eq', '/order');
    });

    it('the authenticated user should be able to create an order', () => {
      // we did not follow redirects after authenticating.
      cy.intercept('GET', '/user').as('getUser');
      cy.visit('/order');
      cy.wait('@getUser');
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

    it('should show success message when returning with valid transaction', () => {
      // Set up intercept BEFORE the action that triggers the request
      cy.intercept('GET', '/transaction*', (req) => {
        if (
          req.query.transaction_id === '1bd96bba-bcd0-430e-be76-303cd9c58f1c'
        ) {
          req.reply({
            statusCode: 200,
            body: {
              transaction_id: req.query.transaction_id,
              order_code: req.query.order_code,
              status: 'F'
            }
          });
        } else {
          req.reply({
            statusCode: 200,
            body: {}
          });
        }
      }).as('validateTransaction');
      // Also intercept /user to ensure auth state is ready
      cy.intercept('GET', '/user').as('getUser');
      cy.visit(SELECTORS.SUCCESS_URL);
      cy.location('pathname').should('eq', '/order/success');
      // Wait for user auth to be fetched first (triggers useAuth to have user)
      cy.wait('@getUser');
      // Now wait for the transaction validation
      cy.wait('@validateTransaction', { timeout: 10000 }).then(
        (interception) => {
          expect(interception.request.query['transaction_id']).to.equal(
            '1bd96bba-bcd0-430e-be76-303cd9c58f1c'
          );
        }
      );
      cy.get(SELECTORS.SUCCESS_ICON).should('be.visible');
      cy.wait(3000); // wait for redirect
      cy.location('pathname').should('eq', '/'); // should be redirected to home
    });

    it('should show error message when returning with non-existent transaction', () => {
      // Set up intercept BEFORE the action that triggers the request
      cy.intercept('GET', '/transaction*', (req) => {
        req.reply({
          statusCode: 200,
          body: {}
        });
      }).as('validateTransaction');
      // Also intercept /user to ensure auth state is ready
      cy.intercept('GET', '/user').as('getUser');
      cy.visit(SELECTORS.NON_EXIST_TRANSACTION_URL);
      cy.location('pathname').should('eq', '/order/success');
      // Wait for user auth to be fetched first (triggers useAuth to have user)
      cy.wait('@getUser');
      // Now wait for the transaction validation
      cy.wait('@validateTransaction', { timeout: 10000 }).then(
        (interception) => {
          expect(interception.request.query['transaction_id']).to.equal(
            '1e305611-4694-4a51-a33c-d98d4ccdb081'
          );
        }
      );
      cy.get(SELECTORS.FAILURE_ICON).should('be.visible');
      cy.wait(3000); // wait to make sure no redirect happens
      cy.location('pathname').should('eq', '/order/success'); // should not be redirected
    });
  });
});
