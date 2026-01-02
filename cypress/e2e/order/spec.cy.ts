const VALID_TRANSACTION_ID = '1bd96bba-bcd0-430e-be76-303cd9c58f1c';
const INVALID_TRANSACTION_ID = '1e305611-4694-4a51-a33c-d98d4ccdb081';
const SELECTORS = {
  ORDER_BUTTON: '.btn.btn-primary',
  ORDER_BUTTON_TEXT: '.btn.btn-primary span',
  ORDER_CODE_BOX: 'code',
  SUCCESS_URL: `/order/success?t=${VALID_TRANSACTION_ID}&s=7002976631972601&eventId=0&eci=5`,
  SUCCESS_ICON: 'div.bg-green-100',
  NON_EXIST_TRANSACTION_URL: `/order/success?t=${INVALID_TRANSACTION_ID}&s=7002976631972601&eventId=0&eci=5`,
  FAILURE_ICON: 'svg.text-red-600',
  FAIL_URL: `/order/fail?t=${INVALID_TRANSACTION_ID}&s=7002976631972601&eventId=0&eci=5`
} as const;

function mockTransaction(response: {
  transaction_id?: string;
  [key: string]: any;
}) {
  cy.intercept('GET', '/transaction*', (req) => {
    let body: object;
    if (req.query.transaction_id === VALID_TRANSACTION_ID) {
      body = response;
    } else {
      body = {};
    }
    req.reply({ statusCode: 200, body });
  }).as('validateTransaction');
}

function visitAsUser(url: string = '', expectedStatus: number = 200) {
  cy.intercept('GET', '/user').as('getUser');
  if (url) {
    cy.visit(url);
  } else cy.reload();
  cy.wait('@getUser').then((interception) => {
    expect(interception.response.statusCode).to.equal(expectedStatus);
  });
}

function login() {
  // create referer cookie and authenticate via custom endpoint
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
    cy.clearCookies();
    visitAsUser('/order', 401);
    cy.location('pathname', { timeout: 5000 }).should('eq', '/order');
  });
  it('the un-authenticated user should see subscribe buttons but be directed to login on click', () => {
    cy.get(SELECTORS.ORDER_BUTTON).should('be.visible').and('have.length', 2);
    cy.get(SELECTORS.ORDER_BUTTON_TEXT).should('contain.text', 'Subscribe Now');
    cy.get(SELECTORS.ORDER_BUTTON).eq(0).click();
    cy.get(SELECTORS.ORDER_BUTTON).first().should('have.attr', 'disabled');
    cy.url().should('include', '/auth/oauth/'); // redirected to oauth login
  });

  describe('authenticate via custom endpoint, include referer and create order', () => {
    beforeEach(() => {
      login().then((response) => {
        // test redirect status after calling authentication endpoint
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
      // Common setup: reload to apply auth and verify /user returns 200 and we stay on /order
      visitAsUser();
      cy.location('pathname', { timeout: 5000 }).should('eq', '/order');
    });

    it('the authenticated user should be able to create an order', () => {
      cy.get(SELECTORS.ORDER_BUTTON).eq(1).click();
      cy.get(SELECTORS.ORDER_BUTTON).eq(1).should('have.attr', 'disabled');
      cy.get(SELECTORS.ORDER_BUTTON).eq(0).should('not.have.attr', 'disabled');
      cy.get(SELECTORS.ORDER_CODE_BOX)
        .as('codeBox')
        .invoke('text')
        .then((text) => {
          expect(text.length).to.be.gte(16);
        });
    });

    it('should show success message when returning with valid transaction', () => {
      // Set up intercept BEFORE the action that triggers the request
      mockTransaction({
        transaction_id: VALID_TRANSACTION_ID,
        order_code: '7002976631972601',
        status: 'F'
      });
      // Also intercept /user to ensure auth state is ready
      visitAsUser(SELECTORS.SUCCESS_URL);
      cy.location('pathname').should('eq', '/order/success');
      // Now wait for the transaction validation
      cy.wait('@validateTransaction', { timeout: 10000 }).then(
        (interception) => {
          expect(interception.request.query['transaction_id']).to.equal(
            VALID_TRANSACTION_ID
          );
        }
      );
      cy.get(SELECTORS.SUCCESS_ICON).should('be.visible');
      // wait for redirect - should be redirected to home
      cy.location('pathname', { timeout: 5000 }).should('eq', '/');
    });

    it('should show error message when visiting with non-existent transaction', () => {
      // Set up intercept BEFORE the action that triggers the request
      mockTransaction({
        error: 'Transaction not found'
      });
      // Also intercept /user to ensure auth state is ready
      visitAsUser(SELECTORS.NON_EXIST_TRANSACTION_URL);
      cy.location('pathname').should('eq', '/order/success');
      // Now wait for the transaction validation
      cy.wait('@validateTransaction', { timeout: 10000 }).then(
        (interception) => {
          expect(interception.request.query['transaction_id']).to.equal(
            INVALID_TRANSACTION_ID
          );
        }
      );
      cy.get(SELECTORS.FAILURE_ICON).should('be.visible');
      // wait to make sure that no redirect happens
      cy.wait(3000);
      cy.location('pathname').should('eq', '/order/success'); // should not be redirected
    });
    it('should show error message when returning from failed transaction', () => {
      // Also intercept /user to ensure auth state is ready
      visitAsUser(SELECTORS.FAIL_URL);
      cy.location('pathname').should('eq', '/order/fail');
      cy.get(SELECTORS.FAILURE_ICON).should('be.visible');
      // wait to make sure that no redirect happens
      cy.wait(3000);
      cy.location('pathname').should('eq', '/order/fail'); // should not be redirected
    });
  });
});
