/**
 * Pure integer currency-to-words formatter for audio speech synthesis.
 * Converts integer paise into spoken English and Hindi expressions.
 * Zero floating-point arithmetic.
 */

const EN_UNITS: readonly string[] = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
];

const EN_TENS: readonly string[] = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
];

const HI_NUMS: readonly string[] = [
  'शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ',
  'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस',
  'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाइस', 'उनतीस',
  'तीस', 'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस',
  'चालीस', 'इकतालीस', 'बयालीस', 'तैंतालीस', 'चौवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास',
  'पचास', 'इक्यावन', 'बावन', 'तिरेपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठारहवन', 'उनसठ',
  'साठ', 'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सरसठ', 'अड़सठ', 'उनहत्तर',
  'सत्तर', 'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उन्नासी',
  'अस्सी', 'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी',
  'नब्बे', 'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पंचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे'
];

/**
 * Converts an integer 0..999 to English words.
 */
function englishChunkToWords(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundreds > 0) {
    parts.push(`${EN_UNITS[hundreds]} hundred`);
  }

  if (remainder > 0) {
    if (remainder < 20) {
      parts.push(EN_UNITS[remainder]);
    } else {
      const ten = Math.floor(remainder / 10);
      const unit = remainder % 10;
      if (unit > 0) {
        parts.push(`${EN_TENS[ten]}-${EN_UNITS[unit]}`);
      } else {
        parts.push(EN_TENS[ten]);
      }
    }
  }

  return parts.join(' ');
}

/**
 * Converts integer rupees to English words using the Indian numbering system:
 * Crores (10,000,000), Lakhs (100,000), Thousands (1,000), Hundreds (100).
 */
export function integerRupeesToEnglishWords(rupees: number): string {
  if (rupees === 0) return 'zero';

  const parts: string[] = [];
  let remaining = rupees;

  const crores = Math.floor(remaining / 10000000);
  remaining %= 10000000;

  const lakhs = Math.floor(remaining / 100000);
  remaining %= 100000;

  const thousands = Math.floor(remaining / 1000);
  remaining %= 1000;

  const hundredsAndUnits = remaining;

  if (crores > 0) {
    parts.push(`${englishChunkToWords(crores)} crore`);
  }
  if (lakhs > 0) {
    parts.push(`${englishChunkToWords(lakhs)} lakh`);
  }
  if (thousands > 0) {
    parts.push(`${englishChunkToWords(thousands)} thousand`);
  }
  if (hundredsAndUnits > 0) {
    parts.push(englishChunkToWords(hundredsAndUnits));
  }

  return parts.join(' ');
}

/**
 * Converts integer rupees to Hindi words using standard Indian numbering.
 */
export function integerRupeesToHindiWords(rupees: number): string {
  if (rupees === 0) return 'शून्य';

  const parts: string[] = [];
  let remaining = rupees;

  const crores = Math.floor(remaining / 10000000);
  remaining %= 10000000;

  const lakhs = Math.floor(remaining / 100000);
  remaining %= 100000;

  const thousands = Math.floor(remaining / 1000);
  remaining %= 1000;

  const hundreds = Math.floor(remaining / 100);
  const units = remaining % 100;

  if (crores > 0) {
    const croreWords = crores < 100 ? HI_NUMS[crores] : integerRupeesToHindiWords(crores);
    parts.push(`${croreWords} करोड़`);
  }
  if (lakhs > 0) {
    parts.push(`${HI_NUMS[lakhs]} लाख`);
  }
  if (thousands > 0) {
    parts.push(`${HI_NUMS[thousands]} हज़ार`);
  }
  if (hundreds > 0) {
    parts.push(`${HI_NUMS[hundreds]} सौ`);
  }
  if (units > 0) {
    parts.push(HI_NUMS[units]);
  }

  return parts.join(' ');
}

/**
 * Formats integer paise into a natural spoken rupee sentence.
 * Examples:
 *   1250000 paise -> "twelve thousand five hundred rupees" / "बारह हज़ार पाँच सौ रुपये"
 *   50 paise      -> "fifty paise" / "पचास पैसे"
 *   1050 paise    -> "ten rupees and fifty paise" / "दस रुपये पचास पैसे"
 *   100 paise     -> "one rupee" / "एक रुपया"
 */
export function formatPaiseForSpeech(paise: number, language: 'en' | 'hi' = 'en'): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const remPaise = absPaise % 100;

  if (language === 'hi') {
    const prefix = isNegative ? 'ऋणात्मक ' : '';
    if (rupees === 0 && remPaise === 0) {
      return `${prefix}शून्य रुपये`;
    }
    if (rupees === 0) {
      const paiseWord = remPaise === 1 ? 'पैसा' : 'पैसे';
      return `${prefix}${HI_NUMS[remPaise]} ${paiseWord}`;
    }
    const rupeeWords = integerRupeesToHindiWords(rupees);
    const rupeeUnit = rupees === 1 ? 'रुपया' : 'रुपये';
    if (remPaise === 0) {
      return `${prefix}${rupeeWords} ${rupeeUnit}`;
    }
    const paiseWord = remPaise === 1 ? 'पैसा' : 'पैसे';
    return `${prefix}${rupeeWords} ${rupeeUnit} ${HI_NUMS[remPaise]} ${paiseWord}`;
  }

  // English
  const prefix = isNegative ? 'negative ' : '';
  if (rupees === 0 && remPaise === 0) {
    return `${prefix}zero rupees`;
  }
  if (rupees === 0) {
    const paiseWord = remPaise === 1 ? 'paisa' : 'paise';
    const paiseWords = englishChunkToWords(remPaise);
    return `${prefix}${paiseWords} ${paiseWord}`;
  }

  const rupeeWords = integerRupeesToEnglishWords(rupees);
  const rupeeUnit = rupees === 1 ? 'rupee' : 'rupees';

  if (remPaise === 0) {
    return `${prefix}${rupeeWords} ${rupeeUnit}`;
  }

  const paiseWord = remPaise === 1 ? 'paisa' : 'paise';
  const paiseWords = englishChunkToWords(remPaise);
  return `${prefix}${rupeeWords} ${rupeeUnit} and ${paiseWords} ${paiseWord}`;
}
