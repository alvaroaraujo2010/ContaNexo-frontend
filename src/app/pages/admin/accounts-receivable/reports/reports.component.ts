import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModuleHeaderComponent } from '../../../../shared/module-header/module-header.component';
import { AccountsReceivableService } from '../../../../core/services/accounts-receivable.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AgingReport, AccountReceivableSummary } from '../../../../core/models';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, ModuleHeaderComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private arService = inject(AccountsReceivableService);
  private toast = inject(ToastService);

  agingReport = signal<AgingReport | null>(null);
  summary = signal<AccountReceivableSummary | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.loadReports();
  }

  loadReports() {
    this.loading.set(true);

    this.arService.getAgingReport().subscribe({
      next: (report) => this.agingReport.set(report),
      error: () => this.toast.error('Error al cargar reporte de antigüedad')
    });

    this.arService.getAccountReceivableSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  downloadAgingReport() {
    const report = this.agingReport();
    if (!report) {
      this.notifyWarning('No hay información de antigüedad para descargar.');
      return;
    }

    const rows = [
      ['Cliente', 'Vigente', '30 días', '60 días', '90 días', 'Más de 90', 'Total'],
      ...report.lines.map(line => [
        line.customerName,
        line.current,
        line.days30,
        line.days60,
        line.days90,
        line.daysOver90,
        line.total
      ]),
      ['Totales', report.totalCurrent, report.totalDays30, report.totalDays60, report.totalDays90, report.totalOver90, report.totalOverdue]
    ];

    this.downloadCsv('reporte-antiguedad-cartera.csv', rows);
    this.notifySuccess('Reporte de antigüedad descargado.');
  }

  downloadOverdueReport() {
    const summary = this.summary();
    if (!summary) {
      this.notifyWarning('No hay información de clientes morosos para descargar.');
      return;
    }

    const overdue = summary.byCustomer.filter(c => c.daysOverdue > 0);
    if (overdue.length === 0) {
      this.notifyWarning('No hay clientes con cartera vencida para descargar.');
      return;
    }

    const rows = [
      ['Cliente', 'Monto total', 'Monto pagado', 'Monto pendiente', 'Días vencido', 'Estado'],
      ...overdue.map(customer => [
        customer.customerName,
        customer.totalAmount,
        customer.amountPaid,
        customer.amountPending,
        customer.daysOverdue,
        customer.daysOverdue > 90 ? 'Crítico' : customer.daysOverdue > 60 ? 'Alto' : 'Medio'
      ])
    ];

    this.downloadCsv('reporte-clientes-morosos.csv', rows);
    this.notifySuccess('Reporte de clientes morosos descargado.');
  }

  private downloadCsv(filename: string, rows: (string | number)[][]) {
    const csv = rows
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private notifySuccess(message: string) {
    Swal.fire({ icon: 'success', title: 'Descarga lista', text: message, timer: 1800, showConfirmButton: false });
  }

  private notifyWarning(message: string) {
    Swal.fire({ icon: 'info', title: 'Sin datos', text: message });
  }
}
