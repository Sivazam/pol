import { create } from 'zustand';

export type AppView =
  | 'globe'
  | 'dashboard'
  | 'mandal'
  | 'village'
  | 'family'
  | 'member'
  | 'relocation'
  | 'reports'
  | 'compare'
  | 'activity'
  | 'map'
  | 'admin'
  | 'login';

interface AppState {
  view: AppView;
  selectedMandalId: string | null;
  selectedVillageId: string | null;
  selectedFamilyPdf: string | null;
  selectedMemberId: string | null;
  selectedFamilyId: string | null;
  isAuthenticated: boolean;
  sessionRole: 'ADMIN' | 'OFFICER' | 'VIEWER' | 'PUBLIC';
  sessionEmail: string | null;
  sessionName: string | null;
  sessionMandalId: string | null;
  globeAnimComplete: boolean;
  sidebarOpen: boolean;
  notificationBannerVisible: boolean;
  helpCenterOpen: boolean;
  chatOpen: boolean;

  // Settings state
  settingsPanelOpen: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
  defaultPageSize: number;
  defaultSortOrder: string;
  defaultStartupView: string;
  notificationSoundEnabled: boolean;

  // Bookmarks state
  bookmarkedFamilies: string[];
  toggleBookmark: (familyId: string) => void;
  isBookmarked: (familyId: string) => boolean;

  // Dashboard widget visibility
  dashboardWidgets: Record<string, boolean>;
  setDashboardWidget: (key: string, visible: boolean) => void;

  setView: (view: AppView) => void;
  selectMandal: (id: string | null) => void;
  selectVillage: (id: string | null) => void;
  selectFamily: (pdfId: string | null, familyId: string | null) => void;
  selectMember: (id: string | null) => void;
  setAuthenticated: (val: boolean) => void;
  setSession: (s: { role: 'ADMIN' | 'OFFICER' | 'VIEWER' | 'PUBLIC'; email: string | null; name: string | null; mandalId: string | null }) => void;
  clearSession: () => void;
  setGlobeAnimComplete: (val: boolean) => void;
  showFamilyTable: boolean;
  setShowFamilyTable: (val: boolean) => void;
  setSidebarOpen: (val: boolean) => void;
  setNotificationBannerVisible: (val: boolean) => void;
  setHelpCenterOpen: (val: boolean) => void;
  setChatOpen: (val: boolean) => void;
  navigateToMandal: (mandalId: string) => void;
  navigateToVillage: (villageId: string) => void;
  navigateToFamily: (pdfId: string, familyId: string) => void;
  navigateToMember: (memberId: string) => void;
  navigateToRelocation: (familyId: string) => void;
  goBack: () => void;

  // Settings actions
  setSettingsPanelOpen: (val: boolean) => void;
  setCompactMode: (val: boolean) => void;
  setAnimationsEnabled: (val: boolean) => void;
  setDefaultPageSize: (val: number) => void;
  setDefaultSortOrder: (val: string) => void;
  setDefaultStartupView: (val: string) => void;
  setNotificationSoundEnabled: (val: boolean) => void;
}

const viewHistory: AppView[] = ['dashboard'];

// ─── Helper: read persisted bookmarks from localStorage ───────────
function getPersistedBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('polavaram-bookmarks');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// ─── Helper: read persisted dashboard widgets from localStorage ────
function getPersistedDashboardWidgets(): Record<string, boolean> {
  const defaults: Record<string, boolean> = {
    header: true,
    counters: true,
    progress: true,
    map: true,
    rrEligibility: true,
    mandalCards: true,
    charts: true,
    activity: true,
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = localStorage.getItem('polavaram-dashboard-widgets');
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  } catch {
    return defaults;
  }
}

