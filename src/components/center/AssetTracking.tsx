import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Package, Plus, Trash2, Search, MapPin, User, Settings, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function AssetTracking({ centerId, canEdit }: { centerId: string, canEdit?: boolean }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [assetForm, setAssetForm] = useState({ name: "", category: "", location: "", condition: "Good", serial_number: "", purchase_price: "", purchase_date: "", warranty_expiry: "" });

  const { data: assets, isLoading } = useQuery({
    queryKey: ["school-assets", centerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assets").select("*").eq("center_id", centerId);
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  const addAssetMutation = useMutation({
    mutationFn: async () => {
      if (!centerId) throw new Error("Security Context: Center ID not verified. Operation aborted.");
      if (!canEdit) throw new Error("Access Denied: You do not have permission to add assets.");
      const payload: any = {
        center_id: centerId,
        name: assetForm.name,
        category: assetForm.category,
        location: assetForm.location,
        condition: assetForm.condition,
      };

      if (assetForm.serial_number) payload.asset_tag = assetForm.serial_number;
      if (assetForm.purchase_date) payload.purchase_date = assetForm.purchase_date;
      if (assetForm.purchase_price) payload.purchase_price = parseFloat(assetForm.purchase_price);
      if (assetForm.warranty_expiry) payload.warranty_expiry = assetForm.warranty_expiry;

      const { error } = await supabase.from("assets").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-assets"] });
      setAssetForm({ name: "", category: "", location: "", condition: "Good", serial_number: "", purchase_price: "", purchase_date: "", warranty_expiry: "" });
      setShowAddAsset(false);
      toast.success("Asset logged in registry");
    }
  });

  const filteredAssets = assets?.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.category?.toLowerCase().includes(search.toLowerCase()));

  const totalValuation = assets?.reduce((acc, curr) => acc + (curr.purchase_price || 0), 0) || 0;

  const updateAssetStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to update asset status.");
      const { error } = await supabase.from('assets').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-assets"] });
      toast.success("Asset status updated");
    },
    onError: (error: any) => toast.error(error.message)
  });

  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
      {/* Master List */}
      <div className={cn(
        "flex-1 space-y-6 transition-all duration-500",
        selectedAsset ? "lg:w-1/2" : "w-full"
      )}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="rounded-3xl border-none shadow-soft bg-blue-50 p-6">
           <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">Total Assets</p>
           <p className="text-3xl font-black text-blue-700">{assets?.length || 0}</p>
        </Card>
        <Card className="rounded-3xl border-none shadow-soft bg-emerald-50 p-6">
           <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">Registry Valuation</p>
           <p className="text-3xl font-black text-emerald-700">NPR {totalValuation.toLocaleString()}</p>
        </Card>
        <Card className="rounded-3xl border-none shadow-soft bg-amber-50 p-6">
           <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1">Avg. Condition</p>
           <p className="text-3xl font-black text-amber-700">Good</p>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search assets (e.g. Projector, Lab Equipment)..."
            className="pl-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canEdit && (
          <Button onClick={() => setShowAddAsset(!showAddAsset)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest ml-4">
            {showAddAsset ? "Cancel" : "Log Asset"}
          </Button>
        )}
      </div>

      {showAddAsset && (
        <Card className="rounded-3xl border-none shadow-strong bg-slate-50 overflow-hidden">
          <CardHeader className="bg-slate-100/50 py-4 px-6 border-b">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">New Asset Procurement</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Asset Name *</Label>
                <Input value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})} className="h-10 rounded-lg bg-white" placeholder="e.g. Dell Latitude 5420" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Category</Label>
                <Input value={assetForm.category} onChange={e => setAssetForm({...assetForm, category: e.target.value})} className="h-10 rounded-lg bg-white" placeholder="e.g. IT Equipment" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Serial / Asset Tag</Label>
                <Input value={assetForm.serial_number} onChange={e => setAssetForm({...assetForm, serial_number: e.target.value})} className="h-10 rounded-lg bg-white" placeholder="TAG-12345" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Location</Label>
                <Input value={assetForm.location} onChange={e => setAssetForm({...assetForm, location: e.target.value})} className="h-10 rounded-lg bg-white" placeholder="e.g. IT Lab 1" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Purchase Date</Label>
                <Input type="date" value={assetForm.purchase_date} onChange={e => setAssetForm({...assetForm, purchase_date: e.target.value})} className="h-10 rounded-lg bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Cost (NPR )</Label>
                <Input type="number" value={assetForm.purchase_price} onChange={e => setAssetForm({...assetForm, purchase_price: e.target.value})} className="h-10 rounded-lg bg-white" placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Warranty Expiry</Label>
                <Input type="date" value={assetForm.warranty_expiry} onChange={e => setAssetForm({...assetForm, warranty_expiry: e.target.value})} className="h-10 rounded-lg bg-white" />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => addAssetMutation.mutate()}
                  disabled={!assetForm.name || addAssetMutation.isPending}
                  className="w-full h-10 rounded-lg font-black uppercase text-[10px] tracking-widest bg-primary text-white shadow-strong hover:scale-[1.02] transition-all"
                >
                  {addAssetMutation.isPending ? "Syncing..." : "Commit Asset"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-[2rem] overflow-hidden bg-white/50 backdrop-blur-md shadow-soft">
        <div className="overflow-x-auto">
  <Table>
          <TableHeader className="bg-primary/5">
            <TableRow>
              <TableHead className="px-6">Asset Details</TableHead>
              <TableHead>Status</TableHead>
              {!selectedAsset && <TableHead>Identification</TableHead>}
              {!selectedAsset && <TableHead>Procurement</TableHead>}
              <TableHead className="text-right px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={selectedAsset ? 3 : 5} className="text-center py-12">Loading inventory...</TableCell></TableRow>
            ) : filteredAssets?.map((a: any) => (
              <TableRow
                key={a.id}
                className={cn(
                  "group/row cursor-pointer transition-all",
                  selectedAsset?.id === a.id ? "bg-primary/5" : "hover:bg-primary/5"
                )}
                onClick={() => setSelectedAsset(a)}
              >
                <TableCell className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-700 leading-tight">{a.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{a.category || "UNCATEGORIZED"}</span>
                  </div>
                </TableCell>
                <TableCell>
                    <Badge variant={a.status === 'Active' ? 'pulse' : 'destructive'}>
                        {a.status}
                    </Badge>
                </TableCell>
                {!selectedAsset && (
                  <>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="w-fit text-[9px] font-black tracking-widest bg-indigo-50 text-indigo-700 border-none">
                            TAG: {a.asset_tag || "N/A"}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                            <MapPin className="h-3 w-3" /> {a.location || "UNASSIGNED"}
                          </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-600">NPR {a.purchase_price || "0.00"}</span>
                          <span className="text-[9px] font-medium text-slate-400 uppercase">{a.purchase_date ? new Date(a.purchase_date).toLocaleDateString() : "DATE UNSET"}</span>
                      </div>
                    </TableCell>
                  </>
                )}
                <TableCell className="text-right px-6">
                   <div className="flex justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-all">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft"><Settings className="h-3.5 w-3.5 text-slate-400" /></Button>
                   </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredAssets?.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400 italic">No assets discovered in inventory.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
</div>
      </div>
      </div>

      {/* Detail View */}
      {selectedAsset && (
        <div className="lg:w-1/2 animate-in slide-in-from-right-8 duration-500">
           <Card className="rounded-[2.5rem] border-none shadow-strong bg-white overflow-hidden sticky top-8">
              <CardHeader className="bg-primary/5 border-b border-border/10 p-8 flex flex-row justify-between items-start">
                 <div>
                    <Badge className="mb-4 bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-lg">Asset Detail Matrix</Badge>
                    <CardTitle className="text-3xl font-black tracking-tight text-slate-800">{selectedAsset.name}</CardTitle>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-1">{selectedAsset.category}</p>
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => setSelectedAsset(null)} className="rounded-full hover:bg-rose-50 text-rose-500">
                    <Trash2 className="h-5 w-5" />
                 </Button>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                 <div className="grid grid-cols-2 gap-8">
                    <DetailBlock label="Procurement Cost" value={`NPR ${selectedAsset.purchase_price?.toLocaleString() || '0.00'}`} icon={DollarSign} />
                    <DetailBlock label="Registry Tag" value={selectedAsset.asset_tag || 'N/A'} icon={Package} />
                    <DetailBlock label="Current Location" value={selectedAsset.location || 'Unassigned'} icon={MapPin} />
                    <DetailBlock label="Condition" value={selectedAsset.condition} icon={Settings} />
                 </div>

                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                    <p className="label-caps">Lifecycle Timeline</p>
                    <div className="space-y-4">
                       <TimelineItem label="Procured On" value={selectedAsset.purchase_date ? format(new Date(selectedAsset.purchase_date), "MMMM d, yyyy") : 'Date Unset'} />
                       <TimelineItem label="Warranty Expiry" value={selectedAsset.warranty_expiry ? format(new Date(selectedAsset.warranty_expiry), "MMMM d, yyyy") : 'No Warranty Recorded'} color="rose" />
                    </div>
                 </div>

                 {canEdit && selectedAsset.status === 'Active' && (
                    <Button
                        variant="destructive"
                        className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-500/20"
                        onClick={() => {
                            if (window.confirm("Are you sure you want to dispose/dump this fixed asset?")) {
                                updateAssetStatusMutation.mutate({ id: selectedAsset.id, status: 'Disposed' });
                                setSelectedAsset(null);
                            }
                        }}
                    >
                        Dump Fixed Asset Registry
                    </Button>
                 )}
              </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
}

function DetailBlock({ label, value, icon: Icon }: any) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                </div>
                <span className="label-caps">{label}</span>
            </div>
            <p className="text-xl font-black text-slate-700">{value}</p>
        </div>
    )
}

function TimelineItem({ label, value, color }: any) {
    return (
        <div className="flex justify-between items-center border-b border-slate-200/60 pb-3 last:border-0 last:pb-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            <span className={cn("font-black text-sm", color === 'rose' ? "text-rose-500" : "text-slate-700")}>{value}</span>
        </div>
    )
}
