# ClaimKavach — I18N / Hindi Translation Review Tracking (I18N_TODO)

> **Status:** All rule explanation strings currently provide deterministic Hindi translations paired with English explanations.
> Per specification, all Hindi strings are cataloged here and marked as **"needs native review"** by a native Hindi medical billing specialist.
> All remembered legal claims ("cannot add margin except GST", "Legal Metrology/DPCO", "standard healthcare billing guidelines") have been removed in favor of data-derived and neutral text.

---

## 1. Rule Explanation Strings Catalog

| Rule ID | Finding Title / Context | English Explanation (`explanation.en`) | Hindi Explanation (`explanation.hi`) | Review Status |
|---|---|---|---|---|
| **R-MATH-01** | Arithmetic Calculation Discrepancy | `Quantity (${item.quantity}) multiplied by unit rate (${formatINR(item.unitRatePaise)})${breakdownNote} equals ${formatINR(expectedTotal)}, but bill states ${formatINR(item.totalBilledPaise)}.${cautionNote}` | `मात्रा (${item.quantity}) और दर (${formatINR(item.unitRatePaise)}) का गुणनफल${breakdownNote} ${formatINR(expectedTotal)} है, परंतु बिल में ${formatINR(item.totalBilledPaise)} दर्ज है।${cautionNote}` | **needs native review** |
| **R-TOTAL-01** | Grand Total Reconciliation Discrepancy | `Sum of billed line items equals ${formatINR(calculatedSum)}, but stated bill total is ${formatINR(bill.totalBilledPaise)}. Difference: ${formatINR(discrepancy)}.${cautionNote}` | `बिल की सभी मदों का कुल योग ${formatINR(calculatedSum)} है, परंतु बिल में कुल योग ${formatINR(bill.totalBilledPaise)} दर्ज है। अंतर: ${formatINR(discrepancy)}।${cautionNote}` | **needs native review** |
| **R-DUP-01** | Potential Duplicate Line Item | `Identical charge for "${item.description}" appears multiple times with the same rate (${formatINR(item.unitRatePaise)})${item.date ? \` on date \${item.date}\` : ''}. Total questioned: ${formatINR(item.totalBilledPaise)}.` | `"${item.description}" का समान शुल्क एक ही दर (${formatINR(item.unitRatePaise)})${item.date ? \` दिनांक \${item.date} को\` : ''} एकाधिक बार दर्ज है। संदेहास्पद राशि: ${formatINR(item.totalBilledPaise)}।` | **needs native review** |
| **R-NPPA-01** | Product Specification Verification Required | `Possible match with "${record.name}" (${record.sourceRef}), but product strength/dosageForm could not be fully confirmed from description. Confirm product specifications.` | `"${record.name}" के साथ संभावित मिलान, परंतु उत्पाद की शक्ति या खुराक के रूप की पूरी पुष्टि नहीं हो सकी। उत्पाद विनिर्देशों की पुष्टि करें।` | **needs native review** |
| **R-NPPA-01** | Ceiling Price Unit Verification Required | `Matched reference benchmark ("${record.name}") has ceiling of ${formatINR(record.ceilingPaise)} (${record.sourceRef}), but billing unit could not be confirmed against "${expectedUnitStr}". Verify package unit of issue. GST treatment: ${record.gstTreatment}.` | `संदर्भ विनियामक रिकॉर्ड ("${record.name}") की सीमा ${formatINR(record.ceilingPaise)} है, परंतु बिलिंग इकाई की पुष्टि नहीं हो सकी। पैकेजिंग इकाई की जांच करें। जीएसटी स्थिति: ${record.gstTreatment}।` | **needs native review** |
| **R-NPPA-01** | Billed Price Exceeds Regulatory Ceiling | `Billed unit rate (${formatINR(item.unitRatePaise)}) exceeds the reference ceiling (${formatINR(record.ceilingPaise)}) by ${formatINR(unitOvercharge)} per unit (total: ${formatINR(totalOvercharge)}). GST treatment in reference record: ${record.gstTreatment}.` | `बिल की दर (${formatINR(item.unitRatePaise)}) संदर्भ सीमा (${formatINR(record.ceilingPaise)}) से ${formatINR(unitOvercharge)} प्रति इकाई अधिक है (कुल: ${formatINR(totalOvercharge)})। संदर्भ रिकॉर्ड में जीएसटी स्थिति: ${record.gstTreatment}।` | **needs native review** |
| **R-NPPA-02** | Billed Price Exceeds Printed MRP | `Billed price (${formatINR(item.unitRatePaise)}) exceeds the MRP (${formatINR(item.mrpPaise)}) printed on the bill/packaging by ${formatINR(unitDifference)} per unit (total: ${formatINR(totalOvercharge)}).` | `बिल की दर (${formatINR(item.unitRatePaise)}) बिल/पैकेजिंग पर मुद्रित एमआरपी (${formatINR(item.mrpPaise)}) से ${formatINR(unitDifference)} अधिक है (कुल: ${formatINR(totalOvercharge)})।` | **needs native review** |
| **R-ANX-01** | Standard Non-Payable Item (Valid Deduction) | `Insurer deduction of ${formatINR(item.deductedPaise)} for "${item.description}" is supported as a non-payable item under ${matchedRecord.listName} (${matchedRecord.sourceRef}).` | `"${item.description}" पर बीमा कंपनी की ${formatINR(item.deductedPaise)} की कटौती ${matchedRecord.listName} के तहत गैर-देय मद के रूप में मान्य है।` | **needs native review** |
| **R-ANX-01** | Optional Cover Deduction Review | `Payable only if the policy includes the optional cover; check policy for "${item.description}" (deducted: ${formatINR(item.deductedPaise)}).` | `देय केवल तभी है जब पॉलिसी में वैकल्पिक कवर शामिल हो; "${item.description}" के लिए पॉलिसी जांचें (कटौती: ${formatINR(item.deductedPaise)})।` | **needs native review** |
| **R-ANX-01** | Questioned Insurer Deduction | `Insurer deduction not supported by Annexure-I (a policy exclusion may still apply) for "${item.description}" (deducted: ${formatINR(item.deductedPaise)}).` | `अनुलग्नक-I द्वारा बीमा कटौती समर्थित नहीं है (एक पॉलिसी अपवर्जन अभी भी लागू हो सकता है): "${item.description}" (कटौती: ${formatINR(item.deductedPaise)})।` | **needs native review** |
| **R-BUNDLE-01** | Service Likely Subsumed Under Room/ICU Tariff | `Charge for "${item.description}" (${formatINR(item.totalBilledPaise)}) is likely subsumed under room/ICU charges as specified in reference dataset (${matchedRecord.source}).` | `"${item.description}" का शुल्क (${formatINR(item.totalBilledPaise)}) संदर्भ डेटासेट (${matchedRecord.source}) के अनुसार कमरे/आईसीयू शुल्क में समाविष्ट होने की संभावना है।` | **needs native review** |
| **R-POLICY-01** | Proportionate Deduction Review on Pharmacy/Device | `Insurer deducted ${formatINR(deducted)} from "${item.description}" due to room rent capping. Application to medicines and devices depends on specific policy wording. Formula: Associated Charges × (1 - Room Rent Cap / Actual Room Rent). Inputs: Room Rent Cap = ${formatINR(roomRentCap)}, Actual Room Rent = ${formatINR(actualDailyRoomRent)}, Billed Amount = ${formatINR(item.totalBilledPaise || 0)}, Ratio = ${(admissibleRatio * 100).toFixed(1)}%.` | `बीमा कंपनी ने रूम रेंट सीमा के कारण "${item.description}" से ${formatINR(deducted)} की कटौती की। दवाओं व उपकरणों पर इसकी प्रयोज्यता पॉलिसी शब्दों पर निर्भर करती है। सूत्र: संबंधित शुल्क × (1 - रूम रेंट सीमा / वास्तविक रूम रेंट)।` | **needs native review** |
| **R-STRUCT-01** | Unitemized Pharmacy Charge | `This line has no item breakdown. You can ask the hospital for an itemised pharmacy list.` | `इस पंक्ति में दवाओं का विस्तृत विवरण नहीं है। आप अस्पताल से दवाओं की विस्तृत सूची मांग सकते हैं।` | **needs native review** |