// ─── Helper: read persisted settings from localStorage ────────────
function getPersistedSetting<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(`polavaram-settings-${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  view: getPersistedSetting('startupView', 'globe') as AppView,
  selectedMandalId: null,
  selectedVillageId: null,
  selectedFamilyPdf: null,
  selectedMemberId: null,
  selectedFamilyId: null,
  isAuthenticated: false,
  sessionRole: 'PUBLIC',
  sessionEmail: null,
  sessionName: null,
  sessionMandalId: null,
  globeAnimComplete: false,
  sidebarOpen: false,
  notificationBannerVisible: true,
  helpCenterOpen: false,
  chatOpen: false,
  showFamilyTable: false,

  // Settings defaults (with localStorage persistence)
  settingsPanelOpen: false,
  compactMode: getPersistedSetting('compactMode', false),
  animationsEnabled: getPersistedSetting('animationsEnabled', true),
  defaultPageSize: getPersistedSetting('defaultPageSize', 20),
  defaultSortOrder: getPersistedSetting('defaultSortOrder', 'pdfId'),
  defaultStartupView: getPersistedSetting('startupView', 'globe'),
  notificationSoundEnabled: getPersistedSetting('notificationSoundEnabled', false),

  // Bookmarks state
  bookmarkedFamilies: getPersistedBookmarks(),

  // Dashboard widget visibility (with localStorage persistence)
  dashboardWidgets: getPersistedDashboardWidgets(),

  toggleBookmark: (familyId: string) => {
    const current = get().bookmarkedFamilies;
    const updated = current.includes(familyId)
      ? current.filter((id) => id !== familyId)
      : [...current, familyId];
    set({ bookmarkedFamilies: updated });
    try {
      localStorage.setItem('polavaram-bookmarks', JSON.stringify(updated));
    } catch { /* ignore */ }
  },

  isBookmarked: (familyId: string) => {
    return get().bookmarkedFamilies.includes(familyId);
  },

  setDashboardWidget: (key: string, visible: boolean) => {
    const updated = { ...get().dashboardWidgets, [key]: visible };
    set({ dashboardWidgets: updated });
    try { localStorage.setItem('polavaram-dashboard-widgets', JSON.stringify(updated)); } catch { /* ignore */ }
  },

  setView: (view) => {
    viewHistory.push(view);
    set({ view, showFamilyTable: view === 'dashboard' ? get().showFamilyTable : false });
    // Reset scroll position when navigating between views
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
    }
  },
  selectMandal: (id) => set({ selectedMandalId: id }),
  selectVillage: (id) => set({ selectedVillageId: id }),
  selectFamily: (pdfId, familyId) => set({ selectedFamilyPdf: pdfId, selectedFamilyId: familyId }),
  selectMember: (id) => set({ selectedMemberId: id }),
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setSession: (s) => set({
    isAuthenticated: s.role !== 'PUBLIC',
    sessionRole: s.role,
    sessionEmail: s.email,
    sessionName: s.name,
    sessionMandalId: s.mandalId,
  }),
  clearSession: () => set({
    isAuthenticated: false,
    sessionRole: 'PUBLIC',
    sessionEmail: null,
    sessionName: null,
    sessionMandalId: null,
  }),
  setGlobeAnimComplete: (val) => set({ globeAnimComplete: val }),
  setShowFamilyTable: (val) => set({ showFamilyTable: val }),
  setSidebarOpen: (val) => set({ sidebarOpen: val }),
  setNotificationBannerVisible: (val) => set({ notificationBannerVisible: val }),
  setHelpCenterOpen: (val) => set({ helpCenterOpen: val }),
  setChatOpen: (val) => set({ chatOpen: val }),

  navigateToMandal: (mandalId) => {
    set({ selectedMandalId: mandalId });
    get().setView('mandal');
  },
  navigateToVillage: (villageId) => {
    set({ selectedVillageId: villageId });
    get().setView('village');
  },
  navigateToFamily: (pdfId, familyId) => {
    set({ selectedFamilyPdf: pdfId, selectedFamilyId: familyId });
    get().setView('family');
  },
  navigateToMember: (memberId) => {
    set({ selectedMemberId: memberId });
    get().setView('member');
  },
  navigateToRelocation: (familyId) => {
    set({ selectedFamilyId: familyId });
    get().setView('relocation');
  },
  goBack: () => {
    viewHistory.pop();
    const prev = viewHistory[viewHistory.length - 1] || 'globe';
    // Clear selection IDs based on where we're going back to
    // This ensures the component remounts in the correct mode
    const updates: Partial<AppState> = { view: prev };
    if (prev === 'mandal') {
      // Going back to mandal list? Keep selectedMandalId if it was set
    } else if (prev === 'village') {
      // Keep selectedVillageId if going back to a specific village
    } else {
      // Going back to dashboard or globe - clear deeper selections
      if (prev !== 'mandal') updates.selectedMandalId = null;
      if (prev !== 'village') updates.selectedVillageId = null;
      if (prev !== 'family' && prev !== 'member' && prev !== 'relocation') {
        updates.selectedFamilyPdf = null;
        updates.selectedFamilyId = null;
      }
      if (prev !== 'member') updates.selectedMemberId = null;
    }
    set(updates);
    // Reset scroll position when going back
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
    }
  },

  // Settings actions (with localStorage persistence)
  setSettingsPanelOpen: (val) => set({ settingsPanelOpen: val }),
  setCompactMode: (val) => {
    set({ compactMode: val });
    try { localStorage.setItem('polavaram-settings-compactMode', JSON.stringify(val)); } catch { /* ignore */ }
  },
  setAnimationsEnabled: (val) => {
    set({ animationsEnabled: val });
    try { localStorage.setItem('polavaram-settings-animationsEnabled', JSON.stringify(val)); } catch { /* ignore */ }
  },
  setDefaultPageSize: (val) => {
    set({ defaultPageSize: val });
    try { localStorage.setItem('polavaram-settings-defaultPageSize', JSON.stringify(val)); } catch { /* ignore */ }
  },
  setDefaultSortOrder: (val) => {
    set({ defaultSortOrder: val });
    try { localStorage.setItem('polavaram-settings-defaultSortOrder', JSON.stringify(val)); } catch { /* ignore */ }
  },
  setDefaultStartupView: (val) => {
    set({ defaultStartupView: val });
    try { localStorage.setItem('polavaram-settings-startupView', JSON.stringify(val)); } catch { /* ignore */ }
  },
  setNotificationSoundEnabled: (val) => {
    set({ notificationSoundEnabled: val });
    try { localStorage.setItem('polavaram-settings-notificationSoundEnabled', JSON.stringify(val)); } catch { /* ignore */ }
  },
}));
