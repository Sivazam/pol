'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, X, Map, Building2, Users, BarChart3,
  ArrowRight, Mail, Phone, Globe, MapPin,
  Compass, Keyboard, MessageCircle, PhoneCall,
  LayoutDashboard,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import type { AppView } from '@/lib/store';

/* ─── Tour Items ─── */
const TOUR_ITEMS: { view: AppView; icon: React.ElementType; title: string; description: string; color: string; bg: string }[] = [
  {
    view: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Overview of all project statistics and maps',
    color: 'text-[#0F2B46] dark:text-slate-200',
    bg: 'bg-[#0F2B46]/10 dark:bg-[#0F2B46]/30',
  },
  {
    view: 'mandal',
    icon: Map,
    title: 'Mandals',
    description: 'Explore the 3 mandals and their villages',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
  },
  {
    view: 'village',
    icon: Building2,
    title: 'Villages',
    description: 'Browse all 30 villages with family details',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-900/30',
  },
  {
    view: 'family',
    icon: Users,
    title: 'Families',
    description: 'Search and filter 13,961 families',
    color: 'text-[#1E3A5F] dark:text-blue-300',
    bg: 'bg-slate-100 dark:bg-slate-700/30',
  },
  {
    view: 'reports',
    icon: BarChart3,
    title: 'Reports',
    description: 'Analytics and data visualization',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
  },
  {
    view: 'relocation',
    icon: Compass,
    title: 'Relocation',
    description: 'Track plot allotment pipeline',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/30',
  },
];

/* ─── Keyboard Shortcuts ─── */
const KEYBOARD_SHORTCUTS: { keys: string; description: string; category: string }[] = [
  { keys: 'Ctrl/Cmd + K', description: 'Open Global Search', category: 'General' },
  { keys: 'F8', description: 'Toggle Notifications', category: 'General' },
  { keys: '?', description: 'Open Help Center', category: 'General' },
  { keys: 'Esc', description: 'Close panels/dialogs', category: 'General' },
  { keys: 'D', description: 'Go to Dashboard', category: 'Navigation' },
  { keys: 'M', description: 'Go to Mandals', category: 'Navigation' },
  { keys: 'V', description: 'Go to Villages', category: 'Navigation' },
  { keys: 'F', description: 'Go to Families', category: 'Navigation' },
  { keys: 'R', description: 'Go to Reports', category: 'Navigation' },
  { keys: 'T', description: 'Toggle Dark Mode', category: 'General' },
];

/* ─── FAQ Items ─── */
const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'What is the Polavaram R&R Portal?',
    answer:
      'A government portal for tracking the rehabilitation and resettlement of families affected by the Polavaram Irrigation Project on the Godavari River in Andhra Pradesh. It provides real-time data on family status, plot allotments, and project progress.',
  },
  {
    question: 'How many families are affected?',
    answer:
      '13,961 families across 3 mandals (VR Puram, Chintoor, and Kunavaram) and 30 villages are affected by the project. The portal tracks their socio-economic survey status, plot allotments, and relocation progress.',
  },
  {
    question: 'What is R&R Eligibility?',
    answer:
      'R&R Eligibility indicates whether a family is eligible for rehabilitation and resettlement benefits under the Polavaram project. Families are classified as Eligible or Ineligible based on their socio-economic survey data. This tracks the eligibility status of each family through the R&R process.',
  },
  {
    question: 'How is plot allotment tracked?',
    answer:
      'Through a 3-stage pipeline: Pending → Allotted → Possession Given. Families who are R&R eligible become eligible for plot allotment at R&R colonies. The Relocation view provides a visual Kanban board of this pipeline.',
  },
  {
    question: 'Can I export data?',
    answer:
      'Yes, use the Export feature in Reports or Family details. Data can be exported in CSV or JSON format. Visit the Reports view and click the Export button to download analytics data.',
  },
  {
    question: 'How do I search for a specific family?',
    answer:
      'Use Ctrl+K (or Cmd+K on Mac) for global search. You can search by PDF ID (e.g., PDF-VRP-001), village name, or mandal name. The search results will show matching families, villages, and mandals.',
  },
];

