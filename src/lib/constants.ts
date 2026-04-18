// Polavaram Project Coordinates & Constants
export const POLAVARAM_DAM = { lat: 17.2473, lng: 81.7119 };
export const ANDHRA_PRADESH = { lat: 17.0005, lng: 81.8040 };
export const INDIA = { lat: 20.5937, lng: 78.9629 };

export const MANDAL_COLORS = {
  POL: '#D97706', // Amber-600
  VEL: '#0D9488', // Teal-600
  BUT: '#EA580C', // Orange-600
} as const;

// Light theme status configurations
export const SES_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  SURVEYED: { label: 'Surveyed', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' },
  VERIFIED: { label: 'Verified', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
  APPROVED: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
};

export const ALLOTMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
  ALLOTTED: { label: 'Allotted', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
  POSSESSION_GIVEN: { label: 'Possession Given', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
};

export const STATUS_TIMELINE = ['SURVEYED', 'VERIFIED', 'APPROVED', 'RELOCATED'] as const;

// Simplified Godavari River path through the project area
export const GODAVARI_RIVER_PATH: [number, number][] = [
  [17.35, 81.65],
  [17.32, 81.68],
  [17.30, 81.71],
  [17.28, 81.72],
  [17.26, 81.71],
  [17.2473, 81.7119], // Dam site
  [17.22, 81.70],
  [17.19, 81.68],
  [17.16, 81.66],
  [17.13, 81.64],
  [17.10, 81.62],
];

export const MANDAL_CODES = {
  POLAVARAM: 'POL',
  VELAIRPAD: 'VEL',
  BUTTAIGUDEM: 'BUT',
} as const;

// Government brand colors for light theme
export const GOV_COLORS = {
  navy: '#0F2B46',
  navyLight: '#1E3A5F',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  green: '#15803D',
  greenLight: '#DCFCE7',
  saffron: '#FF9933',
  tricolorGreen: '#138808',
} as const;
