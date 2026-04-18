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
  selectMandal: (id: string) => void;
  selectVillage: (id: string) => void;
  selectFamily: (pdfNumber: string, familyId: string) => void;
  selectMember: (id: string) => void;
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
    set({ view: prev });
    // Reset scroll position when going back
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
    }
  },
}));
