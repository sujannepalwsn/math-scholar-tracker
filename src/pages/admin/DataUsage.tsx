import React from "react";
import UsageMonitoring from "@/components/admin/UsageMonitoring";
import CostIntelligence from "@/components/admin/CostIntelligence";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DataUsage = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-2xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Data Usage & Cost
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Resource consumption and infrastructure cost intelligence.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="cost" className="space-y-8">
        <TabsList className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm inline-flex">
          <TabsTrigger value="cost" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Cost Intelligence</TabsTrigger>
          <TabsTrigger value="monitoring" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Resource Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="cost">
          <CostIntelligence />
        </TabsContent>
        <TabsContent value="monitoring">
          <UsageMonitoring />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataUsage;
