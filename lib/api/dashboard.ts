import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, subMonths, format, addDays } from "date-fns";
import { 
  DashboardKPIs, 
  RevenueChartData, 
  ServiceBreakdownData, 
  UpcomingEventData, 
  PaymentReminderData 
} from "@/types/dashboard";

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const supabase = await createClient();
  const now = new Date();
  
  const thisMonthStart = startOfMonth(now).toISOString();
  const thisMonthEnd = endOfMonth(now).toISOString();
  
  const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
  const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();
  
  // 1. Revenue
  const [thisMonthPaymentsResp, lastMonthPaymentsResp] = await Promise.all([
    supabase.from('payments').select('amount').gte('payment_date', thisMonthStart).lte('payment_date', thisMonthEnd).is('deleted_at', null),
    supabase.from('payments').select('amount').gte('payment_date', lastMonthStart).lte('payment_date', lastMonthEnd).is('deleted_at', null)
  ]);
  const thisRevenue = (thisMonthPaymentsResp.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const lastRevenue = (lastMonthPaymentsResp.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const revenueChange = lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue) * 100 : (thisRevenue > 0 ? 100 : 0);

  // 2. New Contracts
  const [thisMonthContractsResp, lastMonthContractsResp] = await Promise.all([
    supabase.from('contracts').select('id', { count: 'exact', head: true }).gte('created_at', thisMonthStart).lte('created_at', thisMonthEnd).is('deleted_at', null),
    supabase.from('contracts').select('id', { count: 'exact', head: true }).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd).is('deleted_at', null)
  ]);
  const newContracts = thisMonthContractsResp.count || 0;
  const lastContracts = lastMonthContractsResp.count || 0;
  const contractsChange = lastContracts > 0 ? ((newContracts - lastContracts) / lastContracts) * 100 : (newContracts > 0 ? 100 : 0);

  // 3. Debt
  const { data: debtContracts } = await supabase.from('contracts').select('remaining_amount').gt('remaining_amount', 0).is('deleted_at', null);
  const totalDebt = (debtContracts || []).reduce((sum, c) => sum + Number(c.remaining_amount || 0), 0);

  // 4. Completed
  const [thisMonthCompletedResp, lastMonthCompletedResp] = await Promise.all([
    supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'hoan_thanh').gte('updated_at', thisMonthStart).lte('updated_at', thisMonthEnd).is('deleted_at', null),
    supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'hoan_thanh').gte('updated_at', lastMonthStart).lte('updated_at', lastMonthEnd).is('deleted_at', null)
  ]);
  const completed = thisMonthCompletedResp.count || 0;
  const lastCompleted = lastMonthCompletedResp.count || 0;
  const completedChange = lastCompleted > 0 ? ((completed - lastCompleted) / lastCompleted) * 100 : (completed > 0 ? 100 : 0);

  return {
    totalRevenue: thisRevenue,
    revenueChange: Math.round(revenueChange),
    newContracts,
    contractsChange: Math.round(contractsChange),
    totalDebt,
    debtChange: 0, 
    completedContracts: completed,
    completedChange: Math.round(completedChange)
  };
}

export async function getRevenueChart(months: number = 6): Promise<RevenueChartData[]> {
  const supabase = await createClient();
  const now = new Date();
  
  const startDate = startOfMonth(subMonths(now, months - 1)).toISOString();
  
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, payment_date')
    .gte('payment_date', startDate)
    .is('deleted_at', null);

  const monthMap: Record<string, number> = {};
  
  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(now, i);
    monthMap[format(d, 'MM/yyyy')] = 0;
  }

  (payments || []).forEach(p => {
    const key = format(new Date(p.payment_date), 'MM/yyyy');
    if (monthMap[key] !== undefined) {
      monthMap[key] += Number(p.amount || 0);
    }
  });

  return Object.keys(monthMap).map(key => ({
    month: key,
    revenue: monthMap[key]
  }));
}

export async function getServiceBreakdown(): Promise<ServiceBreakdownData[]> {
  const supabase = await createClient();
  
  const { data: contracts } = await supabase
    .from('contracts')
    .select('service_type, total_amount')
    .is('deleted_at', null);

  const breakdown: Record<string, number> = {};
  
  (contracts || []).forEach(c => {
    const type = c.service_type || 'Khác';
    breakdown[type] = (breakdown[type] || 0) + Number(c.total_amount || 0);
  });

  const colors = ['#8B5E3C', '#C9A96E', '#3D2B1F', '#B8A898', '#F5EFE6', '#E5D5C5'];
  let colorIndex = 0;
  return Object.keys(breakdown).map((key) => ({
    name: key,
    value: breakdown[key],
    fill: colors[colorIndex++ % colors.length]
  }));
}

export async function getUpcomingEvents(days: number = 7): Promise<UpcomingEventData[]> {
  const supabase = await createClient();
  const now = new Date();
  const endDate = addDays(now, days).toISOString();
  
  const { data } = await supabase
    .from('contract_events')
    .select(`
      id,
      event_date,
      contracts!inner (
        id,
        contract_code,
        service_type,
        customers (
          full_name
        )
      )
    `)
    .gte('event_date', now.toISOString())
    .lte('event_date', endDate)
    .order('event_date', { ascending: true })
    .limit(10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((e: any) => ({
    id: e.id,
    contract_id: e.contracts?.id,
    event_date: e.event_date,
    contract_code: e.contracts?.contract_code,
    customer_name: e.contracts?.customers?.full_name || 'Khách hàng',
    service_type: e.contracts?.service_type
  }));
}

export async function getPaymentReminders(): Promise<PaymentReminderData[]> {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_code,
      remaining_amount,
      customers (
        full_name
      )
    `)
    .gt('remaining_amount', 0)
    .is('deleted_at', null)
    .order('created_at', { ascending: true }) 
    .limit(10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((c: any) => ({
    id: c.id,
    contract_code: c.contract_code,
    customer_name: c.customers?.full_name || 'Khách hàng',
    remaining_amount: c.remaining_amount,
    due_date: null
  }));
}
