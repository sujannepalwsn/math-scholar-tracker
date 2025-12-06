import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';
import { format, addDays } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { centerId, month, year, academicYear, dueInDays = 30, gradeFilter = 'all' } = await req.json();

    if (!centerId || !month || !year || !academicYear) {
      return new Response(
        JSON.stringify({ success: false, error: 'Center ID, month, year, and academic year are required.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch students based on centerId and optional gradeFilter
    let studentsQuery = supabase
      .from('students')
      .select('id, name, grade')
      .eq('center_id', centerId)
      .eq('is_active', true);

    if (gradeFilter !== 'all') {
      studentsQuery = studentsQuery.eq('grade', gradeFilter);
    }

    const { data: students, error: studentsError } = await studentsQuery;
    if (studentsError) throw studentsError;

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ success: true, invoicesGenerated: 0, message: 'No active students found for the selected criteria.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const generatedInvoices: Array<{
      invoiceId: string;
      invoiceNumber: string;
      studentId: string;
      studentName: string;
      totalAmount: number;
    }> = [];
    const invoiceDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
    const dueDate = format(addDays(new Date(invoiceDate), dueInDays), 'yyyy-MM-dd');

    for (const student of students) {
      // Check if an invoice already exists for this student for the given month/year
      const { data: existingInvoice, error: existingInvoiceError } = await supabase
        .from('invoices')
        .select('id')
        .eq('student_id', student.id)
        .eq('invoice_month', month)
        .eq('invoice_year', year)
        .maybeSingle();

      if (existingInvoiceError) console.error(`Error checking existing invoice for student ${student.id}:`, existingInvoiceError);
      if (existingInvoice) {
        console.log(`Invoice already exists for student ${student.name} for ${month}/${year}. Skipping.`);
        continue;
      }

      // Fetch fee assignments for the student's grade
      const { data: feeAssignments, error: feeAssignmentsError } = await supabase
        .from('fee_structures')
        .select(`
          id,
          amount,
          frequency,
          fee_headings(id, name)
        `)
        .eq('center_id', centerId)
        .eq('class', student.grade);

      if (feeAssignmentsError) {
        console.error(`Error fetching fee assignments for student ${student.name}:`, feeAssignmentsError);
        continue;
      }

      if (!feeAssignments || feeAssignments.length === 0) {
        console.log(`No fee assignments found for student ${student.name} (Grade ${student.grade}). Skipping.`);
        continue;
      }

      let totalAmount = 0;
      const invoiceItems: Array<{
        fee_heading_id: string | null;
        description: string;
        unit_amount: number;
        quantity: number;
        total_amount: number;
      }> = [];

      for (const assignment of feeAssignments) {
        totalAmount += assignment.amount;
        // Handle fee_headings which could be an object or array
        const feeHeading = Array.isArray(assignment.fee_headings) 
          ? assignment.fee_headings[0] 
          : assignment.fee_headings;
        
        invoiceItems.push({
          fee_heading_id: feeHeading?.id || null,
          description: feeHeading?.name || 'Fee',
          unit_amount: assignment.amount,
          quantity: 1,
          total_amount: assignment.amount,
        });
      }

      if (totalAmount === 0) {
        console.log(`Total amount is 0 for student ${student.name}. Skipping invoice generation.`);
        continue;
      }

      // Create the invoice record
      const invoiceNumber = `INV-${format(new Date(), 'yyyyMMddHHmmss')}-${student.name.substring(0, 3).toUpperCase()}`;
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          center_id: centerId,
          student_id: student.id,
          invoice_number: invoiceNumber,
          total_amount: totalAmount,
          paid_amount: 0,
          due_date: dueDate,
          invoice_date: invoiceDate,
          invoice_month: month,
          invoice_year: year,
          status: 'issued',
          notes: `Monthly fees for ${format(new Date(year, month - 1), 'MMMM yyyy')}`,
        })
        .select()
        .single();

      if (invoiceError) {
        console.error(`Error creating invoice for student ${student.name}:`, invoiceError);
        continue;
      }

      // Create invoice items
      if (invoiceItems.length > 0) {
        const itemsWithInvoiceId = invoiceItems.map(item => ({
          ...item,
          invoice_id: newInvoice.id,
        }));
        const { error: itemsError } = await supabase.from('invoice_items').insert(itemsWithInvoiceId);
        if (itemsError) {
          console.error(`Error creating invoice items for invoice ${newInvoice.id}:`, itemsError);
        }
      }

      generatedInvoices.push({
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoice_number,
        studentId: student.id,
        studentName: student.name,
        totalAmount: newInvoice.total_amount,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoicesGenerated: generatedInvoices.length,
        invoices: generatedInvoices,
        message: `${generatedInvoices.length} invoices generated successfully.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Generate monthly invoices error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate invoices';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
