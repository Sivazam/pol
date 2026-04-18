'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  view: string;
  id?: string;
}

export default function Breadcrumb() {
  const view = useAppStore((s) => s.view);
  const selectedMandalId = useAppStore((s) => s.selectedMandalId);
  const selectedVillageId = useAppStore((s) => s.selectedVillageId);
  const selectedFamilyPdf = useAppStore((s) => s.selectedFamilyPdf);
  const selectedFamilyId = useAppStore((s) => s.selectedFamilyId);
  const navigateToMandal = useAppStore((s) => s.navigateToMandal);
  const navigateToVillage = useAppStore((s) => s.navigateToVillage);
  const navigateToFamily = useAppStore((s) => s.navigateToFamily);
  const setView = useAppStore((s) => s.setView);

  const items: BreadcrumbItem[] = [{ label: 'Dashboard', view: 'dashboard' }];

  if (['mandal', 'village', 'family', 'member', 'relocation'].includes(view)) {
    items.push({ label: 'Mandal', view: 'mandal', id: selectedMandalId || undefined });
  }
  if (['village', 'family', 'member', 'relocation'].includes(view)) {
    items.push({ label: 'Village', view: 'village', id: selectedVillageId || undefined });
  }
  if (['family', 'member', 'relocation'].includes(view)) {
    items.push({ label: selectedFamilyPdf || 'Family', view: 'family' });
  }
  if (view === 'member') {
    items.push({ label: 'Member', view: 'member' });
  }
  if (view === 'relocation') {
    items.push({ label: 'Relocation', view: 'relocation' });
  }

  const handleCrumbClick = (item: BreadcrumbItem, index: number) => {
    if (index === items.length - 1) return;
    switch (item.view) {
      case 'dashboard': setView('dashboard'); break;
      case 'mandal': if (item.id) navigateToMandal(item.id); break;
      case 'village': if (item.id) navigateToVillage(item.id); break;
      case 'family': if (selectedFamilyPdf && selectedFamilyId) navigateToFamily(selectedFamilyPdf, selectedFamilyId); break;
    }
  };

  if (view === 'globe' || view === 'login' || view === 'dashboard') return null;

  return (
    <div className="flex items-center gap-1.5 text-xs px-1 py-2 overflow-x-auto">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
            <button
              onClick={() => handleCrumbClick(item, index)}
              className={`shrink-0 transition-colors ${
                isLast ? 'text-slate-900 font-semibold cursor-default' : 'text-slate-400 hover:text-[#1E3A5F] cursor-pointer'
              }`}
              disabled={isLast}
            >
              {index === 0 ? (
                <span className="flex items-center gap-1"><Home className="w-3 h-3" />{item.label}</span>
              ) : item.label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
