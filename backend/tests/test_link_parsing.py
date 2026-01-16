# ruff: noqa: RUF001

"""
Link Parsing Element tests module.

NOTE: Async test functions do not require @pytest.mark.asyncio decorator
because pyproject.toml has `asyncio_mode = "auto"` configured. This enables
pytest-asyncio to automatically detect and run async test functions.
Sinse the aysncio_mode is set to "auto", pytest-asyncio will handle both
synchronous and asynchronous test functions appropriately without needing
the explicit decorator.
We make all test functions async to keep consistency and use the async client
"""

# import re
from dotenv import load_dotenv

from utils_b import parse_links_to_markdown

load_dotenv()


s1 = r": Άρθρο 9, παρ. δ' του ν.2880/01 (σελ. 11, 2020_2120\885_2025.pdf)"
s2 = r"Βάσει των παρεχόμενων πληροφοριών, δεν υπάρχει διάταξη που να απαγορεύει ρητά τη χρήση κατοικίας ως έδρας νομικού προσώπου (συγκεκριμένα μονοπρόσωπης ΙΚΕ), ωστόσο, η φύση της μίσθωσης και ο μισθωτής πρέπει να αντικατοπτρίζουν την πραγματική χρήση για φορολογικούς σκοπούς. Σύμφωνα με τα στοιχεία:Σε περίπτωση που ακίνητο εκμισθώνεται για επαγγελματική χρήση, η δήλωση πληροφοριακών στοιχείων μίσθωσης ακίνητης περιουσίας πρέπει να αναγράφει ως είδος μίσθωσης «επαγγελματική/εμπορική» και όχι «αστική (κατοικίας)» (Πηγή: assets/101_202/2149_2025.pdf, σελ. 4).  Εάν ένα φυσικό πρόσωπο υποβάλει δήλωση πληροφοριακών στοιχείων μίσθωσης ακίνητης περιουσίας εκ παραδρομής ως αστική (κατοικίας) αντί για επαγγελματική/εμπορική, και στη συνέχεια διορθώσει αυτή τη δήλωση, αυτό υποδηλώνει την ανάγκη ορθής δήλωσης του είδους της μίσθωσης ανάλογα με τη χρήση του ακινήτου (Πηγή: assets/101_202/2149_2025.pdf, σελ. 4). Η αντικειμενική δαπάνη διαβίωσης, στην περίπτωση δωρεάν παραχώρησης κύριας κατοικίας από γονείς σε τέκνα ή το αντίθετο, βαρύνει αυτόν που χρησιμοποιεί την κατοικία (Πηγή: assets/egxeiridia_kwdikes/egxeiridio_erotiseis_apantiseis_forologias_2025.pdf, σελ. 33). Ωστόσο, αυτό αφορά δωρεάν παραχώρηση μεταξύ φυσικών προσώπων και όχι μίσθωση από νομικό πρόσωπο. Τα συμφωνητικά μίσθωσης αστικών ακινήτων προσκομίζονται για θεώρηση από τον εκμισθωτή (ή τον μισθωτή) εντός τριάντα (30) ημερών από τη σύνταξή τους (Πηγή: 3030_3130\214_2025(1).pdf, σελ. 6). Από τα παραπάνω προκύπτει ότι, αν και δεν υπάρχει ρητή απαγόρευση, η φορολογική διοίκηση απαιτεί η δήλωση μίσθωσης να αντικατοπτρίζει την πραγματική χρήση του ακινήτου. Εφόσον το ακίνητο θα χρησιμοποιηθεί και ως έδρα της ΙΚΕ, η μίσθωση θεωρείται επαγγελματική/εμπορική. Συνεπώς, η σύσταση του ΚΕΦΟΔΕ για τροποποίηση του μισθωτηρίου ώστε να αναγράφεται ως μισθωτής η εταιρεία και ως είδος μίσθωσης «επαγγελματική» είναι σύμφωνη με την ανάγκη ορθής δήλωσης της χρήσης του ακινήτου για φορολογικούς σκοπούς."
s3 = r"""Για να διαχειριστείτε το ακίνητο για βραχυχρόνια μίσθωση (Airbnb) και να φορολογείστε μόνο εσείς ως διαχειρίστρια, χωρίς να φορολογείται ο πατέρας σας που είναι επικαρπωτής, θα πρέπει να συνάψετε σύμβαση μακροχρόνιας μίσθωσης με τον πατέρα σας (επικαρπωτή) και την αδερφή σας (συνιδιοκτήτρια), η οποία να σας παραχωρεί το δικαίωμα υπεκμίσθωσης για σκοπούς βραχυχρόνιας μίσθωσης.

Σε αυτή την περίπτωση:
1.  **Εσείς (η διαχειρίστρια)**: Θα θεωρείστε ότι προβαίνετε σε βραχυχρόνια μίσθωση του ακινήτου. Η υποχρέωση έναρξης επιχειρηματικής δραστηριότητας εξαρτάται από τον αριθμό των ακινήτων που διαθέτετε για βραχυχρόνια μίσθωση. Εάν διαθέτετε έως δύο (2) ακίνητα, δεν απαιτείται έναρξη επιχειρηματικής δραστηριότητας. Εάν διαθέτετε τρία (3) ακίνητα και άνω, απαιτείται έναρξη επιχειρηματικής δραστηριότητας (FAQs_vraxyxronias_diamonis_1.pdf, σελ. 5, 6).
2.  **Ο πατέρας σας (επικαρπωτής) και η αδερφή σας (συνιδιοκτήτρια)**: Το εισόδημα που θα προκύπτει για αυτούς από τη μακροχρόνια μίσθωση προς εσάς θα φορολογείται ως εισόδημα από ακίνητη περιουσία, χωρίς να έχουν υποχρέωση έναρξης επιχειρηματικής δραστηριότητας για τη βραχυχρόνια μίσθωση (FAQs_vraxyxronias_diamonis_1.pdf, σελ. 5).

**Κοινές υποχρεώσεις για τη βραχυχρόνια μίσθωση:**
*   Εγγραφή του ακινήτου στο «Μητρώο Ακινήτων Βραχυχρόνιας Διαμονής» της Α.Α.Δ.Ε. και λήψη Αριθμού Μητρώου Ακινήτου (ΑΜΑ).
*   Αναγραφή του ΑΜΑ σε εμφανές σημείο κατά την ανάρτηση του ακινήτου στις ψηφιακές πλατφόρμες και σε κάθε μέσο προβολής.
*   Υποβολή Δηλώσεων Βραχυχρόνιας Διαμονής για κάθε ΑΜΑ.
*   Οριστικοποίηση του πίνακα συνδικαιούχων εισοδήματος έως 28/2 του έτους υποβολής των δηλώσεων φορολογίας εισοδήματος (FAQs_vraxyxronias_diamonis_1.pdf, σελ. 6).

**Σημαντική σημείωση για το 1ο, 2ο και 3ο Δημοτικό Διαμέρισμα του Δήμου Αθηναίων:**
Από την 1η Ιανουαρίου 2025 έως την 31η Δεκεμβρίου 2025, δεν επιτρέπεται η εγγραφή για πρώτη φορά στο Μητρώο Ακινήτων Βραχυχρόνιας Διαμονής για ακίνητα που βρίσκονται σε αυτές τις περιοχές (ν. 4446/2016, παρ. 2Α, όπως προστέθηκε με την παράγραφο 1 του άρθρου 29 του ν. 5162/2024, Α' 198, πηγή: 3434_3534\96KsPs46MP3Z_62Th_2025.pdf, σελ. 3).

**Πηγές:**
*   FAQs_vraxyxronias_diamonis_1.pdf, σελ. 5, 6, assets/egxeiridia_kwdikes/FAQs_vraxyxronias_diamonis_1.pdf
*   3434_3534\96KsPs46MP3Z_62Th_2025.pdf, σελ. 3, 5, 3434_3534\96KsPs46MP3Z_62Th_2025.pdf
*   570_2025.pdf, σελ. 4, 2525_2625\570_2025.pdf'"""