---

## 2. Terminology Glossary (For Reviewer)
- **Overcharge / Questioned Amount**: संदेहास्पद राशि (sandehāspad rāshi)
- **Ceiling Price**: विनियामक सीमा / संदर्भ सीमा (viniyāmak seemā / sandarbh seemā)
- **MRP**: अधिकतम खुदरा मूल्य (adhikatam khudrā mūlya)
- **Deduction**: कटौती (katoutī)
- **Non-Payable / Excluded**: गैर-देय (gair-deya)
- **Subsumed / Bundled**: समाविष्ट (samāvisht)
- **Banned Words & Remembered Claims Avoidance**: Zero words like "illegal", "fraud", "cheating", or ungrounded claims ("cannot add margin except", "Legal Metrology/DPCO") appear in any string.

---

## 3. Bilingual UI Strings Catalog (`src/lib/claimI18n.ts`)

| Context / Key | English String (`en`) | Hindi String (`hi`) | Review Status |
|---|---|---|---|
| **Header** (`appTagline`) | `Independent Patient Hospital Bill & Insurance Deduction Verification` | `अस्पताल बिल एवं बीमा कटौती की स्वतंत्र विनियामक जांच` | **needs native review** |
| **Header** (`badgeStatutory`) | `Statutory Audit` | `वैधानिक ऑडिट` | **needs native review** |
| **Header** (`badgeSynthetic`) | `SYNTHETIC SAMPLE` | `काल्पनिक नमूना` | **needs native review** |
| **Header** (`bannerMemory`) | `We don't store your bill. Reading uses Google Gemini.` | `हम आपका बिल सहेजते नहीं हैं। पढ़ने के लिए Google Gemini का उपयोग होता है।` | **needs native review** |
| **Landing** (`heroTitle`) | `Audit Your Hospital Bill for Statutory Ceiling Breaches & Insurance Deductions` | `वैधानिक मूल्य सीमा और बीमा कटौतियों के लिए अपने अस्पताल बिल की जांच करें` | **needs native review** |
| **Landing** (`consentText`) | `I understand that ClaimKavach is an independent, open-source audit tool for consumer awareness, not legal or insurance advice. ClaimKavach doesn't store your bill; the file is sent to Google Gemini for reading; the audit runs on your device. A Gemini key you type passes through the ClaimKavach server to Google and isn't stored or logged.` | `मैं समझता/समझती हूँ कि क्लेमकवच उपभोक्ता जागरूकता के लिए एक स्वतंत्र ओपन-सोर्स टूल है, कानूनी या बीमा सलाह नहीं। क्लेमकवच आपके बिल को संग्रहीत नहीं करता है; फ़ाइल पढ़ने के लिए Google Gemini को भेजी जाती है; ऑडिट आपके डिवाइस पर चलता है। आपके द्वारा दर्ज की गई Gemini कुंजी ClaimKavach सर्वर के माध्यम से Google को भेजी जाती है और इसे संग्रहीत या लॉग नहीं किया जाता है।` | **needs native review** |
| **Privacy** (`geminiKeyPassThrough`) | `A Gemini key you type passes through the ClaimKavach server to Google and isn't stored or logged.` | `आपके द्वारा दर्ज की गई Gemini कुंजी ClaimKavach सर्वर के माध्यम से Google को भेजी जाती है और इसे संग्रहीत या लॉग नहीं किया जाता है।` | **needs native review** |
| **Upload** (`uploadTitle`) | `Step 1: Provide Hospital Bill & Policy Details` | `चरण 1: अस्पताल बिल और पॉलिसी विवरण प्रदान करें` | **needs native review** |
| **Upload** (`uploadTpaTitle`) | `Optional: Upload TPA Settlement / Claim Deduction Sheet` | `वैकल्पिक: टीपीए निपटान पत्र / कटौती शीट अपलोड करें` | **needs native review** |
| **Upload** (`gstSectionTitle`) | `Tax & GST Inclusion Setting` | `कर एवं जीएसटी (GST) समावेशन स्थिति` | **needs native review** |
| **Upload** (`policySectionTitle`) | `Optional: Insurance Policy Terms (For Proportionate Deductions)` | `वैकल्पिक: बीमा पॉलिसी शर्तें (आनुपातिक कटौती के लिए)` | **needs native review** |
| **Verify** (`verifyTitle`) | `Verify & Edit Bill Line Items` | `बिल मदों का सत्यापन एवं संपादन` | **needs native review** |
| **Verify** (`reconciledTitle`) | `Grand Total Arithmetic Reconciled` | `कुल योग का गणितीय मिलान सफल` | **needs native review** |
| **Verify** (`reconcileDiffTitle`) | `Stated Total vs Calculated Line Sum Discrepancy` | `बिल में दर्ज योग और मदों के जोड़ में अंतर` | **needs native review** |
| **Report** (`reportTitle`) | `Hospital Bill Statutory & Arithmetic Audit Report` | `अस्पताल बिल वैधानिक एवं अंकगणितीय ऑडिट रिपोर्ट` | **needs native review** |
| **Report** (`tabDisputePack`) | `Dispute Notice Pack (4 Drafts)` | `विवाद पत्रक (4 प्रारूप)` | **needs native review** |
| **Dispute** (`verifyBeforeSendingTitle`) | `Verify Before Sending Notice` | `भेजने से पूर्व आधिकारिक पुष्टि करें` | **needs native review** |
| **Dispute** (`verifyBeforeSendingText`) | `Statutory dispute timelines, ombudsman jurisdictional boundaries, and grievance procedures are subject to periodic regulatory updates. Please verify the current complaint procedure and filing window on the official IRDAI portal (irdai.gov.in), Bima Bharosa (bimabharosa.irdai.gov.in), and the Council for Insurance Ombudsmen (cioins.co.in) before submitting.` | `शिकायत की समय-सीमा, लोकपाल का क्षेत्रीय अधिकार क्षेत्र और शिकायत प्रक्रियाएं समय-समय पर संशोधित हो सकती हैं। कृपया भेजने से पहले आधिकारिक आईआरडीएआई पोर्टल (irdai.gov.in), बीमा भरोसा (bimabharosa.irdai.gov.in), और बीमा लोकपाल परिषद (cioins.co.in) पर नवीनतम प्रक्रिया की पुष्टि अवश्य करें।` | **needs native review** |
| **Sources** (`sourcesTitle`) | `Official Regulatory Sources & Trust Manifest` | `आधिकारिक विनियामक स्रोत एवं ट्रस्ट मेनिफेस्ट` | **needs native review** |
| **Sources** (`sourcesSubtitle`) | `Review official government gazette sources, SHA-256 cryptographic hashes, and verification audit logs.` | `आधिकारिक सरकारी राजपत्र स्रोतों, SHA-256 क्रिप्टोग्राफ़िक हैश और सत्यापन ऑडिट लॉग की समीक्षा करें।` | **needs native review** |
| **Sources** (`unverifiedNoticeTitle`) | `Zero Unverified Data Trust Policy` | `शून्य असत्यापित डेटा ट्रस्ट नीति` | **needs native review** |
| **Sources** (`sourcesSha`) | `SHA-256 Digest` | `SHA-256 डाइजेस्ट` | **needs native review** |
| **Sources** (`sourcesCopySha`) | `Copy Hash` | `हैश कॉपी करें` | **needs native review** |
| **Sources** (`sourcesCopied`) | `Copied!` | `कॉपी किया गया!` | **needs native review** |
| **Sources** (`sourcesStatusVerified`) | `Human Verified (PASS)` | `मानव सत्यापित (सफल)` | **needs native review** |
| **Sources** (`sourcesStatusUnverified`) | `Unverified (Demo Mode)` | `असत्यापित (डेमो मोड)` | **needs native review** |
| **Sources** (`unsourcedTitle`) | `Notice on Un-Sourced Clinical & Regulatory Categories` | `असोर्स की गई विनियामक श्रेणियों पर सूचना` | **needs native review** |
| **Sources** (`backHome`) | `Back to Audit Tool` | `ऑडिट टूल पर वापस जाएं` | **needs native review** |

