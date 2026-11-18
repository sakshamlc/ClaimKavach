import { redirect } from 'next/navigation';

export function generateStaticParams() {
  return [];
}

export const dynamicParams = true;

export default function LetterRedirect() {
  redirect('/report');
}
