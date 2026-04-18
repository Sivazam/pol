// Polavaram Project Coordinates & Constants
export const POLAVARAM_DAM = { lat: 17.2473, lng: 81.7119 };
export const ANDHRA_PRADESH = { lat: 17.0005, lng: 81.8040 };
export const INDIA = { lat: 20.5937, lng: 78.9629 };

export const MANDAL_COLORS = {
  POL: '#F59E0B', // Amber
  VEL: '#14B8A6', // Teal
  BUT: '#F97316', // Coral/Orange
} as const;

export const SES_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  SURVEYED: { label: 'Surveyed', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' },
  VERIFIED: { label: 'Verified', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  APPROVED: { label: 'Approved', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  REJECTED: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
};

export const ALLOTMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  ALLOTTED: { label: 'Allotted', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  POSSESSION_GIVEN: { label: 'Possession Given', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
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
