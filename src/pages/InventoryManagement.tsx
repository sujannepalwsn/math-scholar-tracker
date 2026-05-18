import React from "react";
import { Package, Book, Archive, Plus, Search, Filter, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import AssetTracking from "@/components/center/AssetTracking";
import LibraryManagement from "@/components/center/LibraryManagement";
import ConsumablesManagement from "@/components/center/ConsumablesManagement";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission, hasActionPermission } from "@/utils/permissions";

export default function InventoryManagement() {
  const { user } = useAuth();
  const centerId = user?.center_id || "";
  const canEdit = hasActionPermission(user, 'inventory_assets', 'edit');

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <Package className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Resource Nexus
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Assets, Library & Stock</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="assets" className="space-y-8">
        <TabsList className="flex flex-nowrap overflow-x-auto w-full bg-white/50 border border-slate-100 p-1 rounded-2xl h-14 shadow-soft backdrop-blur-md">
          <TabsTrigger value="assets" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-soft">Fixed Assets</TabsTrigger>
          <TabsTrigger value="library" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-soft">Library Catalog</TabsTrigger>
          <TabsTrigger value="stock" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-soft">Consumables</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden border border-white/20">
            <CardHeader className="bg-primary/5 border-b border-border/10 px-8 py-6">
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                <Archive className="h-6 w-6 text-primary" /> Fixed Assets Registry
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <AssetTracking centerId={centerId} canEdit={canEdit} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden border border-white/20">
            <CardHeader className="bg-primary/5 border-b border-border/10 px-8 py-6">
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                <Book className="h-6 w-6 text-primary" /> Library Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <LibraryManagement centerId={centerId} canEdit={canEdit} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden border border-white/20">
            <CardHeader className="bg-primary/5 border-b border-border/10 px-8 py-6">
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                <Package className="h-6 w-6 text-primary" /> Consumables & Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
               <ConsumablesManagement centerId={centerId} canEdit={canEdit} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
