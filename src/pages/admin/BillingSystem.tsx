import React from "react";
import SuperAdminBilling from "@/components/admin/SuperAdminBilling";

const BillingSystem = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-2xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Billing System
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Global financial oversight and billing operations.</p>
          </div>
        </div>
      </div>
      <SuperAdminBilling />
    </div>
  );
};

export default BillingSystem;
