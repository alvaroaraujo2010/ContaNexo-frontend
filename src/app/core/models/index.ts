export interface LoginResponse {
  token: string;
  fullName: string;
  email: string;
  role: string;
  expiresAt: string;
}

export interface Company {
  id: number;
  businessName: string;
  tagline: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  taxId?: string;
  currency: string;
}

export interface Dashboard {
  totalSalesMonth: number;
  totalPurchasesMonth: number;
  productsCount: number;
  lowStockCount: number;
  customersCount: number;
  suppliersCount: number;
  recentSales: { id: number; documentNumber: string; customerName?: string; total: number; saleDate: string }[];
  lowStockProducts: { id: number; sku: string; name: string; stock: number; minStock: number }[];
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  productCount: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  categoryId: number;
  categoryName: string;
  unitCost: number;
  unitPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  isActive: boolean;
  lowStock: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  taxId?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

export interface Customer {
  id: number;
  name: string;
  taxId?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

export interface Purchase {
  id: number;
  documentNumber: string;
  supplierId: number;
  supplierName: string;
  purchaseDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  notes?: string;
  details: { productId: number; productName: string; quantity: number; unitCost: number; lineTotal: number }[];
}

export interface Sale {
  id: number;
  documentNumber: string;
  customerId?: number;
  customerName?: string;
  saleDate: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  status: string;
  notes?: string;
  electronicInvoiceStatus: string;
  electronicInvoiceNumber?: string;
  cufe?: string;
  electronicInvoiceIssuedAt?: string;
  details: { productId: number; productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
}

export interface ElectronicInvoice {
  saleId: number;
  documentNumber: string;
  electronicInvoiceNumber?: string;
  electronicInvoiceStatus: string;
  cufe?: string;
  issuedAt?: string;
  issuerName: string;
  issuerTaxId?: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issuerEmail?: string;
  customerName: string;
  customerTaxId?: string;
  saleDate: string;
  paymentMethod: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  lines: { description: string; quantity: number; unitPrice: number; lineTotal: number }[];
}

export interface InventoryMovement {
  id: number;
  productId: number;
  productName: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface Account {
  id: number;
  code: string;
  name: string;
  type: string;
  parentId?: number;
  isActive: boolean;
}

export interface JournalEntry {
  id: number;
  entryNumber: string;
  entryDate: string;
  description: string;
  reference?: string;
  status: string;
  lines: { accountId: number; accountCode: string; accountName: string; debit: number; credit: number; description?: string }[];
  totalDebit: number;
  totalCredit: number;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface TrialBalance {
  lines: { code: string; name: string; type: string; debit: number; credit: number; balance: number }[];
  totalDebit: number;
  totalCredit: number;
}

// ============ MÓDULO DE NÓMINA ============

export interface Employee {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  hireDate: string;
  taxId?: string;
  bankAccount?: string;
  bankName?: string;
  bankAccountType?: string;
  baseSalary: number;
  isActive: boolean;
  // Ley colombiana
  contractType?: 'indefinido' | 'fijo' | 'obra_labor' | 'prestacion';
  integralSalary?: boolean;
  terminationReason?: string;
  terminationDate?: string;
  withholdingProcedure2?: boolean;
  transportAllowanceOverride?: boolean | null;
  solidarityFundOverride?: number | null;
}

export interface Deduction {
  id: number;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  description?: string;
  isActive: boolean;
}

export interface PayrollDeductionLineDto {
  deductionId: number;
  deductionName: string;
  category?: 'social_security' | 'tax' | 'loan' | 'other';
  amount: number;
}

export interface PayrollDetail {
  id?: number;
  employeeId: number;
  employeeName: string;
  baseSalary: number;
  variableIncome: number;
  transportAllowance: number;
  totalGross: number;
  ibc: number;
  // Deducciones
  employeeHealthDeduction: number;
  employeePensionDeduction: number;
  solidarityFundDeduction: number;
  withholdingTax: number;
  totalDeductions: number;
  netSalary: number;
  // Aportes empleador
  employerHealthContribution: number;
  employerPensionContribution: number;
  arlContribution: number;
  compensationFundContribution: number;
  senaContribution: number;
  icbfContribution: number;
  totalEmployerContributions: number;
  // Provisiones
  primaProvision: number;
  cesantiasProvision: number;
  cesantiasInterestProvision: number;
  vacationProvision: number;
  totalProvisions: number;
  // Deducciones personalizadas
  deductions: PayrollDeductionLineDto[];
}

export interface Payroll {
  id: number;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'processed' | 'paid' | 'cancelled';
  paymentDate?: string;
  totalGross: number;
  totalTransportAllowance: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployerCost?: number;
  totalEmployerContributions?: number;
  totalPrimaProvision?: number;
  totalCesantiasProvision?: number;
  totalCesantiasInterestProvision?: number;
  totalVacationProvision?: number;
  totalEmployerHealth?: number;
  totalEmployerPension?: number;
  totalArl?: number;
  totalCompensationFund?: number;
  totalSena?: number;
  totalIcbf?: number;
  details: PayrollDetail[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SocialSecurityPayment {
  id: number;
  period: string;
  employeeId: number;
  employeeName: string;
  taxId?: string;
  baseSalary: number;
  transportAllowance?: number;
  ibc?: number;
  capIbc?: number;
  contributionRate: number;
  contributionAmount: number;
  employeeHealthContribution: number;
  employeePensionContribution: number;
  solidarityFundContribution?: number;
  employerHealthContribution: number;
  employerPensionContribution: number;
  arlContribution: number;
  compensationFundContribution: number;
  senaContribution: number;
  icbfContribution: number;
  employeeContributionTotal: number;
  employerContributionTotal: number;
  paymentDate?: string;
  status: 'pending' | 'paid';
  reference?: string;
  operator?: string;
}

// ============ NÓMINA — CUMPLIMIENTO LEGAL COLOMBIA ============

export interface LegalParameter {
  id?: number;
  year: number;
  smlmv: number;
  uvt: number;
  transportAllowance: number;
  transportAllowanceTop: number;
  minimumWithholdingUvt: number;
  exemptIncomeUvt: number;
  maxHealthIbcSmlmv: number;
  arlRiskOneRate: number;
  employerHealthRate: number;
  employerPensionRate: number;
  compensationFundRate: number;
  senaRate: number;
  icbfRate: number;
  employeeHealthRate: number;
  employeePensionRate: number;
  solidarityFundLowRate: number;
  solidarityFundHighRate: number;
  primaYearFraction: number;
  cesantiasYearFraction: number;
  cesantiasInterestRate: number;
  vacationDaysPerYear: number;
  effectiveFrom: string;
  notes?: string;
}

export interface WithholdingTaxBracket {
  id?: number;
  year: number;
  fromUvt: number;
  toUvt: number | null;
  marginalRate: number;
  baseTaxUvt: number;
  procedure: '1' | '2';
}

export interface PayrollProvision {
  id: number;
  employeeId: number;
  employeeName: string;
  year: number;
  month: number;
  periodLabel: string;
  baseSalary: number;
  transportAllowance: number;
  primaProvision: number;
  cesantiasProvision: number;
  cesantiasInterestProvision: number;
  vacationProvision: number;
  totalProvision: number;
  accumulatedPrima: number;
  accumulatedCesantias: number;
  accumulatedCesantiasInterest: number;
  accumulatedVacations: number;
  accumulatedTotal: number;
  payrollId?: number;
  createdAt?: string;
}

export interface ProvisionSummary {
  employeeId: number;
  employeeName: string;
  year: number;
  prima: number;
  cesantias: number;
  cesantiasInterest: number;
  vacaciones: number;
  total: number;
}

export interface PayrollSettlement {
  id: number;
  employeeId: number;
  employeeName: string;
  taxId: string;
  settlementDate: string;
  hireDate: string;
  lastContractDate?: string;
  terminationReason: string;
  baseSalary: number;
  transportAllowance?: number;
  averageVariableIncome?: number;
  workedDays: number;
  workedDaysCurrentSemester: number;
  cesantiasAmount: number;
  cesantiasInterestAmount: number;
  primaAmount: number;
  vacationAmount: number;
  severanceAmount: number;
  otherAmounts: number;
  totalGross: number;
  retencionFuente: number;
  totalDeductions: number;
  netToPay: number;
  status: 'draft' | 'paid' | 'cancelled';
  paymentDate?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayrollSimulation {
  year: number;
  smlmv: number;
  uvt: number;
  transportAllowance: number;
  baseSalary: number;
  transportAllowanceApplied: number;
  grossIncome: number;
  ibc: number;
  cappedIbc: number;
  deductions: {
    employeeHealth: number;
    employeePension: number;
    solidarityFund: number;
    withholdingTax: number;
    customDeductions: number;
    total: number;
  };
  employerContributions: {
    health: number;
    pension: number;
    arl: number;
    compensationFund: number;
    sena: number;
    icbf: number;
    total: number;
  };
  provisions: {
    prima: number;
    cesantias: number;
    cesantiasInterest: number;
    vacations: number;
    total: number;
  };
  netPay: number;
}

export interface PaymentRecord {
  id: number;
  payrollId: number;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  totalAmount: number;
  paymentMethod: 'transfer' | 'cash' | 'check';
  reference?: string;
  status: 'completed' | 'pending';
  notes?: string;
  createdAt?: string;
}

// ============ MÓDULO DE CUENTAS POR COBRAR ============

export interface Invoice {
  id: number;
  documentNumber: string;
  customerId: number;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountPending: number;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'complete';
  notes?: string;
  details: { productId: number; productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
}

export interface Payment {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'transfer' | 'cash' | 'check' | 'credit_card';
  reference?: string;
  notes?: string;
  status: 'recorded' | 'verified';
  createdAt?: string;
}

export interface PaymentPlan {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  totalAmount: number;
  numberOfInstallments: number;
  installmentAmount: number;
  startDate: string;
  installments: { number: number; dueDate: string; amount: number; status: 'pending' | 'paid' }[];
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: string;
}

export interface Reminder {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  daysOverdue: number;
  amountPending: number;
  reminderType: 'first' | 'second' | 'third' | 'final';
  sentDate?: string;
  status: 'pending' | 'sent' | 'acknowledged';
  notes?: string;
}

export interface AccountReceivableSummary {
  totalInvoices: number;
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  overdueDays: number;
  overduAmount: number;
  byCustomer: {
    customerId: number;
    customerName: string;
    totalAmount: number;
    amountPaid: number;
    amountPending: number;
    status: string;
    daysOverdue: number;
  }[];
}

export interface AgingReport {
  lines: {
    customerId: number;
    customerName: string;
    current: number;
    days30: number;
    days60: number;
    days90: number;
    daysOver90: number;
    total: number;
  }[];
  totalCurrent: number;
  totalDays30: number;
  totalDays60: number;
  totalDays90: number;
  totalOver90: number;
  totalOverdue: number;
}
