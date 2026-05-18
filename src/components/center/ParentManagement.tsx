import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Search, Shield, ShieldOff, KeyRound, Calendar,
  Loader2, Check, X, Pencil, Save, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { format } from "date-fns";
import * as bcrypt from "bcryptjs";
import { cn } from "@/lib/utils";

import { useAuth } from "@/contexts/AuthContext";
import { hasActionPermission } from "@/utils/permissions";

export default function ParentManagement({ centerId }: { centerId: string }) {
  const { user } = useAuth();
  const canEdit = hasActionPermission(user, 'register_student', 'edit');
  const queryClient = useQueryClient();
  const [searchFilter, setSearchFilter] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [selectedParent, setSelectedParent] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isChangingExpiry, setIsChangingExpiry] = useState(false);
  const [newExpiry, setNewExpiry] = useState("");

  const { data: parents = [], isLoading } = useQuery({
    queryKey: ["center-parents", centerId, searchFilter],
    queryFn: async () => {
      let query = supabase
        .from("users")
        .select(`
          id,
          username,
          is_active,
          expiry_date,
          role,
          parent_students (
            student_id,
            students (name, grade)
          )
        `)
        .eq("center_id", centerId)
        .eq("role", "parent")
        .order("username");

      if (searchFilter) {
        query = query.ilike("username", `%${searchFilter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("users")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-parents"] });
      toast.success("Account status updated");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!newPassword || newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(newPassword, salt);

      const { error } = await supabase
        .from("users")
        .update({ password_hash })
        .eq("id", selectedParent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setIsChangingPassword(false);
      setNewPassword("");
      setSelectedParent(null);
      toast.success("Password updated successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const changeExpiryMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("users")
        .update({ expiry_date: newExpiry || null })
        .eq("id", selectedParent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setIsChangingExpiry(false);
      setNewExpiry("");
      setSelectedParent(null);
      queryClient.invalidateQueries({ queryKey: ["center-parents"] });
      toast.success("Expiration date updated");
    },
    onError: (error: any) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-strong rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20 overflow-hidden">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-8 px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                Parent Accounts Registry
              </CardTitle>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-14">
                Manage login credentials and access control for guardians
              </p>
            </div>
            <div className="relative w-full md:w-auto">
              <Input
                placeholder="SEARCH PARENTS..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full md:w-[300px] h-11 md:h-12 rounded-2xl bg-white/50 border-none shadow-soft font-black text-[10px] uppercase tracking-widest pl-10"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto table-scroll-shadow">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/5 border-b border-slate-100">
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Username</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Linked Students</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Status</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Account Expiry</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4 text-right">Operations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parents.length > 0 ? (
                parents.map((parent: any) => (
                  <TableRow key={parent.id} className="group transition-all duration-300 hover:bg-card/60">
                    <TableCell className="px-8 py-5">
                      <p className="font-black text-slate-700 text-sm">{parent.username}</p>
                    </TableCell>
                    <TableCell className="px-8 py-5">
                      <div className="flex flex-wrap gap-1">
                        {parent.parent_students?.map((ps: any, idx: number) => (
                          <Badge key={idx} variant="secondary" className="bg-primary/5 text-primary/70 border-none rounded-lg text-[9px] font-black uppercase">
                            {ps.students?.name} ({ps.students?.grade})
                          </Badge>
                        ))}
                        {(!parent.parent_students || parent.parent_students.length === 0) && (
                          <span className="text-[10px] text-slate-400 italic font-medium">No students linked</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-5">
                      {parent.is_active ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none rounded-lg text-[10px] font-black uppercase">Active</Badge>
                      ) : (
                        <Badge className="bg-rose-500/10 text-rose-600 border-none rounded-lg text-[10px] font-black uppercase">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-[10px] font-black uppercase tracking-tighter",
                          parent.expiry_date && new Date(parent.expiry_date) < new Date() ? "text-rose-500" : "text-slate-500"
                        )}>
                          {parent.expiry_date ? format(new Date(parent.expiry_date), "MMM d, yyyy") : "NO EXPIRY"}
                        </p>
                        {parent.expiry_date && new Date(parent.expiry_date) < new Date() && (
                          <AlertTriangle className="h-3 w-3 text-rose-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/5"
                              onClick={() => {
                                setSelectedParent(parent);
                                setIsChangingPassword(true);
                              }}
                              title="Change Password"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/5"
                              onClick={() => {
                                setSelectedParent(parent);
                                setNewExpiry(parent.expiry_date ? parent.expiry_date.split('T')[0] : "");
                                setIsChangingExpiry(true);
                              }}
                              title="Set Expiry Date"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-9 w-9 rounded-xl bg-white shadow-soft transition-all",
                                parent.is_active ? "text-rose-500 hover:bg-rose-50" : "text-emerald-500 hover:bg-emerald-50"
                              )}
                              onClick={() => toggleStatusMutation.mutate({ id: parent.id, is_active: !parent.is_active })}
                              title={parent.is_active ? "Deactivate Account" : "Activate Account"}
                            >
                              {parent.is_active ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 italic text-slate-400 font-medium">
                    No parent accounts found in the registry.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Update Access Key</DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-primary/60">
              Modifying security credentials for {selectedParent?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="MINIMUM 6 CHARACTERS"
                className="h-12 rounded-2xl bg-white border-none shadow-soft focus-visible:ring-primary/20 font-bold"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsChangingPassword(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12">
              ABORT
            </Button>
            <Button
              onClick={() => changePasswordMutation.mutate()}
              disabled={changePasswordMutation.isPending}
              className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12 bg-slate-900 text-white shadow-lg"
            >
              {changePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              UPDATE PASSWORD
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expiry Date Dialog */}
      <Dialog open={isChangingExpiry} onOpenChange={setIsChangingExpiry}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Set Account Expiry</DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-primary/60">
              Defining temporal access limits for {selectedParent?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Expiration Date</Label>
              <Input
                type="date"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                className="h-12 rounded-2xl bg-white border-none shadow-soft focus-visible:ring-primary/20 font-bold"
              />
              <p className="text-[9px] font-bold text-slate-400 italic ml-1">Account will be automatically deactivated after this date.</p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsChangingExpiry(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12">
              ABORT
            </Button>
            <Button
              onClick={() => changeExpiryMutation.mutate()}
              disabled={changeExpiryMutation.isPending}
              className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12 bg-slate-900 text-white shadow-lg"
            >
              {changeExpiryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              SAVE EXPIRY
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