# def replacer(match):
#     file_path = match.group(0)
#     # Replace with link markdown format
#     # return f'<a href="{file_path}">{os.path.basename(file_path)}</a>'
#     return f'[{file_path}]({os.path.abspath(file_path)})'

# for s in [s2]:
# matches = re.findall(r"[\w\\\/]+\.pdf", s2)
# matches = re.findall(r"[^\s,]+\.pdf", s2)
# print([rf"{match}" for match in matches])
# print(parse_links_to_markdown(s))

# s = "Πηγή: 3030_3130\\214_2025(1).pdf, σελ. 6."
# matches = re.findall(r"[^\s,]+\.pdf", s)
# print(matches)


# def test_parse_links_to_markdown():
#     assert parse_links_to_markdown(
#         s1) == "- [885_2025.pdf](https://storage.googleapis.com/aade_docs/assets/2020_2120/885_2025.pdf)"
#     # print(parse_links_to_markdown(s2))
#     s2c = [
#         "- [2149_2025.pdf](https://storage.googleapis.com/aade_docs/assets/101_202/2149_2025.pdf)",
#         "- [egxeiridio_erotiseis_apantiseis_forologias_2025.pdf](https://storage.googleapis.com/aade_docs/assets/egxeiridia_kwdikes/egxeiridio_erotiseis_apantiseis_forologias_2025.pdf)",
#         "- [214_2025(1).pdf](https://storage.googleapis.com/aade_docs/assets/3030_3130/214_2025(1).pdf)"
#     ]
#     s3c = [

