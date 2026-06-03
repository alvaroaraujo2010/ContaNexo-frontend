import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModuleHeaderComponent } from '../../../../shared/module-header/module-header.component';
import { AccountsReceivableService } from '../../../../core/services/accounts-receivable.service';
import { AgingReport, AccountReceivableSummary } from '../../../../core/models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, ModuleHeaderComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private arService = inject(AccountsReceivableService);

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
      error: () => console.error('Error loading aging report')
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
    console.log('Descargando reporte de antigüedad');
    // Implementar descarga del reporte
  }

  downloadOverdueReport() {
    console.log('Descargando reporte de clientes morosos');
    // Implementar descarga del reporte
  }
}
