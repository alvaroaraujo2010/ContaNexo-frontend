import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';
import { AccountsReceivableService } from '../../../core/services/accounts-receivable.service';
import { Invoice, AccountReceivableSummary } from '../../../core/models';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-accounts-receivable',
  standalone: true,
  imports: [CommonModule, ModuleHeaderComponent],
  templateUrl: './accounts-receivable.component.html',
  styleUrl: './accounts-receivable.component.scss'
})
export class AccountsReceivableComponent implements OnInit, OnDestroy {
  private arService = inject(AccountsReceivableService);
  private router = inject(Router);
  private navSub?: Subscription;

  invoices = signal<Invoice[]>([]);
  summary = signal<AccountReceivableSummary | null>(null);
  filterStatus = signal<string>('');
  search = signal('');
  loading = signal(true);

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
    this.loading.set(true);
    this.arService.getInvoices().subscribe({
      next: (data) => {
        this.invoices.set(data);
        this.loading.set(false);
      },
      error: () => {
        console.error('Error loading invoices');
        this.loading.set(false);
      }
    });

    this.arService.getAccountReceivableSummary().subscribe({
      next: (data) => this.summary.set(data),
      error: () => console.error('Error loading summary')
    });
  }

  viewDetails(invoice: Invoice) {
    this.router.navigate(['/admin/cuentas-por-cobrar', invoice.id]);
  }

  recordPayment(invoice: Invoice) {
    if (invoice.status === 'paid') {
      Swal.fire('Factura pagada', 'Esta factura ya fue pagada completamente.', 'info');
      return;
    }
    this.router.navigate(['/admin/cuentas-por-cobrar/pago', invoice.id]);
  }

  getFilteredInvoices(): Invoice[] {
    const status = this.filterStatus();
    const term = this.search().trim().toLowerCase();
    return this.invoices().filter(i => {
      const matchesStatus = !status || i.status === status;
      const matchesTerm = !term || `${i.documentNumber} ${i.customerName} ${i.status} ${i.invoiceDate} ${i.dueDate}`.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'unpaid': '#f57c00',
      'partially_paid': '#fbc02d',
      'paid': '#2e7d32',
      'overdue': '#d32f2f',
      'cancelled': '#9e9e9e'
    };
    return colors[status] || '#999';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'unpaid': 'Sin Cobrar',
      'partially_paid': 'Parcialmente Cobrada',
      'paid': 'Cobrada',
      'overdue': 'Vencida',
      'cancelled': 'Cancelada'
    };
    return labels[status] || status;
  }

  getDaysOverdue(dueDate: string): number {
    return this.arService.calculateDaysOverdue(dueDate);
  }
}
