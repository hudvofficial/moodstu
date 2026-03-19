import { Database } from "./database.types";

export type ServiceTypeEnum = Database["public"]["Enums"]["service_type_enum"];

export interface DashboardKPIs {
  totalRevenue: number;
  revenueChange: number; // percentage (-100 to 100)
  
  newContracts: number;
  contractsChange: number; 
  
  totalDebt: number;
  debtChange: number; 
  
  completedContracts: number;
  completedChange: number; 
}

export interface RevenueChartData {
  month: string; // e.g., 'T1', 'T2'
  revenue: number;
}

export interface ServiceBreakdownData {
  name: string;
  value: number;
  fill: string; // Hex color generated mapped to service type
}

export interface UpcomingEventData {
  id: string;
  contract_id: string;
  event_date: string;
  contract_code: string;
  customer_name: string;
  service_type: ServiceTypeEnum;
}

export interface PaymentReminderData {
  id: string;
  contract_code: string;
  customer_name: string;
  remaining_amount: number;
  due_date: string | null; // e.g., next payment stage limit
}
