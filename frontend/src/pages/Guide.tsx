import {
  BookOpen,
  Brain,
  CheckCircle,
  Clock,
  FileSearch,
  MessageSquare,
  Search,
  Sparkles,
  Zap
} from 'lucide-react';

import CustomFooter from '@/components/CustomFooter';
import { CustomHeader } from '@/components/CustomHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import useScrollTo from '@/hooks/scrollTo';

export default function Guide() {
  useScrollTo()(0, 0);

  return (
    <div className="custom-pg guide-page">
      <main className="wrap" role="main">
        <CustomHeader />

        <article className="guide-content">
          <p className="intro">
            Ο Φορολογικός Βοηθός χρησιμοποιεί τεχνολογία τεχνητής νοημοσύνης για
            να σας παρέχει αξιόπιστες απαντήσεις σχετικά με την ελληνική
            φορολογική νομοθεσία. Δείτε πώς επεξεργάζεται τις ερωτήσεις σας βήμα
            προς βήμα.
          </p>

          {/* Process Steps */}
          <section className="process-section">
            <h2>Η Διαδικασία Απάντησης</h2>

            <div className="steps-grid">
              {/* Step 1 */}
              <Card className="step-card featured">
                <CardHeader>
                  <div className="step-number">1</div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Υποβολή Ερώτησης
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Γράφετε την ερώτησή σας στο πεδίο συνομιλίας. Μπορείτε να
                    ρωτήσετε οτιδήποτε σχετικό με τη φορολογική νομοθεσία, όπως:
                  </p>
                  <ul className="example-questions">
                    <li>«Ποιο είναι το αφορολόγητο όριο για το 2024;»</li>
                    <li>«Πώς υπολογίζεται ο φόρος εισοδήματος;»</li>
                    <li>«Ποιες δαπάνες εκπίπτουν από το εισόδημα;»</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card className="step-card featured">
                <CardHeader>
                  <div className="step-number">2</div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Κατανόηση & Επεξεργασία
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Το σύστημα αναλύει την ερώτησή σας και δημιουργεί{' '}
                    <strong>πολλαπλές εκδοχές</strong> της, ώστε να εντοπίσει τα
                    πιο σχετικά έγγραφα. Αυτό βοηθά να βρεθούν πληροφορίες ακόμα
                    κι αν η διατύπωσή σας διαφέρει από την επίσημη ορολογία.
                  </p>
                  <div className="info-box">
                    <Sparkles className="h-4 w-4" />
                    <span>
                      Αναγνωρίζονται αυτόματα οι ημερομηνίες και τα χρονικά
                      πλαίσια στην ερώτησή σας
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Step 3 */}
              <Card className="step-card featured">
                <CardHeader>
                  <div className="step-number">3</div>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Αναζήτηση στα Έγγραφα
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Πραγματοποιείται <strong>υβριδική αναζήτηση</strong> στη
                    βάση δεδομένων της ΑΑΔΕ, συνδυάζοντας:
                  </p>
                  <ul className="feature-list">
                    <li>
                      <FileSearch className="h-4 w-4" />
                      <span>
                        Σημασιολογική αναζήτηση (κατανόηση του νοήματος)
                      </span>
                    </li>
                    <li>
                      <BookOpen className="h-4 w-4" />
                      <span>
                        Αναζήτηση λέξεων-κλειδιών (ακριβής αντιστοίχιση)
                      </span>
                    </li>
                  </ul>
                  <p className="mt-3">
                    Ανακτώνται έως και <strong>30 σχετικά αποσπάσματα</strong>{' '}
                    από νόμους, εγκυκλίους και αποφάσεις.
                  </p>
                </CardContent>
              </Card>

              {/* Step 4 */}
              <Card className="step-card featured">
                <CardHeader>
                  <div className="step-number">4</div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Κατάταξη & Επιλογή
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Τα αποτελέσματα της αναζήτησης αξιολογούνται και
                    κατατάσσονται με βάση τη{' '}
                    <strong>συνάφειά τους με την ερώτηση</strong>. Επιλέγονται
                    τα <strong>10 πιο σχετικά</strong> για να χρησιμοποιηθούν
                    στην απάντηση.
                  </p>
                  <div className="info-box">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      Προτεραιότητα έχουν τα πιο πρόσφατα και ισχύοντα έγγραφα
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Step 5 */}
              <Card className="step-card featured">
                <CardHeader>
                  <div className="step-number">5</div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Δημιουργία Απάντησης
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Η τεχνητή νοημοσύνη συνθέτει την τελική απάντηση
                    χρησιμοποιώντας <strong>αποκλειστικά</strong> τα επιλεγμένα
                    έγγραφα. Η απάντηση περιλαμβάνει:
                  </p>
                  <ul className="answer-features">
                    <li>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Σαφή και κατανοητή εξήγηση</span>
                    </li>
                    <li>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Παραπομπές σε συγκεκριμένους νόμους και άρθρα</span>
                    </li>
                    <li>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Λίστα με τις πηγές που χρησιμοποιήθηκαν</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Step 6 */}
              <Card className="step-card featured">
                <CardHeader>
                  <div className="step-number">6</div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Πηγές & Αναφορές
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Στο τέλος κάθε απάντησης εμφανίζονται{' '}
                    <strong>σύνδεσμοι προς τα πρωτότυπα έγγραφα</strong> που
                    χρησιμοποιήθηκαν, ώστε να μπορείτε να τα συμβουλευτείτε
                    απευθείας.
                  </p>
                  <p className="mt-3 text-muted-foreground">
                    Κάθε πηγή περιλαμβάνει τον τίτλο του εγγράφου, το άρθρο ή
                    την παράγραφο και την ημερομηνία τροποποίησης (αν υπάρχει).
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Features Section */}
          <section className="features-section">
            <h2>Χαρακτηριστικά</h2>

            <div className="features-grid">
              <div className="feature-item">
                <Clock className="h-8 w-8 text-primary" />
                <h3>Ενημερωμένη Πληροφόρηση</h3>
                <p>
                  Το σύστημα λαμβάνει υπόψη την τρέχουσα ημερομηνία και
                  προτεραιοποιεί τις πιο πρόσφατες διατάξεις και τροποποιήσεις.
                </p>
              </div>

              <div className="feature-item">
                <MessageSquare className="h-8 w-8 text-primary" />
                <h3>Συνεχής Συνομιλία</h3>
                <p>
                  Μπορείτε να κάνετε διευκρινιστικές ερωτήσεις ή να ζητήσετε
                  περισσότερες λεπτομέρειες. Το σύστημα θυμάται το πλαίσιο της
                  συνομιλίας.
                </p>
              </div>

              <div className="feature-item">
                <CheckCircle className="h-8 w-8 text-primary" />
                <h3>Αξιόπιστες Πηγές</h3>
                <p>
                  Όλες οι απαντήσεις βασίζονται αποκλειστικά σε επίσημα έγγραφα
                  της ΑΑΔΕ - χωρίς υποθέσεις ή εικασίες.
                </p>
              </div>
            </div>
          </section>

          {/* Tips Section */}
          <section className="tips-section">
            <h2>Συμβουλές για Καλύτερα Αποτελέσματα</h2>

            <Card>
              <CardContent className="tips-content">
                <ul>
                  <li>
                    <strong>Να είστε συγκεκριμένοι:</strong> Αντί για «πώς
                    φορολογούμαι», ρωτήστε «πώς φορολογούνται τα εισοδήματα από
                    ενοίκια για το 2024».
                  </li>
                  <li>
                    <strong>Αναφέρετε το έτος:</strong> Η φορολογική νομοθεσία
                    αλλάζει συχνά, οπότε καθορίστε το έτος που σας ενδιαφέρει.
                  </li>
                  <li>
                    <strong>Κάντε μία ερώτηση τη φορά:</strong> Για πιο ακριβείς
                    απαντήσεις, αποφύγετε τις πολλαπλές ερωτήσεις σε ένα μήνυμα.
                  </li>
                  <li>
                    <strong>Ζητήστε διευκρινίσεις:</strong> Αν η απάντηση δεν
                    είναι πλήρης, μη διστάσετε να ρωτήσετε για περισσότερες
                    λεπτομέρειες.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Disclaimer */}
          <section className="disclaimer-section">
            <Card className="disclaimer-card">
              <CardHeader>
                <CardTitle>Σημαντική Σημείωση</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Ο Φορολογικός Βοηθός παρέχει πληροφορίες για ενημερωτικούς
                  σκοπούς και <strong>δεν υποκαθιστά</strong> τις υπηρεσίες
                  εξειδικευμένου λογιστή ή φοροτεχνικού. Για πολύπλοκες
                  φορολογικές υποθέσεις ή επίσημες δηλώσεις, συνιστούμε να
                  συμβουλευτείτε επαγγελματία.
                </p>
              </CardContent>
            </Card>
          </section>
        </article>
      </main>
      <CustomFooter />
    </div>
  );
}
