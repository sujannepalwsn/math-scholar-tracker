export type SupabaseTier = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface PricingTier {
  id: SupabaseTier;
  name: string;
  baseMonthlyPrice: number;
  includedEgressGb: number;
  includedDatabaseStorageGb: number;
  includedFileStorageGb: number;
  includedEdgeFunctionInvocations: number;
  overageRates: {
    egressPerGb: number;
    databaseStoragePerGb: number;
    fileStoragePerGb: number;
    edgeFunctionPer1M: number;
    realtimeMessagePer1M: number;
  };
}

export const PRICING_TIERS: Record<SupabaseTier, PricingTier> = {
  FREE: {
    id: 'FREE',
    name: 'Free Tier',
    baseMonthlyPrice: 0,
    includedEgressGb: 2,
    includedDatabaseStorageGb: 0.5,
    includedFileStorageGb: 1,
    includedEdgeFunctionInvocations: 50000,
    overageRates: {
      egressPerGb: 0, // Not allowed to exceed on free
      databaseStoragePerGb: 0,
      fileStoragePerGb: 0,
      edgeFunctionPer1M: 0,
      realtimeMessagePer1M: 0
    }
  },
  PRO: {
    id: 'PRO',
    name: 'Pro Tier',
    baseMonthlyPrice: 25,
    includedEgressGb: 50,
    includedDatabaseStorageGb: 8,
    includedFileStorageGb: 100,
    includedEdgeFunctionInvocations: 500000,
    overageRates: {
      egressPerGb: 0.09,
      databaseStoragePerGb: 0.125,
      fileStoragePerGb: 0.021,
      edgeFunctionPer1M: 2.00,
      realtimeMessagePer1M: 2.50
    }
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise Tier',
    baseMonthlyPrice: 599,
    includedEgressGb: 500,
    includedDatabaseStorageGb: 100,
    includedFileStorageGb: 1000,
    includedEdgeFunctionInvocations: 5000000,
    overageRates: {
      egressPerGb: 0.07,
      databaseStoragePerGb: 0.10,
      fileStoragePerGb: 0.015,
      edgeFunctionPer1M: 1.50,
      realtimeMessagePer1M: 2.00
    }
  }
};
