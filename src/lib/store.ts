import { create } from 'zustand';

export type AppView = 
  | 'globe' 
  | 'dashboard' 
  | 'mandal' 
  | 'village' 
  | 'family' 
  | 'member' 
  | 'relocation'
  | 'login';

interface AppState {
  view: AppView;
  selectedMandalId: string | null;
  selectedVillageId: string | null;
  selectedFamilyPdf: string | null;
  selectedMemberId: string | null;
  selectedFamilyId: string | null;
  isAuthenticated: boolean;
  globeAnimComplete: boolean;
  sidebarOpen: boolean;
  notificationBannerVisible: boolean;

  setView: (view: AppView) => void;
  selectMandal: (id: string | null) => void;
  selectVillage: (id: string | null) => void;
  selectFamily: (pdfNumber: string | null, familyId: string | null) => void;
  selectMember: (id: string | null) => void;
  setAuthenticated: (val: boolean) => void;
  setGlobeAnimComplete: (val: boolean) => void;
  showFamilyTable: boolean;
  setShowFamilyTable: (val: boolean) => void;
  setSidebarOpen: (val: boolean) => void;
  setNotificationBannerVisible: (val: boolean) => void;
  navigateToMandal: (mandalId: string) => void;
  navigateToVillage: (villageId: string) => void;
  navigateToFamily: (pdfNumber: string, familyId: string) => void;
  navigateToMember: (memberId: string) => void;
  navigateToRelocation: (familyId: string) => void;
  goBack: () => void;
}

const viewHistory: AppView[] = ['globe'];

export const useAppStore = create<AppState>((set, get) => ({
  view: 'globe',
  selectedMandalId: null,
  selectedVillageId: null,
  selectedFamilyPdf: null,
  selectedMemberId: null,
  selectedFamilyId: null,
  isAuthenticated: false,
  globeAnimComplete: false,
  sidebarOpen: false,
  notificationBannerVisible: true,
  showFamilyTable: false,

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
  selectFamily: (pdfNumber, familyId) => set({ selectedFamilyPdf: pdfNumber, selectedFamilyId: familyId }),
  selectMember: (id) => set({ selectedMemberId: id }),
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setGlobeAnimComplete: (val) => set({ globeAnimComplete: val }),
  setShowFamilyTable: (val) => set({ showFamilyTable: val }),
  setSidebarOpen: (val) => set({ sidebarOpen: val }),
  setNotificationBannerVisible: (val) => set({ notificationBannerVisible: val }),

  navigateToMandal: (mandalId) => {
    set({ selectedMandalId: mandalId });
    get().setView('mandal');
  },
  navigateToVillage: (villageId) => {
    set({ selectedVillageId: villageId });
    get().setView('village');
  },
  navigateToFamily: (pdfNumber, familyId) => {
    set({ selectedFamilyPdf: pdfNumber, selectedFamilyId: familyId });
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
}));
