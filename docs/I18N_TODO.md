# ClaimKavach — I18N / Hindi Translation Review Tracking (I18N_TODO)

> **Status:** All rule explanation strings currently provide deterministic Hindi translations paired with English explanations.
> Per specification, all Hindi strings are cataloged here and marked as **"needs native review"** by a native Hindi medical billing specialist.

---

## 1. Rule Explanation Strings Catalog

| Rule ID | Finding Title / Context | English Explanation (`explanation.en`) | Hindi Explanation (`explanation.hi`) | Review Status |
|---|---|---|---|---|
| **R-MATH-01** | Line Item Arithmetic Discrepancy | `Quantity (${item.quantity}) multiplied by unit rate (${formatINR(item.unitRatePaise)}) equals ${formatINR(expectedTotal)}, but bill states ${formatINR(item.totalBilledPaise)}.` | `मात्रा (${item.quantity}) और दर (${formatINR(item.unitRatePaise)}) का गुणनफल ${formatINR(expectedTotal)} है, परंतु बिल में ${formatINR(item.totalBilledPaise)} दर्ज है।` | **needs native review** |
| **R-TOTAL-01** | Grand Total Reconciliation Discrepancy | `Sum of billed line items equals ${formatINR(calculatedSum)}, but stated bill total is ${formatINR(bill.totalBilledPaise)}. Difference: ${formatINR(discrepancy)}.` | `बिल की सभी मदों का कुल योग ${formatINR(calculatedSum)} है, परंतु बिल में कुल योग ${formatINR(bill.totalBilledPaise)} दर्ज है। अंतर: ${formatINR(discrepancy)}।` | **needs native review** |
| **R-DUP-01** | Potential Duplicate Line Item | `Identical charge for "${item.description}" appears multiple times with the same rate (${formatINR(item.unitRatePaise)})${item.date ? \` on date \${item.date}\` : ''}. Total questioned: ${formatINR(item.totalBilledPaise)}.` | `"${item.description}" का समान शुल्क एक ही दर (${formatINR(item.unitRatePaise)})${item.date ? \` दिनांक \${item.date} को\` : ''} एकाधिक बार दर्ज है। संदेहास्पद राशि: ${formatINR(item.totalBilledPaise)}।` | **needs native review** |
| **R-NPPA-01** | Ceiling Price Unit Verification Required | `Matched regulatory benchmark ("${record.name}") has ceiling of ${formatINR(record.ceilingPaise)}, but billing unit could not be confirmed. Verify package unit of issue.` | `विनियामक सीमा ("${record.name}") ${formatINR(record.ceilingPaise)} है, परंतु बिलिंग इकाई की पुष्टि नहीं हो सकी। पैकेजिंग इकाई की जांच करें।` | **needs native review** |
| **R-NPPA-01** | Billed Price Exceeds Regulatory Ceiling | `Billed unit rate (${formatINR(item.unitRatePaise)}) exceeds the statutory ceiling (${formatINR(record.ceilingPaise)}) by ${formatINR(unitOvercharge)} per unit (total questioned: ${formatINR(totalOvercharge)}). Statutory ceilings are notified exclusive of GST; hospitals cannot add margin above the ceiling except applicable GST.` | `बिल की दर (${formatINR(item.unitRatePaise)}) विनियामक सीमा (${formatINR(record.ceilingPaise)}) से ${formatINR(unitOvercharge)} प्रति इकाई अधिक है (कुल संदेहास्पद: ${formatINR(totalOvercharge)})। विनियामक सीमाएं जीएसटी से अलग अधिसूचित हैं; अस्पताल सीमा से अधिक शुल्क नहीं ले सकते सिवाय लागू जीएसटी के।` | **needs native review** |
| **R-NPPA-02** | Billed Price Exceeds Printed MRP | `Billed unit rate (${formatINR(item.unitRatePaise)}) exceeds the manufacturer's printed Maximum Retail Price (${formatINR(item.mrpPaise)}) by ${formatINR(unitDifference)} per unit (total questioned: ${formatINR(totalOvercharge)}). Charging above printed MRP is prohibited under statutory regulations.` | `बिल की दर (${formatINR(item.unitRatePaise)}) निर्माता के अधिकतम खुदरा मूल्य (MRP: ${formatINR(item.mrpPaise)}) से ${formatINR(unitDifference)} प्रति इकाई अधिक है (कुल संदेहास्पद: ${formatINR(totalOvercharge)})। मुद्रित एमआरपी से अधिक शुल्क लेना विधिक रूप से प्रतिबंधित है।` | **needs native review** |
| **R-ANX-01** | Unverified Insurer Deduction | `The insurer deduction of ${formatINR(item.deductedPaise)} for "${item.description}" could not be matched to standard non-payable regulatory lists. Insurer clarification or clause citation is required.` | `"${item.description}" पर बीमा कंपनी की ${formatINR(item.deductedPaise)} की कटौती मानक गैर-देय विनियामक सूची में नहीं मिली। बीमाकर्ता से नियम स्पष्टीकरण आवश्यक है।` | **needs native review** |
| **R-ANX-01** | Standard Non-Payable Item (Valid Deduction) | `Insurer deduction of ${formatINR(item.deductedPaise)} for "${item.description}" is supported as a standard non-payable item under ${matchedRecord.listName}.` | `"${item.description}" पर बीमा कंपनी की ${formatINR(item.deductedPaise)} की कटौती ${matchedRecord.listName} के तहत मानक गैर-देय मद के रूप में मान्य है।` | **needs native review** |
| **R-ANX-01** | Disputed Deduction: Subsumed Service | `Insurer deduction not supported by Annexure-I: this item is classified as SUBSUMED and should be evaluated against hospital room bundling rather than arbitrarily excluded.` | `अनुलग्नक-I द्वारा बीमा कटौती समर्थित नहीं है: यह मद समाविष्ट (SUBSUMED) के रूप में वर्गीकृत है, इसे सीधे बाहर नहीं किया जाना चाहिए।` | **needs native review** |
| **R-BUNDLE-01** | Service Likely Subsumed Under Room/ICU Tariff | `Charge for "${item.description}" (${formatINR(item.totalBilledPaise)}) is likely subsumed under room/ICU charges as per standard healthcare billing guidelines. Routine care and ward monitoring are normally covered in the daily bed tariff.` | `"${item.description}" का शुल्क (${formatINR(item.totalBilledPaise)}) मानक स्वास्थ्य सेवा बिलिंग दिशा-निर्देशों के अनुसार कमरे/आईसीयू शुल्क में समाविष्ट होने की संभावना है। नियमित नर्सिंग व देखरेख आमतौर पर दैनिक बिस्तर शुल्क में शामिल होती है।` | **needs native review** |
| **R-POLICY-01** | Improper Proportionate Deduction on Pharmacy/Implant | `Insurer deducted ${formatINR(item.deductedPaise)} from "${item.description}" due to room rent capping. Under IRDAI guidelines, proportionate deductions cannot be applied to medicines, consumables, or medical devices.` | `बीमा कंपनी ने रूम रेंट सीमा के आधार पर "${item.description}" से ${formatINR(item.deductedPaise)} की कटौती की। IRDAI नियमों के अनुसार दवाओं और उपकरणों पर अनुपातिक कटौती लागू नहीं हो सकती।` | **needs native review** |

---

## 2. Terminology Glossary (For Reviewer)
- **Overcharge / Questioned Amount**: संदेहास्पद राशि (sandehāspad rāshi)
- **Ceiling Price**: विनियामक सीमा (viniyāmak seemā)
- **MRP**: अधिकतम खुदरा मूल्य (adhikatam khudrā mūlya)
- **Deduction**: कटौती (katoutī)
- **Non-Payable / Excluded**: गैर-देय (gair-deya)
- **Subsumed / Bundled**: समाविष्ट (samāvisht)
- **Banned Words Avoidance**: Strictly no words like "illegal", "fraud", or "cheating" ("धोखा", "अवैध", "जालसाजी") appear in any string.
