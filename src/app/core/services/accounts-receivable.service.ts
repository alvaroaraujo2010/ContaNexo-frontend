import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Invoice,
  Payment,
  PaymentPlan,
  Reminder,
  AccountReceivableSummary,
  AgingReport
} from '../models';

@Injectable({ providedIn: 'root' })
export class AccountsReceivableService {
  private api = inject(ApiService);

  // Facturas
  getInvoices(): Observable<Invoice[]> {
    return this.api.get<Invoice[]>('invoices');
  }

  getInvoice(id: number): Observable<Invoice> {
    return this.api.get<Invoice>(`invoices/${id}`);
  }

  getInvoicesByCustomer(customerId: number): Observable<Invoice[]> {
    return this.api.get<Invoice[]>(`invoices?customerId=${customerId}`);
  }

  getInvoicesByStatus(status: string): Observable<Invoice[]> {
    return this.api.get<Invoice[]>(`invoices?status=${status}`);
  }

  updateInvoicePaymentStatus(invoiceId: number, amountPaid: number): Observable<Invoice> {
    return this.api.put<Invoice>(`invoices/${invoiceId}`, { amountPaid });
  }

  // Pagos
  getPayments(): Observable<Payment[]> {
    return this.api.get<Payment[]>('payments');
  }

  getPayment(id: number): Observable<Payment> {
    return this.api.get<Payment>(`payments/${id}`);
  }

  getPaymentsByInvoice(invoiceId: number): Observable<Payment[]> {
    return this.api.get<Payment[]>(`payments?invoiceId=${invoiceId}`);
  }

  getPaymentsByCustomer(customerId: number): Observable<Payment[]> {
    return this.api.get<Payment[]>(`payments?customerId=${customerId}`);
  }

  createPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Observable<Payment> {
    return this.api.post<Payment>('payments', payment);
  }

  updatePayment(id: number, payment: Partial<Payment>): Observable<Payment> {
    return this.api.put<Payment>(`payments/${id}`, payment);
  }

  deletePayment(id: number): Observable<void> {
    return this.api.delete(`payments/${id}`);
  }

  // Planes de Pago
  getPaymentPlans(): Observable<PaymentPlan[]> {
    return this.api.get<PaymentPlan[]>('payment-plans');
  }

  getPaymentPlan(id: number): Observable<PaymentPlan> {
    return this.api.get<PaymentPlan>(`payment-plans/${id}`);
  }

  getPaymentPlansByInvoice(invoiceId: number): Observable<PaymentPlan[]> {
    return this.api.get<PaymentPlan[]>(`payment-plans?invoiceId=${invoiceId}`);
  }

  createPaymentPlan(plan: Omit<PaymentPlan, 'id' | 'createdAt'>): Observable<PaymentPlan> {
    return this.api.post<PaymentPlan>('payment-plans', plan);
  }

  updatePaymentPlan(id: number, plan: Partial<PaymentPlan>): Observable<PaymentPlan> {
    return this.api.put<PaymentPlan>(`payment-plans/${id}`, plan);
  }

  cancelPaymentPlan(id: number): Observable<PaymentPlan> {
    return this.api.put<PaymentPlan>(`payment-plans/${id}`, { status: 'cancelled' });
  }

  // Recordatorios
  getReminders(): Observable<Reminder[]> {
    return this.api.get<Reminder[]>('reminders');
  }

  getRemindersByInvoice(invoiceId: number): Observable<Reminder[]> {
    return this.api.get<Reminder[]>(`reminders?invoiceId=${invoiceId}`);
  }

  getRemindersByStatus(status: string): Observable<Reminder[]> {
    return this.api.get<Reminder[]>(`reminders?status=${status}`);
  }

  createReminder(reminder: Omit<Reminder, 'id'>): Observable<Reminder> {
    return this.api.post<Reminder>('reminders', reminder);
  }

  updateReminderStatus(id: number, status: string): Observable<Reminder> {
    return this.api.put<Reminder>(`reminders/${id}`, { status });
  }

  sendReminder(id: number): Observable<{ success: boolean; message: string }> {
    return this.api.post<{ success: boolean; message: string }>(`reminders/${id}/send`, {});
  }

  // Resúmenes y Reportes
  getAccountReceivableSummary(): Observable<AccountReceivableSummary> {
    return this.api.get<AccountReceivableSummary>('accounts-receivable/summary');
  }

  getAgingReport(): Observable<AgingReport> {
    return this.api.get<AgingReport>('reports/aging');
  }

  getOverdueReport(): Observable<{ overdue: Invoice[] }> {
    return this.api.get<{ overdue: Invoice[] }>('reports/overdue');
  }

  getCustomerStatement(customerId: number): Observable<{ invoices: Invoice[]; payments: Payment[] }> {
    return this.api.get<{ invoices: Invoice[]; payments: Payment[] }>(`customer-statement/${customerId}`);
  }

  // Validaciones
  validatePaymentAmount(invoiceId: number, amount: number): Observable<{ valid: boolean; message?: string }> {
    return this.api.post<{ valid: boolean; message?: string }>('payments/validate', {
      invoiceId,
      amount
    });
  }

  validatePaymentDate(invoiceDate: string, paymentDate: string): boolean {
    return new Date(paymentDate) >= new Date(invoiceDate);
  }

  validatePaymentPlan(totalAmount: number, installments: { amount: number }[]): boolean {
    const sum = installments.reduce((acc, inst) => acc + inst.amount, 0);
    return Math.abs(sum - totalAmount) < 0.01; // tolerancia de 0.01
  }

  calculateDaysOverdue(dueDate: string): number {
    const due = new Date(dueDate).getTime();
    const today = new Date().getTime();
    const diffMs = today - due;
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  calculateAmountPending(total: number, amountPaid: number): number {
    return Math.max(0, total - amountPaid);
  }

  getInvoiceStatus(total: number, amountPaid: number, dueDate: string): 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' {
    if (amountPaid >= total) return 'paid';
    if (amountPaid > 0) return 'partially_paid';
    if (new Date() > new Date(dueDate)) return 'overdue';
    return 'unpaid';
  }

  generateInstallments(
    totalAmount: number,
    numberOfInstallments: number,
    startDate: string
  ): { number: number; dueDate: string; amount: number; status: 'pending' | 'paid' }[] {
    const installments = [];
    const installmentAmount = totalAmount / numberOfInstallments;
    let currentDate = new Date(startDate);

    for (let i = 1; i <= numberOfInstallments; i++) {
      currentDate.setMonth(currentDate.getMonth() + 1);
      const remainder = i === numberOfInstallments ? totalAmount - installmentAmount * (numberOfInstallments - 1) : installmentAmount;

      installments.push({
        number: i,
        dueDate: currentDate.toISOString().split('T')[0],
        amount: Math.round(remainder * 100) / 100,
        status: 'pending' as const
      });
    }

    return installments;
  }
}