/* ─── Tab Config ─── */
const TAB_CONFIG = [
  { value: 'tour', label: 'Tour', icon: Compass },
  { value: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { value: 'faq', label: 'FAQ', icon: MessageCircle },
  { value: 'contact', label: 'Contact', icon: PhoneCall },
];

/* ═══════════════════════════════════════════════════════════════
   HELP CENTER COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function HelpCenter() {
  const helpCenterOpen = useAppStore((s) => s.helpCenterOpen);
  const setHelpCenterOpen = useAppStore((s) => s.setHelpCenterOpen);
  const setView = useAppStore((s) => s.setView);
  const view = useAppStore((s) => s.view);
  const mapHeavyView = ['mandal', 'village', 'map', 'relocation'].includes(view);
  const floatingButtonPosition = mapHeavyView ? 'left-4 right-auto lg:left-[76px]' : 'right-6';
  const floatingButtonVisibility = mapHeavyView ? 'hidden lg:flex' : 'flex';
  const [activeTab, setActiveTab] = useState('tour');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && helpCenterOpen) {
        setHelpCenterOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [helpCenterOpen, setHelpCenterOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (helpCenterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [helpCenterOpen]);

  const handleTourNavigate = useCallback(
    (targetView: AppView) => {
      setHelpCenterOpen(false);
      setView(targetView);
    },
    [setHelpCenterOpen, setView],
  );

  // Don't render on globe or login views
  if (view === 'globe' || view === 'login') return null;

  return (
    <>
      {/* Floating Help Button */}
      <motion.button
        onClick={() => setHelpCenterOpen(true)}
        className={`fixed bottom-6 ${floatingButtonPosition} z-40 w-12 h-12 rounded-full bg-gradient-to-br from-[#0F2B46] to-[#1E3A5F] shadow-lg shadow-[#0F2B46]/25 ${floatingButtonVisibility} items-center justify-center hover:shadow-xl hover:shadow-[#0F2B46]/30 transition-shadow group`}
        aria-label="Open Help Center"
        title="Help Center (?)"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
      >
        <HelpCircle className="w-5 h-5 text-white group-hover:text-amber-300 transition-colors" />
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-ping" />
      </motion.button>

      {/* Help Center Drawer */}
      <AnimatePresence>
        {helpCenterOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setHelpCenterOpen(false)}
            />

            {/* Slide-out Panel */}
            <motion.div
              className="fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-xl shadow-2xl border-l border-slate-200/50 dark:border-slate-700/50 flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700/60 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white tracking-wide">Help Center</h2>
                    <p className="text-[10px] text-white/50" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                      Quick Tour &amp; Support
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHelpCenterOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  aria-label="Close Help Center"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 pt-3 pb-0">
                  <TabsList className="w-full h-auto flex-wrap bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                    {TAB_CONFIG.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="flex-1 text-xs gap-1.5 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-md"
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {/* ─── Quick Tour Tab ─── */}
                  <TabsContent value="tour" className="p-4 mt-0">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Quick Tour
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Navigate to key sections of the portal
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      {TOUR_ITEMS.map((item, idx) => (
                        <motion.button
                          key={item.view}
                          onClick={() => handleTourNavigate(item.view)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-150 dark:border-slate-700/50 hover:border-amber-300/50 dark:hover:border-amber-600/30 bg-white dark:bg-slate-800/30 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-all group text-left"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}
                          >
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors shrink-0" />
                        </motion.button>
                      ))}
                    </div>
                  </TabsContent>

                  {/* ─── Keyboard Shortcuts Tab ─── */}
                  <TabsContent value="shortcuts" className="p-4 mt-0">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Keyboard Shortcuts
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Speed up your workflow with these shortcuts
                      </p>
                    </div>

                    {['General', 'Navigation'].map((category) => (
                      <div key={category} className="mb-4 last:mb-0">
                        <h4 className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                          {category}
                        </h4>
                        <div className="space-y-1.5">
                          {KEYBOARD_SHORTCUTS.filter((s) => s.category === category).map((shortcut) => (
                            <div
                              key={shortcut.keys}
                              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/40"
                            >
                              <span className="text-xs text-slate-600 dark:text-slate-300">
                                {shortcut.description}
                              </span>
                              <div className="flex items-center gap-1">
                                {shortcut.keys.split(' + ').map((key, i, arr) => (
                                  <React.Fragment key={key}>
                                    <kbd
                                      className="px-2 py-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-semibold text-slate-700 dark:text-slate-300 shadow-sm"
                                      style={{ fontFamily: 'var(--font-jetbrains)' }}
                                    >
                                      {key}
                                    </kbd>
                                    {i < arr.length - 1 && (
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500">+</span>
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  {/* ─── FAQ Tab ─── */}
                  <TabsContent value="faq" className="p-4 mt-0">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Frequently Asked Questions
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Common questions about the portal
                      </p>
                    </div>
                    <Accordion type="single" collapsible className="space-y-2">
                      {FAQ_ITEMS.map((item, idx) => (
                        <AccordionItem
                          key={idx}
                          value={`faq-${idx}`}
                          className="border border-slate-150 dark:border-slate-700/40 rounded-xl px-4 overflow-hidden bg-white dark:bg-slate-800/30 data-[state=open]:border-amber-300/50 dark:data-[state=open]:border-amber-600/30 transition-colors"
                        >
                          <AccordionTrigger className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:no-underline py-3.5">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pb-3.5">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </TabsContent>

                  {/* ─── Contact Tab ─── */}
                  <TabsContent value="contact" className="p-4 mt-0">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Contact Support
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Get in touch with the project team
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* Department Card */}
                      <div className="p-4 rounded-xl bg-gradient-to-br from-[#0F2B46]/5 to-[#1E3A5F]/5 dark:from-[#0F2B46]/20 dark:to-[#1E3A5F]/20 border border-[#0F2B46]/10 dark:border-[#0F2B46]/30">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-[#0F2B46] dark:bg-[#1E3A5F] flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Water Resources Department
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Government of Andhra Pradesh
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Contact Items */}
                      {[
                        {
                          icon: Mail,
                          label: 'Email',
                          value: 'polavaram-rr@ap.gov.in',
                          color: 'text-teal-600 dark:text-teal-400',
                          bg: 'bg-teal-50 dark:bg-teal-900/30',
                          href: 'mailto:polavaram-rr@ap.gov.in',
                        },
                        {
                          icon: Phone,
                          label: 'Phone',
                          value: '08812-252XXX',
                          color: 'text-amber-600 dark:text-amber-400',
                          bg: 'bg-amber-50 dark:bg-amber-900/30',
                          href: 'tel:08812252',
                        },
                        {
                          icon: Globe,
                          label: 'Website',
                          value: 'apwrims.ap.gov.in',
                          color: 'text-[#0F2B46] dark:text-blue-400',
                          bg: 'bg-slate-100 dark:bg-slate-700/30',
                          href: 'https://apwrims.ap.gov.in',
                        },
                      ].map((item) => (
                        <a
                          key={item.label}
                          href={item.href}
                          target={item.icon === Globe ? '_blank' : undefined}
                          rel={item.icon === Globe ? 'noopener noreferrer' : undefined}
                          className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/40 hover:border-amber-300/50 dark:hover:border-amber-600/30 bg-white dark:bg-slate-800/30 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-all group"
                        >
                          <div
                            className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}
                          >
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">
                              {item.label}
                            </p>
                            <p
                              className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5"
                              style={{ fontFamily: 'var(--font-jetbrains)' }}
                            >
                              {item.value}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors shrink-0" />
                        </a>
                      ))}
                    </div>

                    {/* Help Tip */}
                    <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/30">
                      <div className="flex items-start gap-2.5">
                        <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                            Need quick help?
                          </p>
                          <p className="text-[11px] text-amber-600 dark:text-amber-400/70 mt-1 leading-relaxed">
                            Press <kbd className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-800/40 border border-amber-200 dark:border-amber-700/50 text-[10px] font-semibold" style={{ fontFamily: 'var(--font-jetbrains)' }}>?</kbd> anytime to open this Help Center, or use <kbd className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-800/40 border border-amber-200 dark:border-amber-700/50 text-[10px] font-semibold" style={{ fontFamily: 'var(--font-jetbrains)' }}>Ctrl+K</kbd> to search the portal.
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <p
                    className="text-[10px] text-slate-400 dark:text-slate-500"
                    style={{ fontFamily: 'var(--font-jetbrains)' }}
                  >
                    Press <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[9px] font-semibold">Esc</kbd> to close
                  </p>
                  <p
                    className="text-[10px] text-slate-400 dark:text-slate-500"
                    style={{ fontFamily: 'var(--font-jetbrains)' }}
                  >
                    Polavaram R&amp;R Portal v1.0
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
