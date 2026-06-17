import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountsReceivableService } from '../../../../core/services/accounts-receivable.service';
import { Invoice, Payment, PaymentPlan } from '../../../../core/models';
import Swal from 'sweetalert2';

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

  async downloadStatement() {
    const invoice = this.invoice();
    if (!invoice) return;

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('ContaNexo', 16, 15);
    doc.setFontSize(12);
    doc.text('Estado de cuenta de cartera', 16, 24);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(`Factura: ${invoice.documentNumber}`, 16, 50);
    doc.setFontSize(10);
    doc.text(`Cliente: ${invoice.customerName}`, 16, 62);
    doc.text(`Fecha factura: ${invoice.invoiceDate}`, 16, 72);
    doc.text(`Vencimiento: ${invoice.dueDate}`, 16, 82);
    doc.text(`Estado: ${this.statusLabel(invoice.status)}`, 16, 92);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(16, 108, 178, 42, 4, 4, 'F');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`Total factura: ${currency.format(invoice.total)}`, 24, 124);
    doc.text(`Total cobrado: ${currency.format(invoice.amountPaid)}`, 24, 136);
    doc.text(`Saldo pendiente: ${currency.format(invoice.amountPending)}`, 110, 124);
    doc.text(`Avance de cobro: ${this.getPaymentPercentage().toFixed(0)}%`, 110, 136);

    let y = 168;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text('Historial de pagos', 16, y);
    y += 10;
    if (this.payments().length === 0) {
      doc.setFontSize(10);
      doc.text('No hay pagos registrados.', 16, y);
      y += 10;
    } else {
      this.payments().forEach(payment => {
        doc.setFontSize(9);
        doc.text(`${payment.paymentDate} - ${this.paymentMethodLabel(payment.paymentMethod)} - ${currency.format(payment.amount)} - Ref: ${payment.reference || '-'}`, 16, y);
        y += 8;
      });
    }

    y += 8;
    doc.setFontSize(12);
    doc.text('Detalle de productos', 16, y);
    y += 10;
    invoice.details.forEach(detail => {
      if (y > 268) { doc.addPage(); y = 24; }
      doc.setFontSize(9);
      doc.text(`${detail.productName} | Cant. ${detail.quantity} | ${currency.format(detail.unitPrice)} | ${currency.format(detail.lineTotal)}`, 16, y);
      y += 8;
    });

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text('Documento generado por ContaNexo para seguimiento de cartera.', 16, 282);
    doc.save(`estado-cuenta-${invoice.documentNumber}.pdf`);
    Swal.fire({ icon: 'success', title: 'Estado de cuenta generado', timer: 1600, showConfirmButton: false });
  }

  async downloadPaymentReceipt(payment: Payment) {
    const invoice = this.invoice();
    if (!invoice) return;
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
    doc.setFontSize(12);
    doc.text(`Comprobante No. ${payment.id}`, 16, 50);
    doc.text(`Factura: ${invoice.documentNumber}`, 16, 64);
    doc.text(`Cliente: ${invoice.customerName}`, 16, 76);
    doc.text(`Fecha: ${payment.paymentDate}`, 16, 88);
    doc.text(`Método: ${this.paymentMethodLabel(payment.paymentMethod)}`, 16, 100);
    doc.text(`Referencia: ${payment.reference || 'No registrada'}`, 16, 112);
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(16, 130, 178, 34, 4, 4, 'F');
    doc.setTextColor(15, 118, 110);
    doc.setFontSize(20);
    doc.text(currency.format(payment.amount), 24, 152);
    doc.save(`comprobante-cartera-${payment.id}.pdf`);
    Swal.fire({ icon: 'success', title: 'Comprobante generado', timer: 1600, showConfirmButton: false });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = { unpaid: 'Sin cobrar', partially_paid: 'Parcial', paid: 'Cobrada', overdue: 'Vencida', cancelled: 'Cancelada' };
    return labels[status] ?? status;
  }

  private paymentMethodLabel(method: Payment['paymentMethod']): string {
    return ({ transfer: 'Transferencia', cash: 'Efectivo', check: 'Cheque', credit_card: 'Tarjeta de crédito' } as const)[method] ?? method;
  }
}
