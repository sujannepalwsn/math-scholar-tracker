import { MODULE_MAPPINGS, ModuleMapping } from './moduleMapping';
import { ROLE_USAGE_MODELS, SYSTEM_USAGE_CONSTANTS } from './usageModel';
import { PRICING_TIERS, SupabaseTier } from './pricing';

export interface UserCounts {
  teachers: number;
  students: number;
  parents: number;
  admins: number;
}

export interface CostBreakdown {
  totalMonthlyCost: number;
  basePrice: number;
  overageCost: number;
  categories: {
    egress: { cost: number; usageGb: number };
    dbStorage: { cost: number; usageGb: number };
    fileStorage: { cost: number; usageGb: number };
    edgeFunctions: { cost: number; invocations: number };
  };
  moduleBreakdown: {
    moduleId: string;
    moduleName: string;
    monthlyRequests: number;
    bandwidthGb: number;
    costContribution: number;
  }[];
  roleBreakdown: {
    role: string;
    monthlyRequests: number;
    bandwidthGb: number;
    costContribution: number;
  }[];
}

export class CostEngine {
  static calculateProjectedCost(
    counts: UserCounts,
    tierId: SupabaseTier = 'PRO'
  ): CostBreakdown {
    const tier = PRICING_TIERS[tierId];
    const daysInMonth = 30;

    // 1. Calculate Monthly Requests and Bandwidth by Role
    let totalMonthlyRequests = 0;
    let totalMonthlyBandwidthGb = 0;

    const roleStats = ROLE_USAGE_MODELS.map(model => {
      const count = counts[model.role === 'admin' ? 'admins' : (model.role + 's' as keyof UserCounts)];
      const monthlyRequests = count * model.dailyRequests * model.activeDaysPerMonth;

      // Average weighted bandwidth per request for this role
      let avgBandwidthPerReqKb = 0;
      model.topModules.forEach(tm => {
        const module = MODULE_MAPPINGS.find(m => m.id === tm.moduleId);
        if (module) {
          avgBandwidthPerReqKb += (module.avgPayloadSizeKb * tm.weight);
        }
      });

      const bandwidthGb = (monthlyRequests * (avgBandwidthPerReqKb || 10)) / (1024 * 1024);

      return {
        role: model.role,
        monthlyRequests,
        bandwidthGb
      };
    });

    totalMonthlyRequests = roleStats.reduce((acc, s) => acc + s.monthlyRequests, 0);
    totalMonthlyBandwidthGb = roleStats.reduce((acc, s) => acc + s.bandwidthGb, 0);

    // 2. Calculate Module Breakdown
    const moduleStats = MODULE_MAPPINGS.map(module => {
      let moduleMonthlyRequests = 0;

      ROLE_USAGE_MODELS.forEach(model => {
        const roleCount = counts[model.role === 'admin' ? 'admins' : (model.role + 's' as keyof UserCounts)];
        const weight = model.topModules.find(tm => tm.moduleId === module.id)?.weight || 0;
        moduleMonthlyRequests += (roleCount * model.dailyRequests * model.activeDaysPerMonth * weight);
      });

      const bandwidthGb = (moduleMonthlyRequests * module.avgPayloadSizeKb) / (1024 * 1024);

      return {
        moduleId: module.id,
        moduleName: module.name,
        monthlyRequests: moduleMonthlyRequests,
        bandwidthGb
      };
    });

    // 3. Storage Estimates
    // DB Storage: (Teachers + Students) * est rows per year * avg row size
    // Very rough heuristic: each student/teacher adds ~5000 rows/year across all tables
    const totalPeople = counts.teachers + counts.students + counts.admins;
    const estTotalRows = totalPeople * 5000;
    const dbStorageGb = (estTotalRows * SYSTEM_USAGE_CONSTANTS.avgRowSizeChars) / (1024 * 1024 * 1024);

    // File Storage: Student docs, lesson plans, etc.
    const fileStorageGb = (totalPeople * 20 * SYSTEM_USAGE_CONSTANTS.storageObjectAvgSizeKb) / (1024 * 1024);

    // Edge Functions: Assume 10% of requests trigger an edge function
    const edgeFunctionInvocations = totalMonthlyRequests * 0.1;

    // 4. Cost Calculations
    const egressOverageGb = Math.max(0, totalMonthlyBandwidthGb - tier.includedEgressGb);
    const dbStorageOverageGb = Math.max(0, dbStorageGb - tier.includedDatabaseStorageGb);
    const fileStorageOverageGb = Math.max(0, fileStorageGb - tier.includedFileStorageGb);
    const edgeFunctionOverage = Math.max(0, edgeFunctionInvocations - tier.includedEdgeFunctionInvocations);

    // If on FREE tier, we calculate "Shadow Cost" (what it would cost on PRO) for better insight
    const rateTier = tierId === 'FREE' ? PRICING_TIERS['PRO'] : tier;

    const egressCost = egressOverageGb * rateTier.overageRates.egressPerGb;
    const dbStorageCost = dbStorageOverageGb * rateTier.overageRates.databaseStoragePerGb;
    const fileStorageCost = fileStorageOverageGb * rateTier.overageRates.fileStoragePerGb;
    const edgeFunctionCost = (edgeFunctionOverage / 1000000) * rateTier.overageRates.edgeFunctionPer1M;

    const overageCost = egressCost + dbStorageCost + fileStorageCost + edgeFunctionCost;
    const totalMonthlyCost = tier.baseMonthlyPrice + overageCost;

    // 5. Final Assembly
    return {
      totalMonthlyCost,
      basePrice: tier.baseMonthlyPrice,
      overageCost,
      categories: {
        egress: { cost: egressCost, usageGb: totalMonthlyBandwidthGb },
        dbStorage: { cost: dbStorageCost, usageGb: dbStorageGb },
        fileStorage: { cost: fileStorageCost, usageGb: fileStorageGb },
        edgeFunctions: { cost: edgeFunctionCost, invocations: edgeFunctionInvocations }
      },
      moduleBreakdown: moduleStats.map(m => ({
        ...m,
        costContribution: (m.bandwidthGb / (totalMonthlyBandwidthGb || 1)) * totalMonthlyCost
      })).sort((a, b) => b.costContribution - a.costContribution),
      roleBreakdown: roleStats.map(r => ({
        ...r,
        costContribution: (r.bandwidthGb / (totalMonthlyBandwidthGb || 1)) * totalMonthlyCost
      }))
    };
  }
}
