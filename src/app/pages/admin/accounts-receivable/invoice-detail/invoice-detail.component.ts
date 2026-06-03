import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountsReceivableService } from '../../../../core/services/accounts-receivable.service';
import { Invoice, Payment, PaymentPlan } from '../../../../core/models';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-detail.component.html',
  styleUrl: './invoice-detail.component.scss'
})
export class InvoiceDetailComponent implements OnInit {
  private arService = inject(AccountsReceivableService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  invoice = signal<Invoice | null>(null);
  payments = signal<Payment[]>([]);
  paymentPlans = signal<PaymentPlan[]>([]);
  loading = signal(true);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadData(parseInt(id));
    }
  }

  loadData(invoiceId: number) {
    this.arService.getInvoice(invoiceId).subscribe({
      next: (invoice) => {
        this.invoice.set(invoice);
        this.loading.set(false);
      },
      error: () => {
        console.error('Error loading invoice');
        this.loading.set(false);
      }
    });

    this.arService.getPaymentsByInvoice(invoiceId).subscribe({
      next: (payments) => this.payments.set(payments)
    });

    this.arService.getPaymentPlansByInvoice(invoiceId).subscribe({
      next: (plans) => this.paymentPlans.set(plans)
    });
  }

  recordPayment() {
    const invoiceId = this.invoice()?.id;
    if (invoiceId) {
      this.router.navigate(['/admin/cuentas-por-cobrar/pago', invoiceId]);
    }
  }

  createPaymentPlan() {
    const invoiceId = this.invoice()?.id;
    if (invoiceId) {
      this.router.navigate(['/admin/cuentas-por-cobrar/plan-pago', invoiceId]);
    }
  }

  goBack() {
    this.router.navigate(['/admin/cuentas-por-cobrar']);
  }

  getPaymentPercentage(): number {
    const invoice = this.invoice();
    if (!invoice) return 0;
    return (invoice.amountPaid / invoice.total) * 100;
  }
}
