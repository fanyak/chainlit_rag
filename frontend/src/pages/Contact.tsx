import { apiClient } from 'api';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import CustomFooter from '@/components/CustomFooter';
import { CustomHeader } from '@/components/CustomHeader';
import PaymentLogos from '@/components/PaymentLogos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/contact', formData);
      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        // Reset form
        setFormData({ name: '', email: '', subject: '', message: '' });
      }
    } catch (err: any) {
      // apiClient.onError already shows a toast, but we also set local error state
      setError(
        err.detail || 'Σφάλμα κατά την αποστολή. Παρακαλώ δοκιμάστε ξανά.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="custom-pg legal-page">
      <main className="wrap" role="main">
        <CustomHeader />

        <article className="legal-content contact-page">
          <h1>Επικοινωνία</h1>
          <p className="intro">
            Είμαστε εδώ για να σας βοηθήσουμε. Επικοινωνήστε μαζί μας για
            οποιαδήποτε απορία ή υποστήριξη.
          </p>

          <div className="contact-container">
            <section className="contact-info">
              <h2>Στοιχεία Επικοινωνίας</h2>

              <div className="info-block">
                <h3>📧 Email</h3>
                <p>
                  <a href="mailto:support@foroschat.gr">support@foroschat.gr</a>
                </p>
                <p className="note">
                  Απαντάμε συνήθως εντός 24-48 ωρών (εργάσιμες ημέρες)
                </p>
              </div>

              <div className="info-block">
                <h3>📞 Τηλέφωνο</h3>
                <p>
                  <a href="tel:+302101234567">+30 210 123 4567</a>
                </p>
                <p className="note">Δευτέρα - Παρασκευή: 09:00 - 17:00</p>
              </div>

              <div className="info-block">
                <h3>📍 Διεύθυνση</h3>
                <p>Foros Chat</p>
                <p>Λεωφόρος Παράδειγμα 123</p>
                <p>11111 Αθήνα, Ελλάδα</p>
              </div>

              <div className="info-block">
                <h3>🏢 Στοιχεία Εταιρείας</h3>
                <p>Επωνυμία: Foros Chat</p>
                <p>ΑΦΜ: 123456789</p>
                <p>ΔΟΥ: Α' Αθηνών</p>
                <p>ΓΕΜΗ: 123456789000</p>
              </div>
            </section>

            <section className="contact-form-section">
              <h2>Φόρμα Επικοινωνίας</h2>

              {submitted ? (
                <div className="success-message">
                  <h3>✅ Ευχαριστούμε για το μήνυμά σας!</h3>
                  <p>
                    Λάβαμε την επικοινωνία σας και θα σας απαντήσουμε το
                    συντομότερο δυνατό.
                  </p>
                  <Button
                    onClick={() => setSubmitted(false)}
                    variant="secondary"
                  >
                    Νέο μήνυμα
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="contact-form">
                  {error && (
                    <div className="error-message">
                      <p>❌ {error}</p>
                    </div>
                  )}

                  <div className="form-group">
                    <Label htmlFor="name">Ονοματεπώνυμο *</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Το όνομά σας"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="example@email.com"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <Label htmlFor="subject">Θέμα *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      minLength={5}
                      maxLength={200}
                      placeholder="Το θέμα του μηνύματός σας"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <Label htmlFor="message">Μήνυμα *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      minLength={10}
                      maxLength={5000}
                      placeholder="Περιγράψτε το ερώτημα ή το πρόβλημά σας..."
                      rows={6}
                      disabled={loading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                  >
                    {loading ? 'Αποστολή...' : 'Αποστολή Μηνύματος'}
                  </Button>
                </form>
              )}
            </section>
          </div>

          <section className="faq-section">
            <h2>Συχνές Ερωτήσεις</h2>

            <div className="faq-item">
              <h3>Πώς μπορώ να ακυρώσω τη συνδρομή μου;</h3>
              <p>
                Μπορείτε να ακυρώσετε τη συνδρομή σας ανά πάσα στιγμή από τις
                ρυθμίσεις του λογαριασμού σας ή επικοινωνώντας μαζί μας. Δείτε
                την <Link to="/terms">Πολιτική Ακύρωσης</Link> για περισσότερες
                λεπτομέρειες.
              </p>
            </div>

            <div className="faq-item">
              <h3>Πώς γίνεται η επιστροφή χρημάτων;</h3>
              <p>
                Εάν δικαιούστε επιστροφή χρημάτων, αυτή θα γίνει στην ίδια
                μέθοδο πληρωμής εντός 5-10 εργάσιμων ημερών. Δείτε τους{' '}
                <Link to="/terms">Όρους Χρήσης</Link> για τις προϋποθέσεις.
              </p>
            </div>

            <div className="faq-item">
              <h3>Είναι ασφαλείς οι πληρωμές;</h3>
              <p>
                Ναι, όλες οι πληρωμές διεκπεραιώνονται μέσω της πλατφόρμας Viva
                Payments, η οποία συμμορφώνεται με τα πρότυπα ασφαλείας PCI-DSS.
              </p>
            </div>

            <div className="faq-item">
              <h3>Πώς προστατεύονται τα δεδομένα μου;</h3>
              <p>
                Εφαρμόζουμε αυστηρά μέτρα ασφαλείας σύμφωνα με τον GDPR. Δείτε
                την <Link to="/privacy">Πολιτική Απορρήτου</Link> για
                περισσότερες πληροφορίες.
              </p>
            </div>
          </section>

          <section className="related-links">
            <h2>Χρήσιμοι Σύνδεσμοι</h2>
            <ul>
              <li>
                <Link to="/privacy">Πολιτική Απορρήτου</Link>
              </li>
              <li>
                <Link to="/terms">Όροι Χρήσης</Link>
              </li>
              <li>
                <Link to="/order">Συνδρομές</Link>
              </li>
            </ul>
          </section>

          <section className="payment-provider">
            <h2>Ασφαλείς Πληρωμές</h2>
            <PaymentLogos />
          </section>
        </article>

        <CustomFooter />
      </main>
    </div>
  );
}
