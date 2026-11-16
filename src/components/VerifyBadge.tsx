'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export function VerifyBadge() {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
      <ExternalLink className="w-3 h-3 text-amber-700" />
      <span>{t('verifyOnOfficialSite')}</span>
    </span>
  );
}
