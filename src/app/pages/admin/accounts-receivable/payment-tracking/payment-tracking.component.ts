import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountsReceivableService } from '../../../../core/services/accounts-receivable.service';
import { Invoice, Payment } from '../../../../core/models';

@Component({
  selector: 'app-payment-tracking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-tracking.component.html',
  styleUrl: './payment-tracking.component.scss'
})
export class PaymentTrackingComponent implements OnInit {
  private arService = inject(AccountsReceivableService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  invoice = signal<Invoice | null>(null);
  loading = signal(true);
  saving = false;

  form = this.fb.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentDate: [new Date().toISOString().split('T')[0], Validators.required],
    paymentMethod: ['transfer', Validators.required],
    reference: ['']
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInvoice(parseInt(id));
    }
  }

  loadInvoice(invoiceId: number) {
    this.arService.getInvoice(invoiceId).subscribe({
      next: (invoice) => {
        this.invoice.set(invoice);
        this.form.patchValue({
          amount: invoice.amountPending
        });
        this.loading.set(false);
      },
      error: () => {
        console.error('Error loading invoice');
        this.loading.set(false);
      }
    });
  }

  validateAmount() {
    const amount = this.form.get('amount')?.value || 0;
    const pending = this.invoice()?.amountPending || 0;

    if (amount > pending) {
      this.form.get('amount')?.setErrors({ exceeds: true });
      return false;
    }
    return true;
  }

  save() {
    if (this.form.invalid || this.saving || !this.validateAmount()) {
      return;
    }

    this.saving = true;
    const invoice = this.invoice();
    if (!invoice) {
      this.saving = false;
      return;
    }

    const payment: Omit<Payment, 'id' | 'createdAt'> = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.documentNumber,
      customerId: invoice.customerId || 0,
      customerName: invoice.customerName,
      paymentDate: this.form.get('paymentDate')?.value || '',
      amount: this.form.get('amount')?.value || 0,
      paymentMethod: this.form.get('paymentMethod')?.value as any,
      reference: this.form.get('reference')?.value || '',
      status: 'recorded'
    };

    this.arService.createPayment(payment).subscribe({
      next: () => {
        alert('Pago registrado correctamente');
        this.saving = false;
        this.router.navigate(['/admin/cuentas-por-cobrar', invoice.id]);
      },
      error: () => {
        alert('Error al registrar el pago');
        this.saving = false;
      }
    });
  }

  cancel() {
    const invoiceId = this.invoice()?.id;
    if (invoiceId) {
      this.router.navigate(['/admin/cuentas-por-cobrar', invoiceId]);
    }
  }

  getMaxAmount(): number {
    return this.invoice()?.amountPending || 0;
  }
}
