import LetterClient from './LetterClient';

export function generateStaticParams() {
  return [
    { findingId: 'f-name-order' },
    { findingId: 'f-dbt' },
    { findingId: 'f-dob-swap' },
    { findingId: 'f-ifsc' },
    { findingId: 'f-name-patronymic' },
    { findingId: 'f-missing-token' },
  ];
}

export const dynamicParams = true;

export default function LetterPage() {
  return <LetterClient />;
}
