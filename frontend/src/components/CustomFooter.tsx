import { Link } from 'react-router-dom';

import PaymentLogos from './PaymentLogos';

function CustomFooter() {
  return (
    <footer className="custom-footer">
      <div className="footer-content">
        <div className="footer-section m-auto">
          <Link to="/">Foros Chat</Link>
          <p>
            <Link to="/">Φορολογικός Βοηθός με Τεχνητή Νοημοσύνη</Link>
          </p>
        </div>

        <div className="footer-section">
          <h4>Νομικά</h4>
          <ul>
            <li>
              <Link to="/privacy">Πολιτική Απορρήτου</Link>
            </li>
            <li>
              <Link to="/terms">Όροι Χρήσης</Link>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Υποστήριξη</h4>
          <ul>
            <li>
              <Link to="/contact">Επικοινωνία</Link>
            </li>
            <li>
              <Link to="/order">Συνδρομές</Link>
            </li>
          </ul>
        </div>

        <div className="footer-section payment-section">
          <h4>Ασφαλείς Πληρωμές</h4>
          <PaymentLogos />
        </div>
      </div>

      <div className="footer-bottom">
        <div>
          © {new Date().getFullYear()} Foros Chat. Όλα τα δικαιώματα
          κατοχυρωμένα.
        </div>
        {/* <div className="footer-links">
          <Link to="/privacy">Απόρρητο</Link>
          <span>·</span>
          <Link to="/terms">Όροι</Link>
          <span>·</span>
          <Link to="/contact">Επικοινωνία</Link>
        </div> */}
      </div>
    </footer>
  );
}

export default CustomFooter;
