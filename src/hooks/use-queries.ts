import { useQuery } from '@tanstack/react-query';

// Generic fetch helper
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

// Hook for stats
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => fetchJson<{
      totalFamilies: number;
      totalMembers: number;
      rrEligible: number;
      rrIneligible: number;
      plotsAllotted: number;
      plotsPending: number;
      plotsPossessionGiven: number;
      mandals: Array<{
        id: string; name: string; nameTelugu: string; code: string;
        latitude: number; longitude: number; color: string;
        familyCount: number; villageCount: number; firstSchemeCount: number;
      }>;
    }>('/api/stats'),
  });
}

// Hook for mandals
export function useMandals() {
  return useQuery({
    queryKey: ['mandals'],
    queryFn: () => fetchJson<Array<{
      id: string; name: string; nameTelugu: string; code: string;
      latitude: number; longitude: number; color: string;
      familyCount: number; villageCount: number; firstSchemeCount: number;
      statusBreakdown: Record<string, number>;
    }>>('/api/mandals'),
  });
}

// Hook for villages
export function useVillages(mandalId?: string) {
  return useQuery({
    queryKey: ['villages', mandalId],
    queryFn: () => fetchJson<Array<unknown>>(mandalId ? `/api/villages?mandalId=${mandalId}` : '/api/villages?all=true'),
    enabled: !!mandalId || mandalId === undefined,
  });
}

// Hook for activity
export function useActivity(params?: { type?: string; limit?: number; mandalCode?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set('type', params.type);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.mandalCode) searchParams.set('mandalCode', params.mandalCode);

  return useQuery({
    queryKey: ['activity', params],
    queryFn: () => fetchJson<{
      activities: Array<{ id: string; type: string; description: string; timestamp: string; severity?: string }>;
      summary: { total: number; thisWeek: number; today: number };
    }>(`/api/activity?${searchParams.toString()}`),
  });
}