#         "- [FAQs_vraxyxronias_diamonis_1.pdf](https://storage.googleapis.com/aade_docs/assets/FAQs_vraxyxronias_diamonis_1.pdf)",
#         "- [96KsPs46MP3Z_62Th_2025.pdf](https://storage.googleapis.com/aade_docs/assets/3434_3534/96KsPs46MP3Z_62Th_2025.pdf)",
#         "- [570_2025.pdf](https://storage.googleapis.com/aade_docs/assets/2525_2625/570_2025.pdf)",
#         "- [570_2025.pdf](https://storage.googleapis.com/aade_docs/assets/570_2025.pdf)",
#         "- [FAQs_vraxyxronias_diamonis_1.pdf](https://storage.googleapis.com/aade_docs/assets/egxeiridia_kwdikes/FAQs_vraxyxronias_diamonis_1.pdf)"
#     ]

#     for item in parse_links_to_markdown(s2).split("\n"):
#         assert item in s2c
#     assert len(parse_links_to_markdown(s2).split("\n")) == len(s2c)

#     for item in parse_links_to_markdown(s3).split("\n"):
#         assert item in s3c
#     assert len(parse_links_to_markdown(s3).split("\n")) == len(s3c)

buffer = """Ως τον Ιανουάριο του 2026, η υποχρέωση διασύνδεσης των τερματικών POS με τα Ταμειακά Συστήματα (ΦΗΜ ή ΥΠΑΗΕΣ) ισχύει καταρχήν για όλες τις οντότητες του άρθρου 1 του ν. 4308/2014 που είναι Χρήστες υπηρεσιών πληρωμών και διαθέτουν Μέσα Πληρωμών (Α.1155/09-10-2023, Άρθρο 2, παρ. 1, assets/202_302_and_13/2056_2025.pdf).
Ειδικότερα, οι οντότητες που χρησιμοποιούν Φορολογικούς Ηλεκτρονικούς Μηχανισμούς (ΦΗΜ) και δεν κάνουν χρήση συστήματος λογισμικού (ERP) διασυνδέονται υποχρεωτικά με την ΑΑΔΕ σύμφωνα με την Α.1098/2022 (Α.1155/09-10-2023, Άρθρο 2, παρ. 2, assets/202_302_and_13/1162_2025.pdf).
Στην περίπτωση Ταμειακού Συστήματος ΦΗΜ με σύστημα λογισμικού (ERP), ο Χρήστης υπηρεσιών πληρωμών οφείλει να διασφαλίζει τη συμμόρφωσή του είτε στα οριζόμενα της Α.1155/2023 είτε στα οριζόμενα της Α.1098/2022 (Α.1074/2024, Άρθρο 1, παρ. 1, assets/3737_3837/A__1074_2024.pdf).
Ωστόσο, οι συναλλαγές οντοτήτων που εμπίπτουν στις διατάξεις της ΠΟΛ.1002/2014 και εξαιρούνται από την υποχρεωτική χρήση ΦΗΜ, καταλαμβάνονται από τα οριζόμενα της Α.1155/2023, εφόσον οι οντότητες αυτές κάνουν χρήση ΦΗΜ (Α.1074/2024, Άρθρο 1, παρ. 1, assets/3737_3837/A__1074_2024.pdf).
Επιπλέον, η Ε.2044/19-06-2024 εγκύκλιος διευκρινίζει ότι αν μια επιχείρηση διενεργεί συναλλαγές για τις οποίες δεν είναι υποχρεωτική η χρήση ΦΗΜ σύμφωνα με την ΠΟΛ.1002/2014 και δεν χρησιμοποιεί ΦΗΜ, δεν έχει τη σχετική υποχρέωση διασύνδεσης για τις συγκεκριμένες συναλλαγές (Ε.2044/19-06-2024, Παράρτημα, Ερώτηση 2, assets/707_807/977_2025.pdf).
Συνεπώς, για επαγγελματίες παροχής υπηρεσιών που δεν έχουν υποχρέωση χρήσης ΦΗΜ και δεν χρησιμοποιούν ΦΗΜ, δεν υφίσταται ρητή υποχρέωση διασύνδεσης ERP-POS.
Πηγές:
Α.1155/09-10-2023, Άρθρο 2, παρ. 1, σελ. 7, αρχείο: assets/202_302_and_13/2056_2025.pdf
Α.1155/09-10-2023, Άρθρο 2, παρ. 2, σελ. 6, αρχείο: assets/202_302_and_13/1162_2025.pdf
Α.1074/2024, Άρθρο 1, παρ. 1, σελ. 3, αρχείο: assets/3737_3837/A__1074_2024.pdf
"""

