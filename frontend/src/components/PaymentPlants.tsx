import { AmountOrderedType } from '@/schemas/redirectSchema';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { useTranslation } from '@/components/i18n/Translator';

import { IUser } from 'client-types/*';

import LoadingSpinner from './ui/loading-button-spinner';

interface FaqItem {
  question: string;
  answer: string;
}

const faqData: FaqItem[] = [
  {
    question: 'Πώς γίνονται οι πληρωμές;',
    answer:
      'Οι πληρωμές πραγματοποιούνται μέσω της ασφαλούς πλατφόρμας Viva Payments, η οποία δέχεται όλες τις κύριες πιστωτικές και χρεωστικές κάρτες. Το Foros chat δεν διαχειρίζεται απευθείας τις πληρωμές σας, ούτε αποθηκεύει τα στοιχεία της κάρτας σας.'
  },
  {
    question: 'Είναι ασφαλείς οι πληρωμές;',
    answer:
      'Όλες οι πληρωμές διεκπεραιώνονται μέσω της πλατφόρμας Viva Payments, η οποία συμμορφώνεται με τα πρότυπα ασφαλείας PCI-DSS. Το Foros Chat δεν αποθηκεύει ποτέ τα στοιχεία της κάρτας σας, ούτε οποιαδήποτε άλλα τραπεζικά δεδομένα ή κωδικούς πρόσβασης.'
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
      'Η τιμολόγηση κάθε ερωτήματος περιλαμβάνει: (1) το κόστος tokens που καταναλώνετε κατά τη συνομιλία με το μοντέλο AI, (2) ένα πάγιο κόστος €0,01 ανά ερώτημα για υπηρεσίες αναζήτησης και ανάκτησης εγγράφων, και (3) την κάλυψη λειτουργικών εξόδων όπως αποθήκευση ιστορικού, διαχείριση λογαριασμού, ασφάλεια δεδομένων και υποστήριξη πελατών.'
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
  _user
}: {
  createOrder: (amount: AmountOrderedType) => Promise<void>;
  loading: boolean;
  _user: IUser | null | undefined;
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
        <h3>
          <Sparkles className="h-4 w-4 mr-1" fill="#0b4ea2" />
          Μοντέλο χρέωσης: Pay-as-you-go
        </h3>
        <p>
          {' '}
          <strong>Πληρώνετε μόνο για ό,τι χρησιμοποιείτε.</strong> Δεν υπάρχουν
          μηνιαίες συνδρομές ή δεσμεύσεις. Με την πληρωμή σας προσθέτετε
          υπόλοιπο στον λογαριασμό σας, και αυτό καταναλώνεται σταδιακά με κάθε
          ερώτημα.
        </p>

        <h3>
          <Sparkles className="h-4 w-4 mr-1" fill="#0b4ea2" />
          Πώς υπολογίζεται το κόστος κάθε ερωτήματος:
        </h3>
        <ol>
          <li>
            {' '}
            <strong>Βασικό κόστος tokens:</strong> Υπολογίζεται με βάση την
            τιμολόγηση του μοντέλου AI (Gemini 2.5 flash) για τα tokens που
            καταναλώνονται σε κάθε ερώτημα.
          </li>
          <li>
            {' '}
            <strong>Κόστος λειτουργίας:</strong> Προστίθεται για την κάλυψη
            λειτουργικών εξόδων: λειτουργία ιστοσελίδας, αναζήτηση και ανάκτηση
            εγγράφων, αποθήκευση ιστορικού, διαχείριση λογαριασμού, ασφάλεια
            δεδομένων και υποστήριξη πελατών.
          </li>
        </ol>

        <p>
          {' '}
          <strong>Συνολικό κόστος ανά ερώτημα</strong> = Κόστος tokens + Κόστος
          λειτουργίας
        </p>

        <ul>
          <li>
            Κάθε φορά που συνομιλείτε, το συνολικό κόστος του ερωτήματος
            αφαιρείται αυτόματα από το υπόλοιπο του λογαριασμού σας.
          </li>
          <li>
            Μπορείτε να ανανεώσετε το υπόλοιπό σας όποτε το επιθυμείτε
            επιλέγοντας ένα από τα παρακάτω πλάνα.
          </li>
          <li>
            Για αναλυτικές πληροφορίες σχετικά με το πώς λειτουργεί η υπηρεσία,
            επισκεφθείτε την ενότητα{' '}
            <a href="/guide#token-usage" style={{ color: '#1a73e8' }}>
              Οδηγός
            </a>
            .
          </li>
        </ul>
      </div>

      <div className="pricing-grid">
        <div className="pricing-card featured">
          <div className="card-header">
            <h3 className="card-title">Ελάχιστη Πίστωση</h3>
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
                Το υπόλοιπο της συνδρομής σας παραμένει στο λογαριασμό σας έως
                ότου το χρησιμοποιήσετε
              </li>
              <li>
                Μπορείτε να ζητήσετε να σας επιστραφεί το υπόλοιπο ανά πάσα
                στιγμή
              </li>
              <li>Πρόσβαση σε όλα τα χαρακτηριστικά της πλατφόρμας</li>
              <li>Υποστήριξη μέσω email</li>
            </ul>
            <p>
              *Το ακριβές πλήθος των ερωτημάτων εξαρτάται από τη πολυπλοκότητα
              του ερωτήματος και τη χρήση tokens ανά ερώτημα
            </p>
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
            <h3 className="card-title">Tυπική Πίστωση</h3>
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
                Το υπόλοιπο της συνδρομής σας παραμένει στο λογαριασμό σας έως
                ότου το χρησιμοποιήσετε
              </li>
              <li>
                Μπορείτε να ζητήσετε να σας επιστραφεί το υπόλοιπο ανά πάσα
                στιγμή
              </li>
              <li>Πρόσβαση σε όλα τα χαρακτηριστικά της πλατφόρμας</li>
              <li>Υποστήριξη μέσω email</li>
            </ul>
            <p>
              *Το ακριβές πλήθος των ερωτημάτων εξαρτάται από τη πολυπλοκότητα
              του ερωτήματος και τη χρήση tokens ανά ερώτημα
            </p>
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
