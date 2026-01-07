import { AmountOrderedType } from '@/schemas/redirectSchema';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { useTranslation } from '@/components/i18n/Translator';

import { IUser } from 'client-types/*';

const LoadingSpinner = () => (
  <svg
    className="mr-2 size-5 animate-spin text-white flex-shrink-0"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

interface FaqItem {
  question: string;
  answer: string;
}

const faqData: FaqItem[] = [
  {
    question: 'Πώς γίνονται οι πληρωμές;',
    answer:
      'Οι πληρωμές πραγματοποιούνται μέσω της ασφαλούς πλατφόρμας Viva Payments, η οποία δέχεται όλες τις κύριες πιστωτικές και χρεωστικές κάρτες.'
  },
  {
    question: 'Είναι ασφαλείς οι πληρωμές;',
    answer:
      'Ναι, όλες οι πληρωμές διεκπεραιώνονται μέσω της πλατφόρμας Viva Payments, η οποία συμμορφώνεται με τα πρότυπα ασφαλείας PCI-DSS. Το Foros Chat δεν αποθηκεύει ποτέ τα στοιχεία της κάρτας σας, ούτε οποιαδήποτε άλλα τραπεζικά δεδομένα ή κωδικούς πρόσβασης.'
  },
  {
    question: 'Υπάρχει δωρεάν δοκιμή;',
    answer:
      'Ναι, οι νέοι χρήστες λαμβάνουν δωρεάν tokens για να δοκιμάσουν τις υπηρεσίες μας πριν πραγματοποιήσουν την 1η τους πληρωμή. Αν εξαντληθούν τα tokens, θα χρειαστεί να επιλέξετε ένα συνδρομητικό πλάνο για να συνεχίσετε να χρησιμοποιείτε την υπηρεσία.'
  },
  {
    question: 'Ποιες μέθοδοι πληρωμής γίνονται αποδεκτές;',
    answer:
      'Η Viva Payments δέχεται όλες τις κύριες πιστωτικές κάρτες, χρεωστικές κάρτες και άλλες μεθόδους πληρωμής όπως πληρωμή μέσω Iris.'
  },
  {
    question: 'Ποια είναι η πολιτική επιστροφής χρημάτων;',
    answer:
      'Καθώς η υπηρεσία βασίζεται στη χρήση tokens για τη συνομιλία σας με το μοντέλο AI, δεν προσφέρουμε επιστροφές χρημάτων για τα tokens που έχετε αναλώσει. Εφόσον συνομιλείτε με το μοντέλο ΑΙ κάνετε χρήση της υπηρεσίας και το ποσό που αντιστοιχεί στα tokens που αναλώνετε αφαιρείται από το υπόλοιπο του λογαριασμού σας. Μπορείτε ωστόσο ανά πάσα στιγμή να ζητήσετε επιστροφή του υπολοίπου που παραμένει στο λογαριασμό σας.'
  },
  {
    question:
      'Ποιές άλλες υπηρεσίες πέρα από τη συνομιλία καλύπτει η συνδρομή;',
    answer:
      'Πέρα απο το καθαρό κόστος των tokens που καταναλώνετε κατά τη συνομιλία σας με το μοντέλο AI, η συνδρομή σας καλύπτει και την λειτουργία της υπηρεσίας μας όπως είναι η αποθήκευση ιστορικού συνομιλιών, η διαχείριση λογαριασμού, η ασφάλεια δεδομένων και η υποστήριξη πελατών.'
  }
];

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="faq-accordion space-y-3">
      {faqData.map((item, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <button
            className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => toggleItem(index)}
            aria-expanded={openIndex === index}
          >
            <span className="font-medium">{item.question}</span>
            <ChevronDown
              className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                openIndex === index ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-200 ${
              openIndex === index ? 'max-h-96' : 'max-h-0'
            }`}
          >
            <p className="p-4 text-gray-600">{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentPlants({
  createOrder,
  loading,
  user
}: {
  createOrder: (amount: AmountOrderedType) => Promise<void>;
  loading: boolean;
  user: IUser | null | undefined;
}) {
  const [active, setActive] = useState<number | null>(null);
  const { t } = useTranslation();
  const handleClick = (index: number, amount: AmountOrderedType): void => {
    setActive(index);
    createOrder(amount);
  };
  return (
    <div className="pricing-container">
      <div className="intro">
        <h4>Επιλέξτε τύπο συνδρομής {user?.identifier}</h4>
        <p>
          Τα πλάνα συνδρομής υπολογίζονται με βάση την αξία των tokens που
          καταναλώνετε κατά τη συνομιλία σας με το μοντέλο AI. <br />
          Κάθε φορά που συνομιλείτε αφαιρείται από το υπόλοιπο του λογαριασμού
          σας η αξία των tokens που χρησιμοποιήσατε.
          <br /> Μπορείτε να ανανεώσετε το υπόλοιπο του λογαριασμού σας όποτε το
          επιθυμείτε επιλέγοντας ένα από τα παρακάτω πλάνα.
        </p>
        <p>
          Για πληροφορίες σχετικά με το πώς υπολογίζεται η κατανάλωση των
          tokens, επισκεφθείτε την ενότητα{' '}
          <a href="/guide#token-usage" style={{ color: '#1a73e8' }}>
            Οδηγός
          </a>
          .
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
            <h3 className="card-title">Ελάχιστη Συνδρομή</h3>
            <div className="card-price">
              5€<span></span>
            </div>
            <p className="card-description">
              Για χρήστες που θέλουν να δοκιμάσουν τις δυνατότητες μας
            </p>
          </div>
          <div className="card-body">
            <ul className="plan-features-list">
              <li>Αντιστοιχεί σε περίπου 20 ερωτήματα*</li>
              <li>
                Το ποσό παραμένει στο λογαριασμό σας έως ότου το χρησιμοποιήσετε
              </li>
              <li>
                Μπορείτε να ζητήσετε να σας επιστραφεί το υπόλοιπο ανά πάσα
                στιγμή
              </li>
              <li>Πρόσβαση σε όλα τα χαρακτηριστικά της πλατφόρμας</li>
              <li>Υποστήριξη μέσω email</li>
              <li>
                *Το ακριβές πλήθος των ερωτημάτων εξαρτάται από τη πολυπλοκότητα
                του ερωτήματος και τη χρήση tokens ανά ερώτημα
              </li>
            </ul>
          </div>
          <div className="card-footer">
            <button
              className="btn btn-primary"
              onClick={() => handleClick(1, 500)}
              disabled={loading}
            >
              {loading && active === 1 ? (
                <>
                  <LoadingSpinner />
                  <span>{t('common.status.loading')}</span>
                </>
              ) : (
                <span>{t('payments.pay')}</span>
              )}
            </button>
          </div>
        </div>

        <div className="pricing-card">
          <div className="card-header">
            <h3 className="card-title">Tυπική Συνδρομή</h3>
            <div className="card-price">
              10€<span></span>
            </div>
            <p className="card-description">
              Για χρήστες που θέτουν τακτικα ερωτήματα στο μοντέλο
            </p>
          </div>
          <div className="card-body">
            <ul className="plan-features-list">
              <li>Αντιστοιχεί σε περίπου 40 ερωτήματα*</li>
              <li>
                Το ποσό παραμένει στο λογαριασμό σας έως ότου το χρησιμοποιήσετε
              </li>
              <li>
                Μπορείτε να ζητήσετε να σας επιστραφεί το υπόλοιπο ανά πάσα
                στιγμή
              </li>
              <li>Πρόσβαση σε όλα τα χαρακτηριστικά της πλατφόρμας</li>
              <li>Υποστήριξη μέσω email</li>
              <li>
                *Το ακριβές πλήθος των ερωτημάτων εξαρτάται από τη πολυπλοκότητα
                του ερωτήματος και τη χρήση tokens ανά ερώτημα
              </li>
            </ul>
          </div>
          <div className="card-footer">
            <button
              className="btn btn-primary"
              onClick={() => handleClick(2, 1000)}
              disabled={loading}
            >
              {loading && active === 2 ? (
                <>
                  <LoadingSpinner />
                  {t('common.status.loading')}
                </>
              ) : (
                <span>{t('payments.pay')}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="intro">
        <h2>FAQ</h2>
        <FaqAccordion />
      </div>
    </div>
  );
}

export default PaymentPlants;
