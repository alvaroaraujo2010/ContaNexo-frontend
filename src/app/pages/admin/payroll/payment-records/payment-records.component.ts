import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModuleHeaderComponent } from '../../../../shared/module-header/module-header.component';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { PayrollService } from '../../../../core/services/payroll.service';
import { PaymentRecord } from '../../../../core/models';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-payment-records',
  standalone: true,
  imports: [CommonModule, ModuleHeaderComponent],
  templateUrl: './payment-records.component.html',
  styleUrl: './payment-records.component.scss'
})
export class PaymentRecordsComponent implements OnInit, OnDestroy {
  private payrollService = inject(PayrollService);
  private router = inject(Router);
  private navSub?: Subscription;

  records = signal<PaymentRecord[]>([]);
  filterStatus = signal<string>('');

  ngOnInit() {
    this.reload();
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.reload());
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
  }

  reload() {
    this.payrollService.getPaymentRecords().subscribe({
      next: (data) => this.records.set(data),
      error: () => console.error('Error loading payment records')
    });
  }

  getTotalAmount(): number {
    return this.getFilteredRecords().reduce((sum, r) => sum + r.totalAmount, 0);
  }

  getFilteredRecords(): PaymentRecord[] {
    const status = this.filterStatus();
    if (!status) return this.records();
    return this.records().filter(r => r.status === status);
  }

  async downloadReceipt(record: PaymentRecord) {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const currency = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
      });

      doc.setFillColor(15, 118, 110);
      doc.rect(0, 0, 210, 34, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text('ContaNexo', 16, 15);
      doc.setFontSize(12);
      doc.text('Comprobante de pago de nómina', 16, 24);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.text(`Comprobante No. ${record.id}`, 16, 50);
      doc.setFontSize(11);
      doc.text(`Nómina: #${record.payrollId}`, 16, 64);
      doc.text(`Período: ${record.periodStart} al ${record.periodEnd}`, 16, 74);
      doc.text(`Fecha de pago: ${record.paymentDate}`, 16, 84);
      doc.text(`Método de pago: ${this.paymentMethodLabel(record.paymentMethod)}`, 16, 94);
      doc.text(`Referencia: ${record.reference || 'No registrada'}`, 16, 104);
      doc.text(`Estado: ${record.status === 'completed' ? 'Completado' : 'Pendiente'}`, 16, 114);

      doc.setFillColor(240, 253, 250);
      doc.roundedRect(16, 130, 178, 34, 4, 4, 'F');
      doc.setFontSize(12);
      doc.text('Total pagado', 24, 143);
      doc.setFontSize(20);
      doc.setTextColor(15, 118, 110);
      doc.text(currency.format(record.totalAmount), 24, 156);

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.text('Documento generado por ContaNexo para control interno de pagos de nómina.', 16, 282);

      doc.save(`comprobante-nomina-${record.id}.pdf`);
      Swal.fire({ icon: 'success', title: 'Comprobante generado', text: 'El PDF fue descargado correctamente.', timer: 1800, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo generar', text: 'Intente nuevamente o verifique el navegador.' });
    }
  }

  private paymentMethodLabel(method: PaymentRecord['paymentMethod']): string {
    return ({ transfer: 'Transferencia', cash: 'Efectivo', check: 'Cheque' } as const)[method] ?? method;
  }
}
