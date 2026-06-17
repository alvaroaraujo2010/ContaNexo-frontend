import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountsReceivableService } from '../../../../core/services/accounts-receivable.service';
import { Invoice, Payment } from '../../../../core/models';
import Swal from 'sweetalert2';

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
      next: async created => {
        await this.downloadPaymentReceipt(created, invoice);
        Swal.fire({ icon: 'success', title: 'Pago registrado', text: 'El pago fue registrado correctamente.', timer: 1800, showConfirmButton: false });
        this.saving = false;
        this.router.navigate(['/admin/cuentas-por-cobrar', invoice.id]);
      },
      error: () => {
        Swal.fire('Error', 'No se pudo registrar el pago.', 'error');
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

  private async downloadPaymentReceipt(payment: Payment, invoice: Invoice) {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('ContaNexo', 16, 15);
    doc.setFontSize(12);
    doc.text('Comprobante de pago de cartera', 16, 24);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(`Comprobante No. ${payment.id}`, 16, 50);
    doc.setFontSize(10);
    doc.text(`Factura: ${invoice.documentNumber}`, 16, 64);
    doc.text(`Cliente: ${invoice.customerName}`, 16, 74);
    doc.text(`Fecha de pago: ${payment.paymentDate}`, 16, 84);
    doc.text(`Método: ${this.paymentMethodLabel(payment.paymentMethod)}`, 16, 94);
    doc.text(`Referencia: ${payment.reference || 'No registrada'}`, 16, 104);

    doc.setFillColor(240, 253, 250);
    doc.roundedRect(16, 122, 178, 40, 4, 4, 'F');
    doc.setTextColor(15, 118, 110);
    doc.setFontSize(12);
    doc.text('Valor recibido', 24, 138);
    doc.setFontSize(22);
    doc.text(currency.format(payment.amount), 24, 154);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);
    doc.text(`Total factura: ${currency.format(invoice.total)}`, 16, 182);
    doc.text(`Pagado antes del registro: ${currency.format(invoice.amountPaid)}`, 16, 192);
    doc.text(`Saldo pendiente anterior: ${currency.format(invoice.amountPending)}`, 16, 202);
    doc.text(`Saldo estimado después del pago: ${currency.format(Math.max(0, invoice.amountPending - payment.amount))}`, 16, 212);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text('Documento generado por ContaNexo para control interno de cartera.', 16, 282);
    doc.save(`comprobante-cartera-${payment.id}.pdf`);
  }

  private paymentMethodLabel(method: Payment['paymentMethod']): string {
    return ({ transfer: 'Transferencia', cash: 'Efectivo', check: 'Cheque', credit_card: 'Tarjeta de crédito' } as const)[method] ?? method;
  }
}
