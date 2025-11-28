import { IUser } from 'client-types/*';

function PaymentPlants({
  createOrder,
  loading,
  user
}: {
  createOrder: (amount: number) => Promise<void>;
  loading: boolean;
  user: IUser | null | undefined;
}) {
  return (
    <div className="pricing-container">
      <div className="intro">
        <h2>Choose Your Plan {user?.identifier}</h2>
        <p>
          Google Colab offers flexible pricing options to suit your needs, from
          free access to professional enterprise solutions.
        </p>
        <p>
          All plans include access to our powerful cloud computing resources for
          machine learning, data analysis, and computational research.
        </p>
      </div>

      <div className="pricing-grid">
        {/* <div className="pricing-card">
          <div className="card-header">
            <h3 className="card-title">Colab</h3>
            <div className="card-price">Free</div>
            <p className="card-description">Get started with cloud computing</p>
          </div>
          <div className="card-body">
            <ul className="plan-features-list">
              <li>Access to basic GPUs and TPUs</li>
              <li>5GB storage per session</li>
              <li>Intermittent computing power</li>
              <li>Community support</li>
              <li>Google Drive integration</li>
            </ul>
          </div>
          <div className="card-footer">
            <button className="btn btn-secondary">Get Started</button>
          </div>
        </div> */}

        <div className="pricing-card featured">
          <div className="card-header">
            <h3 className="card-title">Colab Pro</h3>
            <div className="card-price">
              5€<span>/month</span>
            </div>
            <p className="card-description">
              For regular users and researchers
            </p>
          </div>
          <div className="card-body">
            <ul className="plan-features-list">
              <li>Priority access to GPUs and TPUs</li>
              <li>Background execution (12 hours)</li>
              <li>50GB storage</li>
              <li>Priority customer support</li>
              <li>Longer session timeouts</li>
              <li>All free features included</li>
            </ul>
          </div>
          <div className="card-footer">
            <button
              className="btn btn-primary"
              onClick={() => createOrder(500)}
              disabled={loading || !user}
            >
              Subscribe Now
            </button>
          </div>
        </div>

        <div className="pricing-card">
          <div className="card-header">
            <h3 className="card-title">Colab Pro+</h3>
            <div className="card-price">
              10€<span>/month</span>
            </div>
            <p className="card-description">For advanced computing needs</p>
          </div>
          <div className="card-body">
            <ul className="plan-features-list">
              <li>Highest-tier GPU and TPU access</li>
              <li>Background execution (24 hours)</li>
              <li>500GB storage</li>
              <li>Premium support</li>
              <li>Longest session timeouts</li>
              <li>Early access to new features</li>
              <li>All Pro features included</li>
            </ul>
          </div>
          <div className="card-footer">
            <button
              className="btn btn-primary"
              onClick={() => createOrder(1000)}
              disabled={loading || !user}
            >
              Subscribe Now
            </button>
          </div>
        </div>

        {/* <div className="pricing-card">
          <div className="card-header">
            <h3 className="card-title">Colab Enterprise</h3>
            <div className="card-price">Custom</div>
            <p className="card-description">For organizations and teams</p>
          </div>
          <div className="card-body">
            <ul className="plan-features-list">
              <li>Dedicated compute resources</li>
              <li>Admin controls and security features</li>
              <li>Team collaboration tools</li>
              <li>Enterprise support</li>
              <li>VPC and security network options</li>
              <li>Custom quotas and limits</li>
              <li>SSO and advanced auth</li>
            </ul>
          </div>
          <div className="card-footer">
            <button className="btn btn-secondary">Contact Sales</button>
          </div>
        </div> */}
      </div>

      <div className="comparison-section">
        <h2>Detailed Feature Comparison</h2>
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="feature-name">Feature</th>
              <th>Colab</th>
              <th>Colab Pro</th>
              <th>Colab Pro+</th>
              <th>Enterprise</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="feature-name">Price</td>
              <td>Free</td>
              <td>$9.99/month</td>
              <td>$49.99/month</td>
              <td>Custom</td>
            </tr>
            <tr>
              <td className="feature-name">GPU Access</td>
              <td>Basic</td>
              <td>Priority</td>
              <td>Highest-tier</td>
              <td>Dedicated</td>
            </tr>
            <tr>
              <td className="feature-name">TPU Access</td>
              <td>Basic</td>
              <td>Priority</td>
              <td>Highest-tier</td>
              <td>Dedicated</td>
            </tr>
            <tr>
              <td className="feature-name">Storage</td>
              <td>5GB</td>
              <td>50GB</td>
              <td>500GB</td>
              <td>Custom</td>
            </tr>
            <tr>
              <td className="feature-name">Background Execution</td>
              <td>Not supported</td>
              <td>12 hours</td>
              <td>24 hours</td>
              <td>24+ hours</td>
            </tr>
            <tr>
              <td className="feature-name">Session Timeout</td>
              <td>60 minutes</td>
              <td>90 minutes</td>
              <td>120 minutes</td>
              <td>Custom</td>
            </tr>
            <tr>
              <td className="feature-name">Support</td>
              <td>Community</td>
              <td>Priority</td>
              <td>Priority</td>
              <td>Enterprise</td>
            </tr>
            <tr>
              <td className="feature-name">Admin Controls</td>
              <td>No</td>
              <td>No</td>
              <td>No</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td className="feature-name">Team Collaboration</td>
              <td>Basic</td>
              <td>Basic</td>
              <td>Basic</td>
              <td>Advanced</td>
            </tr>
            <tr>
              <td className="feature-name">Security Features</td>
              <td>Standard</td>
              <td>Standard</td>
              <td>Standard</td>
              <td>Enterprise-grade</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="intro">
        <h2>FAQ</h2>
        <p>
          <strong>Can I upgrade or downgrade my plan?</strong>
        </p>
        <p>
          Yes, you can change your subscription at any time from your account
          settings. Changes take effect immediately.
        </p>

        <p>
          <strong>Is there a free trial for Pro and Pro+?</strong>
        </p>
        <p>
          Yes, new subscribers get a one-week free trial of either Pro or Pro+
          before being charged.
        </p>

        <p>
          <strong>What payment methods are accepted?</strong>
        </p>
        <p>
          We accept all major credit cards, debit cards, and other payment
          methods through our secure payment processor.
        </p>

        <p>
          <strong>What is your refund policy?</strong>
        </p>
        <p>
          If you cancel within 7 days of subscription, we'll provide a full
          refund. Otherwise, cancellations take effect at the end of the billing
          period.
        </p>
      </div>
    </div>
  );
}

export default PaymentPlants;
