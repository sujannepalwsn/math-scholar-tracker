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
import { cn, formatCurrency } from "@/lib/utils"
import { usePagination } from "@/hooks/use-pagination";
import { ServerPagination } from "@/components/ui/server-pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";


const ParentFinanceDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  const { page: invPage, pageSize: invPageSize, setPage: setInvPage, setPageSize: setInvPageSize } = usePagination(10);
  const { page: payPage, pageSize: payPageSize, setPage: setPayPage, setPageSize: setPayPageSize } = usePagination(10);

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
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['student-invoices', user.student_id, invPage, invPageSize],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .eq('student_id', user.student_id!)
        .order('invoice_date', { ascending: false })
        .range((invPage - 1) * invPageSize, invPage * invPageSize - 1);

      if (error) throw error;
      return { data: data as Invoice[], count: count || 0 };
    }
  });

  const invoices = invoicesData?.data || [];
  const totalInvRows = invoicesData?.count || 0;
  const totalInvPages = Math.ceil(totalInvRows / invPageSize);

  // Fetch student's payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['student-payments', user.student_id, payPage, payPageSize],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('payments')
        .select('*', { count: 'exact' })
        .eq('student_id', user.student_id!)
        .order('payment_date', { ascending: false })
        .range((payPage - 1) * payPageSize, payPage * payPageSize - 1);

      if (error) throw error;
      return { data: data as Payment[], count: count || 0 };
    }
  });

  const payments = paymentsData?.data || [];
  const totalPayRows = paymentsData?.count || 0;
  const totalPayPages = Math.ceil(totalPayRows / payPageSize);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'partial': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'unpaid': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDialog(true);
  };

  const handleDownloadPdf = (invoiceId: string) => {
    window.open(`${supabase.functions.getURL('generate-invoice-pdf')}?id=${invoiceId}`, '_blank');
  };

  const handleOnlinePayment = (invoiceId: string, amount: number) => {
    // Logic for online payment integration
    alert(`Initiating payment of ${formatCurrency(amount)} for invoice ${invoiceId}`);
  };

  const totalOutstanding = invoices.reduce((acc, inv) => {
    if (inv.status !== 'paid') {
      return acc + (Number(inv.total_amount) - Number(inv.paid_amount));
    }
    return acc;
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Financial Portfolio
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Monitoring tuition liquidity and institutional settlements.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 shadow-soft flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-none">Outstanding</span>
              <span className="font-black text-rose-600 text-sm">{formatCurrency(totalOutstanding)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-strong rounded-3xl bg-white overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <FileText className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="border-primary/20 text-primary font-bold">TOTAL BILLED</Badge>
            </div>
            <p className="text-2xl font-black text-slate-700">{formatCurrency(invoices.reduce((acc, inv) => acc + Number(inv.total_amount), 0))}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Gross Liability</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-strong rounded-3xl bg-white overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Check className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="border-emerald-200 text-emerald-600 font-bold">SETTLED</Badge>
            </div>
            <p className="text-2xl font-black text-slate-700">{formatCurrency(invoices.reduce((acc, inv) => acc + Number(inv.paid_amount), 0))}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Total Liquidated</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-strong rounded-3xl bg-white overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <TrendingUp className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="border-amber-200 text-amber-600 font-bold">EFFICIENCY</Badge>
            </div>
            <p className="text-2xl font-black text-slate-700">
              {invoices.length > 0 ? Math.round((invoices.reduce((acc, inv) => acc + Number(inv.paid_amount), 0) / invoices.reduce((acc, inv) => acc + Number(inv.total_amount), 0)) * 100) : 100}%
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Payment Ratio</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-strong rounded-3xl bg-white overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <Receipt className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="border-violet-200 text-violet-600 font-bold">DOCUMENTS</Badge>
            </div>
            <p className="text-2xl font-black text-slate-700">{totalInvRows}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Invoices Issued</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20">
        <Tabs defaultValue="invoices" className="w-full">
          <CardHeader className="border-b border-muted/20 bg-white/40 p-0">
            <TabsList className="w-full h-16 bg-transparent rounded-none p-0 flex">
              <TabsTrigger value="invoices" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 font-black uppercase text-[10px] tracking-widest transition-all">
                <FileText className="h-4 w-4 mr-2" /> Billing History
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 font-black uppercase text-[10px] tracking-widest transition-all">
                <CreditCard className="h-4 w-4 mr-2" /> Transaction Log
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="p-0">
            <TabsContent value="invoices" className="m-0">
              {invoicesLoading && !invoices.length ? (
                <TableSkeleton columns={7} rows={invPageSize} />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/5">
                          <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Invoice #</TableHead>
                          <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Billing Period</TableHead>
                          <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Liability</TableHead>
                          <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Outstanding</TableHead>
                          <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Deadline</TableHead>
                          <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Protocol</TableHead>
                          <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-medium italic">No billing records identified.</TableCell></TableRow>
                        ) : (
                          invoices.map((invoice: any) => (
                            <TableRow key={invoice.id} className="group transition-all duration-300 hover:bg-card/60">
                              <TableCell className="px-6 py-4 font-black text-primary text-xs">#{invoice.invoice_number}</TableCell>
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
                  <ServerPagination
                    currentPage={invPage}
                    totalPages={totalInvPages}
                    totalRows={totalInvRows}
                    pageSize={invPageSize}
                    onPageChange={setInvPage}
                    onPageSizeChange={setInvPageSize}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="payments" className="m-0">
              {paymentsLoading && !payments.length ? (
                <TableSkeleton columns={5} rows={payPageSize} />
              ) : (
                <>
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
                        {payments.length === 0 ? (
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
                  <ServerPagination
                    currentPage={payPage}
                    totalPages={totalPayPages}
                    totalRows={totalPayRows}
                    pageSize={payPageSize}
                    onPageChange={setPayPage}
                    onPageSizeChange={setPayPageSize}
                  />
                </>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="w-[95vw] sm:max-w-2xl rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl">
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
