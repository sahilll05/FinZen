import { useQuery } from '@tanstack/react-query';
import { geoAPI } from '@/lib/api';
import { CountryRisk, SectorImpact } from '@/types';

export function useCountryRisk(code: string) {
  return useQuery({
    queryKey: ['geo', 'risk', code],
    queryFn: () => geoAPI.getCountryRisk(code).then(res => res.data as CountryRisk),
    enabled: !!code,
  });
}

export function useSectorImpact(code: string) {
  return useQuery({
    queryKey: ['geo', 'sectors', code],
    queryFn: () => 
      geoAPI.getSectorImpact(code).then(res => {
        // Backend returns SectorImpactResponse with sector_impacts array
        return res.data.sector_impacts as SectorImpact[];
      }),
    enabled: !!code,
  });
}
