import { TranslationKey } from './en';

export const hi: Record<TranslationKey, string> = {
  // Brand & Nav
  appName: 'पहचानसेतु',
  appTagline: 'पोर्टल से रिजेक्ट होने से पहले गड़बड़ी पकड़ें',
  disclaimer: 'यह एक जाँच और मार्गदर्शन है, आधिकारिक सत्यापन नहीं। यहाँ कोई डेटा स्टोर नहीं किया जाता।',
  clearData: 'सभी डेटा मिटाएं',
  sampleDataBadge: 'नमूना डेटा (डेमो मोड)',
  start: 'जाँच शुरू करें',
  demo: 'डेमो आज़माएँ',
  back: 'पीछे जाएँ',
  continue: 'आगे बढ़ें',
  submit: 'गड़बड़ी की जाँच करें',
  loading: 'लोड हो रहा है...',

  // S0 Landing
  heroTitle: 'पोर्टल से रिजेक्ट होने से पहले गड़बड़ी पकड़ें।',
  heroSubtitle:
    'नाम, जन्मतिथि या बैंक IFSC में छोटे अंतर के कारण छात्रवृत्ति फॉर्म खारिज हो जाते हैं, पीएम-किसान किस्त रुक जाती है और बैंक केवाईसी अटक जाता है। आवेदन करने से पहले अपने दस्तावेज़ सुरक्षित रूप से जांचें।',
  privacyBullet1: '100% स्टेटलेस: हमारे सर्वर या डेटाबेस में कुछ भी स्टोर नहीं होता।',
  privacyBullet2: 'आधार संख्या स्वचालित रूप से मास्क/छिपा दी जाती है।',
  privacyBullet3: 'ब्राउज़र मेमोरी में काम करता है — टैब बंद करते ही सब मिट जाता है।',
  howItWorksTitle: 'यह कैसे काम करता है',
  step1Title: '1. उद्देश्य चुनें',
  step1Desc: 'अपना आवेदन प्रकार चुनें (पीएम-किसान, छात्रवृत्ति, पैन-आधार, या बैंक केवाईसी)।',
  step2Title: '2. दस्तावेज़ अपलोड करें',
  step2Desc: 'फोटो या पीडीएफ दें। गूगल जेमिनी द्वारा सुरक्षित रूप से लिखावट पढ़ी जाती है।',
  step3Title: '3. समीक्षा और सुधार',
  step3Desc: 'दोनों दस्तावेज़ों का अंतर आमने-सामने देखें, सबसे सस्ता सुधार उपाय पाएं और आवेदन पत्र प्रिंट करें।',

  // S1 Goal Select
  goalSelectTitle: 'आप किस कार्य के लिए आवेदन कर रहे हैं?',
  goalSelectSubtitle: 'हम केवल उन्हीं दस्तावेज़ों और फ़ील्ड्स की जाँच करते हैं जो आपके चुने हुए उद्देश्य के लिए ज़रूरी हैं।',
  goal_pm_kisan_title: 'पीएम-किसान भुगतान सुधार',
  goal_pm_kisan_desc: 'किस्त जमा और डीबीटी सीडिंग के लिए आधार बनाम बैंक खाते की जाँच करें।',
  goal_scholarship_title: 'छात्रवृत्ति आवेदन',
  goal_scholarship_desc: 'आधार बनाम स्कूल/कॉलेज प्रमाणपत्र और बोर्ड मार्कशीट के नाम की जाँच करें।',
  goal_pan_aadhaar_title: 'पैन-आधार लिंकिंग',
  goal_pan_aadhaar_desc: 'पैन और आधार के बीच नाम की स्पेलिंग, जन्मतिथि और लिंग की सख्त जाँच।',
  goal_bank_kyc_title: 'बैंक केवाईसी और पुनः केवाईसी',
  goal_bank_kyc_desc: 'मर्ज हुए बैंकों के नए IFSC कोड सहित आधार, पैन और बैंक पासबुक की जाँच।',

  // S2 Consent
  consentTitle: 'गोपनीयता और डेटा सहमति',
  consentLead:
    'आपकी गोपनीयता हमारी सर्वोच्च प्राथमिकता है। कृपया देखें कि आपकी दस्तावेज़ छवियों को कैसे संसाधित किया जाता है:',
  consentPoint1:
    'आपकी दस्तावेज़ फोटो केवल टेक्स्ट पढ़ने के लिए एक एन्क्रिप्टेड कनेक्शन पर गूगल जेमिनी को भेजी जाती हैं।',
  consentPoint2:
    'हमारा सर्वर ब्राउज़र को डेटा भेजने से पहले आधार के पहले 8 अंक छिपा देता है। पूरा आधार नंबर कभी स्टोर या लॉग नहीं किया जाता।',
  consentPoint3:
    'हम अपने सर्वर पर कोई डेटा स्टोर नहीं करते। सब कुछ आपके ब्राउज़र में रहता है और टैब बंद करते ही मिट जाता है।',
  consentCheckbox: 'मैं समझता/समझती हूँ और दस्तावेज़ फोटो जाँचने की सहमति देता/देती हूँ।',
  manualEntryLink: 'हाथ से विवरण भरें (फोटो अपलोड छोड़ें)',

  // S3 Upload
  uploadTitle: 'दस्तावेज़ अपलोड करें',
  uploadSubtitle: 'अपने उद्देश्य के लिए आवश्यक दस्तावेज़ों की फोटो या पीडीएफ अपलोड करें।',
  doc_aadhaar: 'आधार कार्ड',
  doc_pan: 'पैन कार्ड',
  doc_bank: 'बैंक पासबुक / चेक',
  doc_certificate: 'स्कूल / कॉलेज प्रमाणपत्र',
  takePhoto: 'फोटो खींचें',
  chooseFile: 'फ़ाइल चुनें',
  remove: 'हटाएं',
  retry: 'पुनः प्रयास करें',
  retake: 'दोबारा फोटो लें',
  mismatchedSlotAlert: 'यह फोटो {1} के बजाय {0} प्रतीत होती है। क्या आप इसे सही स्लॉट में ले जाना चाहते हैं?',
  moveToCorrectSlot: '{0} में ले जाएं',
  keepInCurrentSlot: '{0} में ही रखें',
  slot_empty: 'अपलोड नहीं हुआ',
  slot_ready: 'पढ़ने के लिए तैयार',
  slot_reading: 'एआई द्वारा पढ़ा जा रहा है...',
  slot_done: 'विवरण प्राप्त हुआ',
  slot_failed: 'पढ़ना विफल रहा',
  fileSizeError: 'फ़ाइल 4 MB से बड़ी है। कृपया फ़ोटो को कंप्रेस करें।',
  photoBlurryError: 'यह फ़ोटो बहुत धुंधली है। कृपया अच्छी रोशनी में दोबारा फ़ोटो लें।',
  allRequiredWarning: 'आगे बढ़ने के लिए कृपया सभी आवश्यक दस्तावेज़ अपलोड करें या विवरण भरें।',
  cameraHint: 'अच्छी रोशनी में पूरे दस्तावेज़ को फ्रेम के अंदर रखें।',

  // S5 Review
  reviewTitle: 'निकाले गए विवरण की समीक्षा करें',
  reviewSubtitle:
    'पुष्टि करें कि विवरण आपके दस्तावेज़ों से मेल खाता है। पीले रंग वाले फ़ील्ड पर टैप करके पुष्टि करें या सुधारें।',
  confidenceHigh: 'उच्च सटीकता',
  confidenceLow: 'इसकी जाँच करें',
  looksRight: 'यह सही है',
  field_fullName: 'पूरा नाम',
  field_fatherOrSpouseName: 'पिता / पति का नाम',
  field_dob: 'जन्मतिथि',
  field_dobIso: 'जन्मतिथि (मानक)',
  field_yearOfBirthOnly: 'जन्म वर्ष',
  field_gender: 'लिंग',
  field_aadhaar: 'आधार संख्या',
  field_aadhaarRedacted: 'आधार संख्या',
  field_panNumber: 'पैन संख्या',
  field_accountHolderName: 'खाताधारक का नाम',
  field_accountNumber: 'खाता संख्या',
  field_accountNumberLast4: 'खाता संख्या (अंतिम 4 अंक)',
  field_ifsc: 'आईएफएससी कोड',
  field_bankName: 'बैंक का नाम',
  field_certificateName: 'प्रमाणपत्र का नाम',
  field_institutionName: 'संस्थान / बोर्ड का नाम',
  addMissingValue: '+ छूटा हुआ मान दर्ज करें',
  proceedToAnalysis: 'विश्लेषण शुरू करें',

  // S6 Report
  reportTitle: 'दस्तावेज़ मिलान रिपोर्ट',
  status_ready: 'तैयार',
  status_ready_desc: 'हमने आपके दस्तावेज़ों में नाम, जन्मतिथि और पैन विवरण की जांच की है।',
  status_ready_banner: 'कोई गड़बड़ी नहीं पाई गई',
  status_ready_with_notes: 'सुझावों के साथ तैयार',
  status_ready_with_notes_desc: 'छोटे अंतर पाए गए हैं। आवेदन करने से पहले नीचे दिए गए सुझाव देख लें।',
  status_fix_needed: 'सुधार ज़रूरी',
  status_fix_needed_desc: 'एक या अधिक गड़बड़ियां पाई गई हैं जिससे आवेदन खारिज हो सकता है।',
  status_blocked: 'आवेदन अटक सकता है',
  status_blocked_desc: 'गंभीर गड़बड़ियां पाई गई हैं जिससे फॉर्म रिजेक्ट हो सकता है। पहले सुधार करें।',

  findingsHeading: 'पहचानी गई गड़बड़ियां',
  sideBySideHeading: 'आमने-सामने तुलना',
  whyThisMatters: 'यह क्यों महत्वपूर्ण है:',
  whatToDo: 'क्या करें:',
  correctVersionLabel: 'कौन सा दस्तावेज़ सही है?',
  jumpToFix: 'सुधार का तरीका देखें ↓',
  docs_aadhaar_pan: 'आधार व पैन',

  // Fix Plan
  fixPlanHeading: 'सुझाया गया सुधार प्लान (सबसे सस्ता और आसान पहले)',
  fixPlanSubtitleWithAadhaar:
    'कम लागत और कम प्रयास से शुरू, सीमित आधार अपडेट सीमाओं को सुरक्षित रखते हुए।',
  fixPlanSubtitleStandard: 'कम लागत और कम प्रयास से शुरू।',
  onlyIfNeeded: 'यदि बदलाव की आवश्यकता हो तभी:',
  fixStepChange: 'क्या बदलना है:',
  fixStepWhere: 'कहाँ जाना है:',
  fixStepSteps: 'आवश्यक कदम:',
  fixStepCarry: 'साथ ले जाने वाले दस्तावेज़:',
  effort_bank: 'सबसे आसान (1 बैंक दौरा, निःशुल्क)',
  effort_pan_online: 'ऑनलाइन पोर्टल (~110 रुपये शुल्क)',
  effort_aadhaar_centre: 'आधार सेवा केंद्र (75 रुपये शुल्क)',
  effort_certificate_board: 'शिक्षा बोर्ड / स्कूल कार्यालय',
  verifyOnOfficialSite: 'आधिकारिक पोर्टल पर नवीनतम प्रक्रिया और शुल्क की पुष्टि करें',
  aadhaar_lifetime_limit_note:
    'महत्वपूर्ण: यूआईडीएआई जीवनभर में नाम में अधिकतम 2 बार, जन्मतिथि में 1 बार और लिंग में 1 बार ही सुधार की अनुमति देता है। जहाँ संभव हो, पहले बैंक रिकॉर्ड सुधारें।',
  aadhaar_name_target_limit_note:
    'महत्वपूर्ण: यह आपके 2 आजीवन आधार नाम सुधारों में से 1 का उपयोग करता है। आवेदन करने से पहले सभी विवरणों की पुष्टि करके अपने अपडेट सुरक्षित रखें।',
  aadhaar_dob_target_limit_note:
    'महत्वपूर्ण: यह आपके एकमात्र आजीवन जन्म तिथि अपडेट का उपयोग करता है। पहले पुष्टि करें कि कौन सी तारीख सही है। यदि प्रमाणपत्र गलत है, तो अपने स्कूल या बोर्ड से इसे सुधारना विकल्प है।',
  aadhaar_not_targeted_limit_note:
    'सूचना: यह सुधार आपके किसी भी आधार अपडेट का उपयोग नहीं करता है। यूआईडीएआई केवल 2 आजीवन नाम अपडेट और 1 जन्मतिथि अपडेट की अनुमति देता है।',
  aadhaar_exception_path_note:
    'यदि आपकी जीवनकाल सीमा समाप्त हो चुकी है, तो यूआईडीएआई क्षेत्रीय कार्यालय या 1947 हेल्पलाइन के माध्यम से अपवाद प्रक्रिया उपलब्ध है।',

  // Finding Titles & Explanations
  finding_required_doc_missing_title: 'आवश्यक दस्तावेज़ गायब है',
  finding_required_doc_missing_desc: 'जब तक सभी आवश्यक दस्तावेज़ उपलब्ध नहीं होंगे, पूरी जाँच संभव नहीं है।',
  finding_missing_fields_title: 'अपठनीय आवश्यक विवरण',
  finding_missing_fields_desc: 'अपलोड की गई फ़ोटो से कुछ ज़रूरी फ़ील्ड्स को स्पष्ट रूप से नहीं पढ़ा जा सका। कृपया समीक्षा स्क्रीन पर उन्हें दर्ज करें।',
  finding_unconfirmed_confidence_title: 'अपुष्ट कम-सटीकता फ़ील्ड',
  finding_unconfirmed_confidence_desc: 'सटीक परिणाम के लिए कृपया समीक्षा स्क्रीन पर इस फ़ील्ड की पुष्टि करें।',
  missing_fields: 'अनुपलब्ध विवरण',
  low_confidence_fields: 'जाँचने योग्य विवरण',
  review_screen: 'समीक्षा स्क्रीन पर जाँचें',
  goToReview: 'समीक्षा स्क्रीन पर जाएँ',

  finding_name_token_reorder_title: 'नाम के शब्दों का क्रम अलग है',
  finding_name_token_reorder_desc:
    'दस्तावेज़ों में आपके नाम के शब्दों का क्रम अलग है (जैसे पहले उपनाम या पहले नाम)।',
  finding_name_patronymic_middle_omission_title: 'पिता/पति का मध्य नाम छूटा हुआ है',
  finding_name_patronymic_middle_omission_desc:
    'एक दस्तावेज़ में पिता/पति का मध्य नाम है और दूसरे में नहीं है। यह एक सामान्य क्षेत्रीय अंतर है।',
  finding_name_initial_abbreviation_title: 'संक्षिप्त नाम (इनिशियल) बनाम पूरा नाम',
  finding_name_initial_abbreviation_desc:
    'एक दस्तावेज़ में पहला अक्षर (जैसे "आर.") और दूसरे में पूरा शब्द लिखा है।',
  finding_name_transliteration_variant_title: 'अंग्रेज़ी स्पेलिंग / वर्तनी का अंतर',
  finding_name_transliteration_variant_desc:
    'एक ही भारतीय नाम की अंग्रेज़ी में अलग स्पेलिंग (जैसे "Sunitha" बनाम "Sunita", "Chaudhari" बनाम "Choudhary")।',
  finding_name_missing_token_title: 'नाम में एक शब्द गायब है',
  finding_name_missing_token_desc:
    'एक दस्तावेज़ में एक अतिरिक्त शब्द है जो पिता/पति के नाम से मेल नहीं खाता।',
  finding_name_mismatch_title: 'पूरी तरह से अलग नाम',
  finding_name_mismatch_desc: 'इन दो दस्तावेज़ों के नाम अलग-अलग व्यक्तियों के प्रतीत होते हैं।',

  finding_dob_swap_title: 'जन्मतिथि में दिन और महीने की अदला-बदली',
  finding_dob_swap_desc:
    'जन्मतिथि में दिन और महीने के अंक उलटे लग रहे हैं (जैसे 05/03 बनाम 03/05)। पोर्टल इसे रिजेक्ट कर सकते हैं।',
  finding_dob_mismatch_title: 'जन्मतिथि में अंतर',
  finding_dob_mismatch_desc: 'दस्तावेज़ों में जन्मतिथि अलग-अलग दर्ज है।',
  finding_dob_year_only_title: 'केवल जन्म वर्ष छपा है',
  finding_dob_year_only_desc:
    'एक दस्तावेज़ में केवल जन्म का वर्ष छपा है। कुछ पोर्टल पूरी जन्मतिथि (दिन/महीना/वर्ष) मांगते हैं।',

  finding_gender_mismatch_title: 'दस्तावेज़ों में लिंग अलग दर्ज है',
  finding_gender_mismatch_desc: 'दस्तावेज़ों में लिंग (जेंडर) भिन्न पाया गया है।',

  finding_pan_invalid_title: 'अमान्य पैन फॉर्मेट',
  finding_pan_invalid_desc: 'पैन 10 अक्षरों के मानक प्रारूप (5 अक्षर, 4 अंक, 1 अक्षर) से मेल नहीं खाता।',
  finding_pan_not_individual_title: 'गैर-व्यक्तिगत पैन श्रेणी',
  finding_pan_not_individual_desc: 'पैन का चौथा अक्षर "P" (व्यक्तिगत खाताधारक) नहीं है।',
  finding_pan_surname_title: 'पैन का 5वाँ अक्षर उपनाम से मेल नहीं खाता',
  finding_pan_surname_desc: 'व्यक्तिगत पैन का 5वाँ अक्षर आपके उपनाम (सरनेम) के पहले अक्षर से मेल खाना चाहिए।',

  finding_ifsc_invalid_title: 'अमान्य आईएफएससी कोड',
  finding_ifsc_invalid_desc: 'आईएफएससी 11 वर्णों का होना चाहिए और 5वाँ वर्ण शून्य ("0") होना आवश्यक है।',
  finding_ifsc_merged_bank_title: 'मर्ज (विलीन) बैंक का पुराना आईएफएससी कोड',
  finding_ifsc_merged_bank_desc:
    'यह आईएफएससी उस बैंक का है जो किसी बड़े बैंक में विलीन हो चुका है। भुगतान फेल होने से बचने के लिए नया आईएफएससी लें।',
  finding_ifsc_unknown_title: 'अपुष्ट बैंक कोड',
  finding_ifsc_unknown_desc: 'इस बैंक कोड की शाखा की पुष्टि नहीं हो सकी। अपनी बैंक शाखा से संपर्क करें।',

  finding_acc_invalid_title: 'अमान्य बैंक खाता संख्या',
  finding_acc_invalid_desc: 'खाता संख्या केवल अंकों में (9 से 18 अंक) होनी चाहिए।',

  expected: 'अपेक्षित प्रारूप',
  hint_expected_ifsc: '4 अक्षर, फिर अंक 0, फिर 6 अक्षर या अंक (उदा. SBIN0001234)',
  hint_expected_pan: '5 अक्षर, 4 अंक, 1 अक्षर (उदा. ABCDE1234F)',
  hint_expected_pan_individual: 'व्यक्तिगत धारक के लिए चौथा अक्षर "P" होना चाहिए (उदा. ABCPK1234F)',
  hint_expected_acc: 'केवल अंक, आमतौर पर 9 से 18 अंक (उदा. 1234567890)',

  finding_aadhaar_indicator_missing_title: 'आधार कार्ड अनुपस्थित',
  finding_aadhaar_indicator_missing_desc: 'दस्तावेज़ में आधार कार्ड का विवरण नहीं मिला।',

  finding_dbt_seeding_title: 'सरकारी योजनाओं के लिए एनपीसीआई डीबीटी सीडिंग आवश्यक',
  finding_dbt_seeding_desc:
    'पीएम-किसान और छात्रवृत्ति की किस्त पाने के लिए बैंक खाते का एनपीसीआई डीबीटी मैपर से जुड़ा होना अनिवार्य है। केवल सामान्य बैंक केवाईसी शायद पर्याप्त न हो।',
  finding_dbt_what_to_do:
    'अपनी बैंक शाखा से अपने खाते को NPCI DBT मैपर से लिंक करने को कहें, या नमूना डीबीटी सीडिंग आवेदन पत्र जमा करें।',

  // Actions
  createSampleLetter: 'आवेदन पत्र (ड्राफ्ट) बनाएं',
  copyAsText: 'व्हाट्सएप के लिए कॉपी करें',
  copiedToClipboard: 'कॉपी हो गया!',
  readAloud: 'बोलकर सुनाएँ',
  stopReading: 'रोकें',
  speechNotAvailable: 'इस डिवाइस पर वॉयस उपलब्ध नहीं है।',

  // Where & Steps
  where_bank_branch: 'आपकी गृह बैंक शाखा (होम ब्रांच)',
  where_pan_portal: 'प्रोटीन (NSDL) / UTIITSL ऑनलाइन पोर्टल',
  where_aadhaar_centre: 'निकटतम आधार सेवा केंद्र',
  where_education_board: 'स्कूल / कॉलेज प्रशासनिक कार्यालय',
  where_official_office: 'संबंधित सरकारी कार्यालय',

  step_bank_visit_branch: 'अपनी पासबुक और मूल आधार कार्ड लेकर अपनी होम ब्रांच जाएँ।',
  step_bank_submit_kyc_form: 'हेल्पडेस्क से केवाईसी / खाता विवरण संशोधन फॉर्म मांगें।',
  step_bank_show_aadhaar_original: 'सत्यापन के लिए अपना मूल आधार कार्ड दिखाएं।',
  step_bank_request_passbook_update: 'भरा हुआ नमूना आवेदन पत्र जमा करें और अपडेटेड पासबुक लें।',
  step_bank_dbt_seeding_request:
    'बैंक से पुष्टि करने को कहें कि आपका खाता NPCI DBT मैपर पर लिंक है; यदि लिंक नहीं है तो नमूना आवेदन पत्र जमा करें।',
  step_ifsc_recheck:
    'अपनी पासबुक या बैंक की वेबसाइट पर छपा हुआ IFSC कोड जांचें और उसे पुनः दर्ज करें।',

  step_pan_check_name_first:
    'अपने पैन पर छपा नाम जांचें। यदि यह किसी भिन्न उपनाम के तहत जारी किया गया था (उदाहरण के लिए विवाह से पहले), तो यह सही हो सकता है और किसी बदलाव की आवश्यकता नहीं है।',
  step_pan_open_portal: 'आधिकारिक प्रोटीन या यूटीआईआईएसएल पैन पोर्टल पर जाएँ।',
  step_pan_fill_change_form: '"मौजूदा पैन डेटा में सुधार" विकल्प चुनें और सही नाम दर्ज करें।',
  step_pan_upload_aadhaar_proof: 'आधार ओटीपी (ई-केवाईसी) से प्रमाणित करें या आधार कार्ड अपलोड करें।',
  step_pan_pay_and_submit: 'ऑनलाइन शुल्क (~110 रुपये) का भुगतान करें और रसीद नंबर सुरक्षित रखें।',

  step_aadhaar_book_appointment: 'myaadhaar.uidai.gov.in पर अपॉइंटमेंट बुक करें या नजदीकी आधार सेवा केंद्र पर जाएँ।',
  step_aadhaar_visit_centre: 'पहचान और जन्मतिथि के प्रमाण के रूप में मूल पैन कार्ड, पासपोर्ट या बोर्ड प्रमाणपत्र ले जाएं।',
  step_aadhaar_biometric_auth: 'फिंगरप्रिंट/आईरिस बायोमेट्रिक दें और 75 रुपये का शुल्क जमा करें।',
  step_aadhaar_receive_urn: '14 अंकों की अपडेट रसीद (URN) प्राप्त करें और myaadhaar.uidai.gov.in पर स्थिति ट्रैक करें।',

  step_cert_apply_to_school: 'अपने स्कूल/कॉलेज के प्रधानाचार्य या रजिस्ट्रार से संपर्क करें।',
  step_cert_affidavit_gazette: 'सही नाम या जन्मतिथि दर्शाने वाला नोटरी हलफनामा बनवाएं।',
  step_cert_submit_board_office: 'निर्धारित शुल्क के साथ बोर्ड कार्यालय में डुप्लीकेट प्रमाणपत्र का आवेदन जमा करें।',
  step_cert_collect_duplicate: 'बोर्ड से सूचना मिलने पर संशोधित प्रमाणपत्र प्राप्त करें।',

  carry_aadhaar_original: 'मूल आधार कार्ड (ओरिजिनल)',
  carry_bank_passbook: 'वर्तमान बैंक पासबुक या चेक',
  carry_passport_photos: '2 पासपोर्ट साइज फोटो',
  carry_pan_card: 'पैन कार्ड (मूल और फोटोकॉपी)',
  carry_aadhaar_linked_mobile: 'आधार से लिंक मोबाइल फोन (ओटीपी के लिए)',
  carry_existing_pan_copy: 'वर्तमान पैन कार्ड की फोटोकॉपी',
  carry_proof_of_identity: 'वैध पहचान प्रमाण पत्र',
  carry_proof_of_dob: 'जन्मतिथि प्रमाण पत्र (जन्म प्रमाणपत्र/10वीं मार्कशीट)',
  carry_existing_aadhaar_copy: 'वर्तमान आधार कार्ड की प्रति',
  carry_original_marksheet: 'मूल अंकतालिका / उत्तीर्ण प्रमाणपत्र',
  carry_school_leaving_cert: 'स्कूल छोड़ने का प्रमाण पत्र (टीसी/एलसी)',
  carry_affidavit_magistrate: 'मजिस्ट्रेट के समक्ष निष्पादित शपथ पत्र',
  carry_newspaper_publication: 'नाम परिवर्तन विज्ञापन की मूल समाचार पत्र कटिंग',

  // S8 Letter
  letterPageTitle: 'नमूना अनुरोध पत्र (ड्राफ्ट)',
  letterNotice:
    'यह एक पहले से भरा हुआ नमूना आवेदन पत्र है। विवरण देखें, बैंक शाखा और दिनांक भरें, और इसे प्रिंट या पीडीएफ के रूप में सेव करें।',
  printOrSavePdf: 'प्रिंट करें या पीडीएफ सेव करें',
  branchNamePlaceholder: 'शाखा का नाम (उदा. मुख्य शाखा, लखनऊ)',
  datePlaceholder: 'दिनांक (दिन/माह/वर्ष)',
  dbtSeedingLetterTitle: 'डीबीटी भुगतान हेतु एनपीसीआई मैपर में आधार लिंक करने का आवेदन',
  nameCorrectionLetterTitle: 'बैंक खाते के रिकॉर्ड में नाम सुधारने हेतु आवेदन पत्र',

  // S9 Demo
  demoPageTitle: 'डेमो परिदृश्य आज़माएँ (ऑफलाइन)',
  demoPageSubtitle: 'बिना कोई दस्तावेज़ अपलोड किए भारतीय दस्तावेज़ों की वास्तविक गड़बड़ियों के साथ पूरे विश्लेषण का अनुभव करें।',
  loadScenario: 'यह परिदृश्य लोड करें',
  scenario1Title: 'परिदृश्य 1: पीएम-किसान नाम के क्रम में अंतर',
  scenario1Desc: 'आधार में "Ramesh Kumar" और बैंक पासबुक में "Kumar Ramesh"। बैंक रिकॉर्ड को सुधारने का सबसे सस्ता उपाय दिखाता है।',
  scenario2Title: 'परिदृश्य 2: छात्रवृत्ति में पिता का मध्य नाम और जन्मतिथि अदला-बदली',
  scenario2Desc: 'आधार में "Rahul Suresh Patil" (03/05/2005) और स्कूल प्रमाणपत्र में "Rahul Patil" (05/03/2005)। मध्य नाम छूटने और जन्मतिथि की अदला-बदली को पकड़ता है।',
  scenario3Title: 'परिदृश्य 3: बैंक केवाईसी में अमान्य आईएफएससी और संक्षिप्त नाम',
  scenario3Desc: 'बैंक पासबुक में "R. Deshmukh" और अमान्य आईएफएससी "SBIN1000123" बनाम आधार "Ramesh Deshmukh"। आईएफएससी ब्लॉकर और संक्षिप्त नाम को दिखाता है।',
};