metadata = [
    {
        "author": "LIZA AVGIKOU",
        "creationdate": "2025-07-09T11:26:45+03:00",
        "creator": "Microsoft® Word 2019",
        "moddate": "2025-07-09T11:26:45+03:00",
        "page": 8.0,
        "page_label": "9",
        "producer": "Microsoft® Word 2019",
        "source": "assets/303_403/2017_2025.pdf",
        "total_pages": 15.0,
        "title": None,
        "subject": None,
        "trapped": None,
        "keywords": None,
        "company": None,
        "created": None,
        "lastsaved": None,
        "sourcemodified": None,
        "id": "065c1f19-1a47-4ac2-8e21-3b0e802adc7d",
        "_id": "065c1f19-1a47-4ac2-8e21-3b0e802adc7d",
        "_collection_name": "aade_docs_faiss",
        "relevance_score": 0.6929958,
    },
    {
        "author": "LIZA AVGIKOU",
        "creationdate": "2025-07-09T11:26:45+03:00",
        "creator": "Microsoft® Word 2019",
        "moddate": "2025-07-09T11:26:45+03:00",
        "page": 9.0,
        "page_label": "10",
        "producer": "Microsoft® Word 2019",
        "source": "assets/303_403/2017_2025.pdf",
        "total_pages": 15.0,
        "title": None,
        "subject": None,
        "trapped": None,
        "keywords": None,
        "company": None,
        "created": None,
        "lastsaved": None,
        "sourcemodified": None,
        "id": "33ba4312-f6de-4550-9ce9-f1f232d299c9",
        "_id": "33ba4312-f6de-4550-9ce9-f1f232d299c9",
        "_collection_name": "aade_docs_faiss",
        "relevance_score": 0.685971,
    },
    {
        "author": "Σοφια ΠΑΝΤΕΛΙΔΟΥ",
        "creationdate": "2025-06-13T11:12:26+03:00",
        "creator": "Microsoft® Word 2019",
        "moddate": "2025-06-13T11:12:26+03:00",
        "page": 9.0,
        "page_label": "10",
        "producer": "Microsoft® Word 2019",
        "source": "assets/707_807/977_2025.pdf",
        "total_pages": 13.0,
        "title": None,
        "subject": None,
        "trapped": None,
        "keywords": None,
        "company": None,
        "created": None,
        "lastsaved": None,
        "sourcemodified": None,
        "id": "e8548179-0129-47d9-b046-5631e69b4c78",
        "_id": "e8548179-0129-47d9-b046-5631e69b4c78",
        "_collection_name": "aade_docs_faiss",
        "relevance_score": 0.67166495,
    },
    {
        "author": "ypoik",
        "creationdate": "2025-07-17T09:34:49+03:00",
        "creator": "Microsoft® Word 2019",
        "moddate": "2025-07-17T09:34:49+03:00",
        "page": 6.0,
        "page_label": "7",
        "producer": "Microsoft® Word 2019",
        "source": "assets/202_302_and_13/2056_2025.pdf",
        "total_pages": 14.0,
        "title": "",
        "subject": None,
        "trapped": None,
        "keywords": None,
        "company": None,
        "created": None,
        "lastsaved": None,
        "sourcemodified": None,
        "id": "18f50220-9694-4f09-a6c2-99c7017b0e60",
        "_id": "18f50220-9694-4f09-a6c2-99c7017b0e60",
        "_collection_name": "aade_docs_faiss",
        "relevance_score": 0.53866833,
    },
    {
        "author": "s0562001",
        "creationdate": "2025-07-21T13:35:49+03:00",
        "creator": "Microsoft® Word 2019",
        "moddate": "2025-07-21T13:35:49+03:00",
        "page": 5.0,
        "page_label": "6",
        "producer": "Microsoft® Word 2019",
        "source": "assets/202_302_and_13/1162_2025.pdf",
        "total_pages": 18.0,
        "title": None,
        "subject": None,
        "trapped": None,
        "keywords": None,
        "company": None,
        "created": None,
        "lastsaved": None,
        "sourcemodified": None,
        "id": "69426e2b-3962-4891-9b7c-2c45c9666e08",
        "_id": "69426e2b-3962-4891-9b7c-2c45c9666e08",
        "_collection_name": "aade_docs_faiss",
        "relevance_score": 0.5315261,
    },
    {
        "producer": "Microsoft® Word 2019",
        "creator": "Microsoft® Word 2019",
        "creationdate": "2025-01-16T09:24:45+02:00",
        "author": "S0113601",
        "moddate": "2025-01-16T09:24:45+02:00",
        "source": "assets/3938_4038/3446_2024.pdf",
        "total_pages": 16,
        "page": 6,
        "page_label": "7",
        "_id": "01c8e98b-1096-4528-a6b4-682cfbea6615",
        "_collection_name": "aade_docs_faiss",
        "relevance_score": 0.529191,
    },
    {
        "author": "Σοφια ΠΑΝΤΕΛΙΔΟΥ",
        "creationdate": "2025-06-13T11:12:26+03:00",
        "creator": "Microsoft® Word 2019",
        "moddate": "2025-06-13T11:12:26+03:00",
        "page": 8.0,
        "page_label": "9",
        "producer": "Microsoft® Word 2019",
        "source": "assets/707_807/977_2025.pdf",
        "total_pages": 13.0,
        "title": None,
        "subject": None,
        "trapped": None,
        "keywords": None,
        "company": None,
        "created": None,
        "lastsaved": None,
        "sourcemodified": None,
        "id": "0007db22-e0bf-451b-aa22-849792a90f50",
        "_id": "0007db22-e0bf-451b-aa22-849792a90f50",
        "_collection_name": "aade_docs_faiss",
        "relevance_score": 0.528169,
    },
    {
        "author": "user",
        "creationdate": "2025-07-21T14:26:44+03:00",
        "creator": "Microsoft® Word 2019",
        "moddate": "2025-07-21T14:26:44+03:00",
        "page": 4.0,
        "page_label": "5",
        "producer": "Microsoft® Word 2019",
        "source": "assets/101_202/2123_2025.pdf",
        "total_pages": 13.0,
        "title": None,
        "subject": None,
        "trapped": None,
        "keywords": None,
        "company": None,
        "created": None,
        "lastsaved": None,
        "sourcemodified": None,
        "id": "ba37411f-de4a-4bda-b986-1aff8669c2ea",
        "_id": "ba37411f-de4a-4bda-b986-1aff8669c2ea",
        "_collection_name": "aade_docs_faiss",
        "relevance_score": 0.51866865,
    },
    {
        "author": "s0562001",
        "creationdate": "2025-07-21T13:35:49+03:00",
        "creator": "Microsoft® Word 2019",
        "moddate": "2025-07-21T13:35:49+03:00",
        "page": 7.0,
        "page_label": "8",
        "producer": "Microsoft® Word 2019",
        "source": "assets/202_302_and_13/1162_2025.pdf",
        "total_pages": 18.0,
        "title": None,
        "subject": None,
        "trapped": None,
        "keywords": None,
        "company": None,
        "created": None,
        "lastsaved": None,
        "sourcemodified": None,
        "id": "6f5a6d93-eff1-47aa-b864-560a712f36cb",
        "_id": "6f5a6d93-eff1-47aa-b864-560a712f36cb",
        "_collection_name": "aade_docs_faiss",
        "relevance_score": 0.49802306,
    },
    {
        "producer": "LibreOffice 6.0; modified using @PRODUCT_NAME@ @RELEASENUMBER@ based on iText 2.1.7",
        "creator": "Writer",
        "creationdate": "2024-05-27T11:01:23+03:00",
        "moddate": "2024-05-27T11:01:48+03:00",
        "author": "Νικος Τσαγκαρης",
        "source": "assets/3737_3837/A__1074_2024.pdf",
        "total_pages": 5,
        "page": 2,
        "page_label": "3",
        "_id": "2b70acaf-cd2b-49b0-a2e3-2ce0cb4da261",
        "_collection_name": "aade_docs_faiss",
        "relevance_score": 0.45914948,
    },
]


def test_parse_artifacts_to_markdown():
    # item_fmt = "- {}"

    # formated_metadata = [
    #     item_fmt.format(
    #         f"[{os.path.basename(path)}]({get_storage_url()}{path})")
    #     for path in [
    #         manipulate_path(d.get("source", "unknown")) for d in metadata
    #     ]
    # ]
    # print(formated_metadata)
    expected_output = [
        "- [A__1074_2024.pdf](https://storage.googleapis.com/aade_docs/assets/3737_3837/A__1074_2024.pdf)",
        "- [1162_2025.pdf](https://storage.googleapis.com/aade_docs/assets/202_302_and_13/1162_2025.pdf)",
        "- [2056_2025.pdf](https://storage.googleapis.com/aade_docs/assets/202_302_and_13/2056_2025.pdf)",
        "- [977_2025.pdf](https://storage.googleapis.com/aade_docs/assets/707_807/977_2025.pdf)",
    ]
    parsed = parse_links_to_markdown(buffer, metadata)
    # print(parsed)
    assert isinstance(parsed, str)
    # for item in parsed.split("\n"):
    #     assert item.startswith("- ")
    for item in expected_output:
        assert item in parsed
