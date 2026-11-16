export const en = {
  // Brand & Nav
  appName: 'PechanSetu',
  appTagline: 'Find the mismatch before the portal rejects you',
  disclaimer: 'This is a check and guide, not an official verification. Nothing is stored.',
  clearData: 'Clear all data',
  sampleDataBadge: 'Sample Data (Demo Mode)',
  start: 'Start check',
  demo: 'Try a demo',
  back: 'Back',
  continue: 'Continue',
  submit: 'Check Mismatches',
  loading: 'Loading...',

  // S0 Landing
  heroTitle: 'Find the mismatch before the portal rejects you.',
  heroSubtitle:
    'Small differences in your name, date of birth, or bank IFSC cause rejected scholarships, failed PM-Kisan payments, and bank KYC loops. Check your documents privately before applying.',
  privacyBullet1: '100% Stateless: Nothing is stored on our servers or in a database.',
  privacyBullet2: 'Aadhaar numbers are automatically masked before any processing.',
  privacyBullet3: 'Runs in your browser memory — closing the tab erases everything.',
  howItWorksTitle: 'How it works',
  step1Title: '1. Select Goal',
  step1Desc: 'Choose your application type (PM-Kisan, Scholarship, PAN-Aadhaar, or Bank KYC).',
  step2Title: '2. Upload Documents',
  step2Desc: 'Upload photos or PDFs. Text is read securely with Google Gemini.',
  step3Title: '3. Review & Fix',
  step3Desc: 'See exact mismatches side by side, get the cheapest fix plan, and print pre-filled request letters.',

  // S1 Goal Select
  goalSelectTitle: 'What are you applying for?',
  goalSelectSubtitle: 'We only check the documents and fields required for your specific goal.',
  goal_pm_kisan_title: 'PM-Kisan Payment Fix',
  goal_pm_kisan_desc: 'Check Aadhaar vs Bank Account for installment payment credit and DBT seeding.',
  goal_scholarship_title: 'Scholarship Application',
  goal_scholarship_desc: 'Check Aadhaar vs School/College Certificate and Board marksheet names.',
  goal_pan_aadhaar_title: 'PAN-Aadhaar Linking',
  goal_pan_aadhaar_desc: 'Strict check of name spelling, date of birth, and gender between PAN and Aadhaar.',
  goal_bank_kyc_title: 'Bank KYC & Re-KYC Update',
  goal_bank_kyc_desc: 'Check Aadhaar, PAN, and Bank passbook details including merged-bank IFSC codes.',

  // S2 Consent
  consentTitle: 'Privacy & Data Consent',
  consentLead:
    'Your privacy is protected by design. Please review how your document images are handled:',
  consentPoint1:
    'Your document photos are sent over an encrypted connection to Google Gemini purely to read the printed text.',
  consentPoint2:
    'Our server redacts the first 8 digits of Aadhaar before returning text to your browser. Full Aadhaar numbers are NEVER returned, stored, or logged.',
  consentPoint3:
    'We store zero data on our servers. All information lives in your browser memory and is erased when you close this tab or tap "Clear all data".',
  consentCheckbox: 'I understand and agree to process my document photos for pre-flight checking.',
  manualEntryLink: 'Enter details by hand instead (Skip photo upload)',

  // S3 Upload
  uploadTitle: 'Upload Documents',
  uploadSubtitle: 'Provide photos or PDFs for the documents required for your goal.',
  doc_aadhaar: 'Aadhaar Card',
  doc_pan: 'PAN Card',
  doc_bank: 'Bank Passbook / Cheque',
  doc_certificate: 'School / College Certificate',
  takePhoto: 'Take photo',
  chooseFile: 'Choose file',
  remove: 'Remove',
  retry: 'Retry',
  retake: 'Retake',
  mismatchedSlotAlert: 'This photo appears to be a {0} rather than a {1}. Move it to the right slot?',
  moveToCorrectSlot: 'Move to {0}',
  keepInCurrentSlot: 'Keep in {0}',
  slot_empty: 'Not uploaded',
  slot_ready: 'Ready to read',
  slot_reading: 'Reading with AI...',
  slot_done: 'Extracted',
  slot_failed: 'Reading failed',
  fileSizeError: 'File exceeds 4 MB limit. Please compress image or choose a smaller file.',
  photoBlurryError: 'This photo is too blurry. Retake in good light and hold steady.',
  allRequiredWarning: 'Please upload or provide details for all required documents to proceed.',
  cameraHint: 'Fit the whole document inside the frame in good light.',

  // S5 Review
  reviewTitle: 'Review Extracted Information',
  reviewSubtitle:
    'Confirm that the text matches your documents. Tap amber fields to confirm or edit them.',
  confidenceHigh: 'High Confidence',
  confidenceLow: 'Check this',
  looksRight: 'Looks right',
  field_fullName: 'Full Name',
  field_fatherOrSpouseName: 'Father / Spouse Name',
  field_dob: 'Date of Birth',
  field_dobIso: 'Date of Birth (Standard)',
  field_yearOfBirthOnly: 'Year of Birth',
  field_gender: 'Gender',
  field_aadhaar: 'Aadhaar Number',
  field_aadhaarRedacted: 'Aadhaar Number',
  field_panNumber: 'PAN Number',
  field_accountHolderName: 'Account Holder Name',
  field_accountNumber: 'Account Number',
  field_accountNumberLast4: 'Account Number (last 4 digits)',
  field_ifsc: 'IFSC Code',
  field_bankName: 'Bank Name',
  field_certificateName: 'Certificate Name',
  field_institutionName: 'Institution / Board Name',
  addMissingValue: '+ Add missing value',
  proceedToAnalysis: 'Run Pre-Flight Analysis',

  // S6 Report
  reportTitle: 'Pre-Flight Mismatch Report',
  status_ready: 'Ready',
  status_ready_desc: 'We checked name, date of birth and PAN details across your documents.',
  status_ready_banner: 'No mismatches found',
  status_ready_with_notes: 'Ready with Notes',
  status_ready_with_notes_desc: 'Minor differences detected. Review the notes below before applying.',
  status_fix_needed: 'Fix Needed',
  status_fix_needed_desc: 'One or more mismatches found that may cause portal rejection.',
  status_blocked: 'Application Blocked',
  status_blocked_desc: 'Critical mismatches found that are likely to reject. Fix required.',

  findingsHeading: 'Detected Document Mismatches',
  sideBySideHeading: 'Side-by-Side Comparison',
  whyThisMatters: 'Why this matters:',
  whatToDo: 'What to do:',
  correctVersionLabel: 'Which version is correct?',
  jumpToFix: 'View recommended fix ↓',
  docs_aadhaar_pan: 'Aadhaar & PAN',

  // Fix Plan
  fixPlanHeading: 'Recommended Fix Plan (Cheapest & Easiest First)',
  fixPlanSubtitleWithAadhaar:
    'Ranked from cheapest and lowest effort first, preserving scarce update limits.',
  fixPlanSubtitleStandard: 'Ranked from cheapest and lowest effort first.',
  onlyIfNeeded: 'Only if change is needed:',
  fixStepChange: 'Change:',
  fixStepWhere: 'Where to go:',
  fixStepSteps: 'Action Steps:',
  fixStepCarry: 'Documents to carry:',
  effort_bank: 'Easiest (1 Branch Visit, Free)',
  effort_pan_online: 'Online Portal (~Rs. 110)',
  effort_aadhaar_centre: 'Aadhaar Seva Kendra (Rs. 75 Fee)',
  effort_certificate_board: 'Education Board / School Office',
  verifyOnOfficialSite: 'Verify latest procedure on the official site',
  aadhaar_lifetime_limit_note:
    'Important: UIDAI allows a maximum of 2 lifetime name updates, 1 DOB update, and 1 gender update. Protect these updates by updating your bank record instead whenever possible.',
  aadhaar_name_target_limit_note:
    'Important: This uses 1 of your 2 lifetime Aadhaar name updates. Protect your updates by confirming all details before applying.',
  aadhaar_dob_target_limit_note:
    'Important: This uses your only lifetime DOB update. Confirm which date is correct first. If the certificate is wrong, correcting it with your school or board is the alternative.',
  aadhaar_not_targeted_limit_note:
    'Notice: This fix does not use any of your Aadhaar updates. UIDAI allows only 2 lifetime name updates and 1 DOB update.',
  aadhaar_exception_path_note:
    'If you have already exhausted your lifetime limit, UIDAI provides an exception path via your UIDAI Regional Office or the 1947 helpline.',

  // Finding Titles & Explanations
  finding_required_doc_missing_title: 'Required Document Missing',
  finding_required_doc_missing_desc: 'Cannot complete check until all required documents are provided.',
  finding_missing_fields_title: 'Unreadable Required Fields',
  finding_missing_fields_desc: 'We could not clearly read one or more required fields from the uploaded photo. Please enter or verify them on the review screen.',
  finding_unconfirmed_confidence_title: 'Unconfirmed Low-Confidence Field',
  finding_unconfirmed_confidence_desc: 'Please verify this field on the review screen to ensure accuracy.',
  missing_fields: 'Missing fields',
  low_confidence_fields: 'Fields to verify',
  review_screen: 'Verify on Review Screen',
  goToReview: 'Go to Review Screen',

  finding_name_token_reorder_title: 'Name Word Order Differs',
  finding_name_token_reorder_desc:
    'The words in your name are in a different order across documents (e.g. First Name vs Surname first).',
  finding_name_patronymic_middle_omission_title: 'Father/Spouse Middle Name Omitted',
  finding_name_patronymic_middle_omission_desc:
    'One document includes your father/spouse name as a middle name, while the other omits it. This is a common regional pattern.',
  finding_name_initial_abbreviation_title: 'Name Initial vs Full Name',
  finding_name_initial_abbreviation_desc:
    'One document uses an abbreviated initial (e.g. "R.") while the other has the full word.',
  finding_name_transliteration_variant_title: 'Spelling / Transliteration Difference',
  finding_name_transliteration_variant_desc:
    'Different English spellings of the same Indian name (e.g. "Sunitha" vs "Sunita", "Chaudhari" vs "Choudhary").',
  finding_name_missing_token_title: 'Missing Word in Name',
  finding_name_missing_token_desc:
    'One document contains an additional word in your name that does not match father/spouse details.',
  finding_name_mismatch_title: 'Completely Different Name',
  finding_name_mismatch_desc: 'The names on these two documents appear to belong to different individuals.',

  finding_dob_swap_title: 'Date of Birth Possible Day/Month Swap',
  finding_dob_swap_desc:
    'The day and month numbers appear to be reversed (e.g. 05/03 vs 03/05). Portals are likely to reject this mismatch.',
  finding_dob_mismatch_title: 'Date of Birth Mismatch',
  finding_dob_mismatch_desc: 'Dates of birth differ between documents.',
  finding_dob_year_only_title: 'Year of Birth Only Printed',
  finding_dob_year_only_desc:
    'One document prints only the 4-digit birth year. Some portals require full DD/MM/YYYY.',

  finding_gender_mismatch_title: 'Gender Differs Across Documents',
  finding_gender_mismatch_desc: 'Gender is recorded differently across documents.',

  finding_pan_invalid_title: 'Invalid PAN Format',
  finding_pan_invalid_desc: 'PAN does not conform to the 10-character standard format (5 letters, 4 digits, 1 letter).',
  finding_pan_not_individual_title: 'Non-Individual PAN Category',
  finding_pan_not_individual_desc: 'The 4th character of PAN is not "P" (Individual holder).',
  finding_pan_surname_title: 'PAN 5th Letter Does Not Match Surname',
  finding_pan_surname_desc: 'For individuals, the 5th letter of PAN typically matches the first letter of your surname.',

  finding_ifsc_invalid_title: 'Invalid IFSC Code Format',
  finding_ifsc_invalid_desc: 'IFSC must be 11 characters and the 5th character must be digit zero ("0").',
  finding_ifsc_merged_bank_title: 'Merged Bank IFSC Code Detected',
  finding_ifsc_merged_bank_desc:
    'This IFSC belongs to a bank that has merged into a larger public sector bank. Update your IFSC to avoid failed transfers.',
  finding_ifsc_unknown_title: 'Unverified Bank IFSC Prefix',
  finding_ifsc_unknown_desc: 'Could not verify this bank prefix in standard scheduled banks list. Confirm with branch.',

  finding_acc_invalid_title: 'Invalid Bank Account Number',
  finding_acc_invalid_desc: 'Account number should contain digits only (9 to 18 digits).',

  expected: 'Expected Format',
  hint_expected_ifsc: '4 letters, then the digit 0, then 6 letters or digits (e.g. SBIN0001234)',
  hint_expected_pan: '5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)',
  hint_expected_pan_individual: '4th character must be "P" for Individual (e.g. ABCPK1234F)',
  hint_expected_acc: 'Digits only, typically 9 to 18 digits (e.g. 1234567890)',

  finding_aadhaar_indicator_missing_title: 'Aadhaar Indicator Missing',
  finding_aadhaar_indicator_missing_desc: 'Could not verify presence of Aadhaar card details.',

  finding_dbt_seeding_title: 'NPCI DBT Seeding Required for Govt Schemes',
  finding_dbt_seeding_desc:
    'Direct Benefit Transfer (PM-Kisan & Scholarships) requires your bank account to be linked on the NPCI DBT Mapper. Regular bank KYC linking alone may not be enough.',
  finding_dbt_what_to_do:
    'Ask your bank branch to link your account to the NPCI DBT Mapper, or submit the sample DBT seeding request letter.',

  // Actions
  createSampleLetter: 'Create Sample Letter',
  copyAsText: 'Copy Summary for WhatsApp',
  copiedToClipboard: 'Copied to clipboard!',
  readAloud: 'Read aloud',
  stopReading: 'Stop',
  speechNotAvailable: 'Voice synthesis not available on this device.',

  // Where & Steps
  where_bank_branch: 'Your Home Bank Branch',
  where_pan_portal: 'Protean (NSDL) / UTIITSL Online Portal',
  where_aadhaar_centre: 'Nearest Aadhaar Seva Kendra (ASK)',
  where_education_board: 'School / College Administrative Office',
  where_official_office: 'Designated Government Center',

  step_bank_visit_branch: 'Visit your home branch with your passbook and original Aadhaar.',
  step_bank_submit_kyc_form: 'Request a KYC / Account Details Modification form from the helpdesk.',
  step_bank_show_aadhaar_original: 'Show your original Aadhaar card for in-person verification.',
  step_bank_request_passbook_update: 'Submit the pre-filled sample correction letter and ask for an updated passbook.',
  step_bank_dbt_seeding_request:
    'Ask the bank to confirm your account is linked on the NPCI DBT mapper; submit the sample seeding request letter if not linked.',
  step_ifsc_recheck:
    'Check the IFSC printed in your passbook or on your bank\'s website and re-enter it.',

  step_pan_check_name_first:
    'Check the name printed on your PAN. If it was issued under a different surname, for example before marriage, it may be correct and no change is needed.',
  step_pan_open_portal: 'Visit the official Protean (onlineservices.nsdl.com) or UTIITSL PAN correction portal.',
  step_pan_fill_change_form: 'Select "Changes or Correction in existing PAN data" and enter the correct name.',
  step_pan_upload_aadhaar_proof: 'Authenticate via Aadhaar OTP (e-KYC) or upload your Aadhaar card as proof of identity.',
  step_pan_pay_and_submit: 'Pay the online fee (~Rs. 110) and save the 15-digit acknowledgement number.',

  step_aadhaar_book_appointment: 'Book an appointment at an Aadhaar Seva Kendra via myaadhaar.uidai.gov.in or visit directly.',
  step_aadhaar_visit_centre: 'Carry your original PAN card, Passport, or Board Certificate as proof of identity/DOB.',
  step_aadhaar_biometric_auth: 'Provide fingerprint/iris biometric authentication and pay the Rs. 75 fee.',
  step_aadhaar_receive_urn: 'Collect the 14-digit Update Request Number (URN) receipt and track status at myaadhaar.uidai.gov.in.',

  step_cert_apply_to_school: 'Contact the principal or registrar office of your school/college.',
  step_cert_affidavit_gazette: 'Obtain a notarized affidavit stating the correct name or DOB spelling.',
  step_cert_submit_board_office: 'Submit duplicate certificate application with prescribed fee to the board office.',
  step_cert_collect_duplicate: 'Collect the revised marksheet/certificate upon notification.',

  carry_aadhaar_original: 'Original Aadhaar Card',
  carry_bank_passbook: 'Current Bank Passbook or Cheque',
  carry_passport_photos: '2 Passport-size Photographs',
  carry_pan_card: 'PAN Card (Original and photocopy)',
  carry_aadhaar_linked_mobile: 'Mobile phone linked to Aadhaar (for OTP)',
  carry_existing_pan_copy: 'Photocopy of current PAN card',
  carry_proof_of_identity: 'Valid Proof of Identity document',
  carry_proof_of_dob: 'Valid Proof of Date of Birth (Birth Certificate/10th Marksheet)',
  carry_existing_aadhaar_copy: 'Existing Aadhaar card copy',
  carry_original_marksheet: 'Original Marksheet / Passing Certificate',
  carry_school_leaving_cert: 'School Leaving / Transfer Certificate',
  carry_affidavit_magistrate: 'Affidavit sworn before a First Class Magistrate',
  carry_newspaper_publication: 'Original newspaper clipping of name change announcement',

  // S8 Letter
  letterPageTitle: 'Sample Request Letter',
  letterNotice:
    'This is a pre-filled sample draft. Review all details, edit the branch name and date as needed, and print or save as PDF.',
  printOrSavePdf: 'Print or Save as PDF',
  branchNamePlaceholder: 'Branch Name (e.g. Pune Main Branch)',
  datePlaceholder: 'Date (DD/MM/YYYY)',
  dbtSeedingLetterTitle: 'Application for Aadhaar Seeding in NPCI Mapper for DBT Payments',
  nameCorrectionLetterTitle: 'Application for Correction of Name in Bank Account Records',

  // S9 Demo
  demoPageTitle: 'Try Demo Scenarios (Offline)',
  demoPageSubtitle: 'Experience the complete analysis flow with real-world Indian document mismatch cases without uploading any files.',
  loadScenario: 'Load this scenario',
  scenario1Title: 'Scenario 1: PM-Kisan Name Order Swap',
  scenario1Desc: 'Aadhaar shows "Ramesh Kumar" while Bank Passbook shows "Kumar Ramesh". Demonstrates cheapest fix targeting bank record and protecting Aadhaar lifetime updates.',
  scenario2Title: 'Scenario 2: Scholarship Patronymic Middle Name + DOB Swap',
  scenario2Desc: 'Aadhaar has "Rahul Suresh Patil" (DOB: 03/05/2005) while School Certificate has "Rahul Patil" (DOB: 05/03/2005). Demonstrates patronymic middle omission and day/month swap hint.',
  scenario3Title: 'Scenario 3: Bank KYC Invalid IFSC + Initial Abbreviation',
  scenario3Desc: 'Bank passbook shows "R. Deshmukh" with invalid IFSC "SBIN1000123" (5th char "1") vs Aadhaar "Ramesh Deshmukh". Demonstrates IFSC format blocker and initial abbreviation.',
};

export type TranslationKey = keyof typeof en;
