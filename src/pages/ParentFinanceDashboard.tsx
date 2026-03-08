import React, { useState } from "react";
import { AlertCircle, ArrowLeft, Check, CreditCard, Download, Eye, FileText, Info, PieChart, Receipt, TrendingUp, Wallet } from "lucide-react";
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Invoice, Payment } from "@/integrations/supabase/finance-types"
import { format, isPast } from "date-fns"
import { cn } from "@/lib/utils"


const ParentFinanceDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  // Check if user is parent with student
  if (user?.role !== 'parent' || !user?.student_id) {
    navigate('/login-parent');
    return null;
  }

  // Fetch student details
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', user.student_id!)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Fetch student's invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['student-invoices', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('student_id', user.student_id!)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    }
  });

  // Calculate summary - handle null paid_amount
  const summary = {
    total_invoiced: invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
    total_paid: invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0),
    total_outstanding: invoices.reduce((sum, inv) => sum + (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)), 0),
    overdue_count: invoices.filter(inv => 
      inv.status === 'overdue' || 
      (inv.due_date && isPast(new Date(inv.due_date)) && ['issued', 'partial'].includes(inv.status || ''))
    ).length
  };

  // Fetch payment history via invoices
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['student-payments', user.student_id],
    queryFn: async () => {
      const { data: studentInvoices, error: invError } = await supabase
        .from('invoices')
        .select('id')
        .eq('student_id', user.student_id!);
      
      if (invError) throw invError;
      if (!studentInvoices || studentInvoices.length === 0) return [];
      
      const invoiceIds = studentInvoices.map(inv => inv.id);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .in('invoice_id', invoiceIds)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusStyles = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      partial: 'bg-amber-50 text-amber-700 border-amber-100',
      overdue: 'bg-rose-50 text-rose-700 border-rose-100',
      issued: 'bg-primary/5 text-primary/70 border-primary/10',
      cancelled: 'bg-slate-50 text-slate-700 border-slate-100'
    };
    return styles[status] || 'bg-slate-50 text-slate-700 border-slate-100';
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDialog(true);
  };

  const handleOnlinePayment = (invoiceId: string, amount: number) => {
    alert(`Initiating secure payment gateway for ${formatCurrency(amount)}...`);
  };

  const handleDownloadPdf = (invoiceId: string) => {
    alert(`Generating cryptographically signed PDF...`);
  };

  if (studentLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Treasury Matrix
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Financial oversight for <span className="text-slate-700 font-bold">{student?.name}</span></p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={() => navigate('/parent-dashboard')} className="rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-card/60">
            <ArrowLeft className="h-4 w-4 mr-2" /> EXIT TO HUB
          </Button>
          <div className="bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 shadow-soft flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-none">Net Balance</span>
              <span className="font-black text-slate-700 text-sm">{formatCurrency(summary.total_outstanding)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {summary.overdue_count > 0 && (
        <div className="bg-rose-500/10 backdrop-blur-md border border-rose-200 p-4 rounded-3xl flex items-center gap-4 animate-bounce-subtle">
          <div className="h-10 w-10 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <AlertCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-black text-rose-900 text-sm uppercase tracking-tight">Financial Protocol Breach</p>
            <p className="text-xs font-medium text-rose-700 opacity-80">{summary.overdue_count} overdue invoice(s) require immediate settlement.</p>
          </div>
        </div>
      )}

      {/* Summary Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Institutional Fees", value: formatCurrency(summary.total_invoiced), icon: Receipt, color: "text-blue-600", bgColor: "bg-blue-500/10" },
          { title: "Settled Amount", value: formatCurrency(summary.total_paid), icon: TrendingUp, color: "text-emerald-600", bgColor: "bg-emerald-500/10" },
          { title: "Outstanding", value: formatCurrency(summary.total_outstanding), icon: Wallet, color: "text-orange-600", bgColor: "bg-orange-500/10" },
          { title: "Liquidity Index", value: summary.total_invoiced > 0 ? `${Math.round((summary.total_paid / summary.total_invoiced) * 100)}%` : '100%', icon: PieChart, color: "text-violet-600", bgColor: "bg-violet-500/10" },
        ].map((stat) => (
          <Card key={stat.title} className="border-none shadow-strong rounded-3xl bg-card/40 backdrop-blur-md border border-border/20 group hover:translate-y-[-4px] transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-2xl transition-transform group-hover:rotate-12", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-black text-slate-700 tracking-tight">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Ledger */}
      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <Tabs defaultValue="invoices" className="w-full">
          <CardHeader className="border-b border-muted/20 bg-primary/5 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                Account Ledger
              </CardTitle>
              <TabsList className="bg-slate-200/50 p-1 rounded-2xl">
                <TabsTrigger value="invoices" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-soft px-6">Invoices</TabsTrigger>
                <TabsTrigger value="payments" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-soft px-6">Payments</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <TabsContent value="invoices" className="m-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/5">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Document ID</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Billing Cycle</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Total Liability</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Outstanding</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Due Protocol</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Status</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicesLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin mx-auto"/></TableCell></TableRow>
                    ) : invoices.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-medium italic">No financial documents identified.</TableCell></TableRow>
                    ) : (
                      invoices.map((invoice) => (
                        <TableRow key={invoice.id} className="group transition-all duration-300 hover:bg-card/60">
                          <TableCell className="px-6 py-4 font-black text-slate-700 text-xs">#{invoice.invoice_number}</TableCell>
                          <TableCell className="px-6 py-4 text-xs font-bold text-slate-500">{format(new Date(invoice.invoice_year, invoice.invoice_month - 1), "MMMM yyyy")}</TableCell>
                          <TableCell className="px-6 py-4 font-black text-slate-700 text-xs">{formatCurrency(Number(invoice.total_amount))}</TableCell>
                          <TableCell className="px-6 py-4">
                            <span className={cn("font-black text-xs", Number(invoice.total_amount) - Number(invoice.paid_amount) > 0 ? "text-orange-600" : "text-emerald-600")}>
                              {formatCurrency(Number(invoice.total_amount) - Number(invoice.paid_amount))}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-xs font-bold text-slate-500">{format(new Date(invoice.due_date), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge variant="outline" className={cn("rounded-lg border-none text-[9px] font-black uppercase tracking-tighter", getStatusStyles(invoice.status))}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft" onClick={() => handleViewInvoice(invoice)}>
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="payments" className="m-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/5">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Transaction Date</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Settled Amount</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Payment Method</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Reference Protocol</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right">Verification</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin mx-auto"/></TableCell></TableRow>
                    ) : payments.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-medium italic">No transaction history found.</TableCell></TableRow>
                    ) : (
                      payments.map((payment: any) => (
                        <TableRow key={payment.id} className="group transition-all duration-300 hover:bg-card/60">
                          <TableCell className="px-6 py-4 text-xs font-bold text-slate-700">{format(new Date(payment.payment_date), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="px-6 py-4 font-black text-emerald-600 text-sm">{formatCurrency(Number(payment.amount))}</TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-3.5 w-3.5 text-primary" />
                              <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">{(payment.payment_method || 'cash').replace('_', ' ')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 font-mono text-[10px] font-bold text-slate-400">{payment.reference_number || 'INTERNAL_LEDGER'}</TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-1 text-emerald-600 font-black text-[10px] uppercase tracking-tighter">
                              <Check className="h-3 w-3" /> VERIFIED
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <DialogTitle className="text-2xl font-black tracking-tight text-foreground/90">Financial Document</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-primary">Official Institutional Record</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-8 pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Document #</p>
                  <p className="font-black text-slate-700">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Issued On</p>
                  <p className="font-bold text-slate-600">{format(new Date(selectedInvoice.invoice_date), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Due Date</p>
                  <p className="font-bold text-rose-600">{format(new Date(selectedInvoice.due_date), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Protocol</p>
                  <Badge className={cn("rounded-lg border-none text-[9px] font-black uppercase tracking-tighter px-2", getStatusStyles(selectedInvoice.status))}>
                    {selectedInvoice.status}
                  </Badge>
                </div>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Gross Liability</span>
                  <span className="text-xl font-black text-foreground/90">{formatCurrency(Number(selectedInvoice.total_amount))}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Total Liquidated</span>
                  <span className="text-xl font-black text-emerald-600">{formatCurrency(Number(selectedInvoice.paid_amount))}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-black uppercase tracking-widest text-primary">Net Outstanding</span>
                  <span className="text-3xl font-black text-foreground tracking-tighter">
                    {formatCurrency(Number(selectedInvoice.total_amount) - Number(selectedInvoice.paid_amount))}
                  </span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="p-4 rounded-2xl bg-primary/5/50 border border-primary/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/80 mb-1 flex items-center gap-2">
                    <Info className="h-3 w-3" /> Institutional Notes
                  </p>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed italic">"{selectedInvoice.notes}"</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-900/20" onClick={() => handleDownloadPdf(selectedInvoice.id)}>
                  <Download className="h-4 w-4 mr-2" /> Download Statement
                </Button>
                {selectedInvoice.status !== 'paid' && (
                  <Button className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-primary to-violet-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20" onClick={() => handleOnlinePayment(selectedInvoice.id, Number(selectedInvoice.total_amount) - Number(selectedInvoice.paid_amount))}>
                    <CreditCard className="h-4 w-4 mr-2" /> Liquidate Balance
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParentFinanceDashboard;
