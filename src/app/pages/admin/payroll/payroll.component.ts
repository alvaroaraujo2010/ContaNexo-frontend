import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';
import { PayrollService } from '../../../core/services/payroll.service';
import { Payroll } from '../../../core/models';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModuleHeaderComponent],
  templateUrl: './payroll.component.html',
  styleUrl: './payroll.component.scss'
})
export class PayrollComponent implements OnInit, OnDestroy {
  private svc = inject(PayrollService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  auth = inject(AuthService);
  private navSub?: Subscription;

  payrolls = signal<Payroll[]>([]);
  filterStatus = signal<string>('');
  search = signal('');
  showForm = false;
  saving = false;

  form = this.fb.group({
    periodStart: ['', Validators.required],
    periodEnd:   ['', Validators.required],
    paymentDate: [''],
    notes:       ['']
  });

  loading = signal(true);

  isAdmin() { return this.auth.hasRole(['Administrador']); }

  ngOnInit() {
    this.reload();
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.reload());
  }

  ngOnDestroy() { this.navSub?.unsubscribe(); }

  reload() {
    this.loading.set(true);
    this.svc.getPayrolls().subscribe({
      next: d => { this.payrolls.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openForm() {
    this.showForm = true;
    this.form.reset({ periodStart: '', periodEnd: '', paymentDate: '', notes: '' });
  }

  save() {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const v = this.form.getRawValue();
    this.svc.createPayroll({
      periodStart: v.periodStart!,
      periodEnd:   v.periodEnd!,
      paymentDate: v.paymentDate ?? undefined,
      notes:       v.notes ?? undefined,
      status: 'draft'
    } as any).subscribe({
      next: created => {
        this.showForm = false;
        this.saving = false;
        this.router.navigate(['/admin/nomina', created.id]);
      },
      error: () => { this.saving = false; }
    });
  }

  viewDetails(p: Payroll) { this.router.navigate(['/admin/nomina', p.id]); }

  async processPayroll(p: Payroll) {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Procesar nómina',
      text: `Se calcularán prestaciones, seguridad social, retención y provisiones del período ${p.periodStart} al ${p.periodEnd}.`,
      showCancelButton: true,
      confirmButtonText: 'Procesar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    this.svc.processPayroll(p.id).subscribe({
      next: () => this.reload(),
      error: () => Swal.fire('Error', 'No se pudo procesar la nómina', 'error')
    });
  }

  async payPayroll(p: Payroll) {
    const result = await Swal.fire({
      icon: 'info',
      title: 'Registrar pago de nómina',
      html: `
        <input id="payroll-date" type="date" class="swal2-input" value="${new Date().toISOString().split('T')[0]}">
        <select id="payroll-method" class="swal2-input">
          <option value="transfer">Transferencia</option>
          <option value="cash">Efectivo</option>
          <option value="check">Cheque</option>
        </select>
        <input id="payroll-reference" class="swal2-input" placeholder="Referencia o comprobante">
      `,
      showCancelButton: true,
      confirmButtonText: 'Registrar pago',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const date = (document.getElementById('payroll-date') as HTMLInputElement | null)?.value;
        const method = (document.getElementById('payroll-method') as HTMLSelectElement | null)?.value as 'transfer' | 'cash' | 'check';
        const reference = (document.getElementById('payroll-reference') as HTMLInputElement | null)?.value;
        if (!date) {
          Swal.showValidationMessage('Seleccione una fecha de pago');
          return null;
        }
        return { date, method, reference };
      }
    });
    if (!result.isConfirmed || !result.value) return;
    this.svc.payPayroll(p.id, {
      paymentDate: result.value.date,
      paymentMethod: result.value.method,
      reference: result.value.reference || undefined
    }).subscribe({
      next: () => { Swal.fire({ icon: 'success', title: 'Nómina pagada', timer: 1800, showConfirmButton: false }); this.reload(); }
    });
  }

  async delete(p: Payroll) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar nómina',
      text: `¿Eliminar nómina del período ${p.periodStart}?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    this.svc.deletePayroll(p.id).subscribe({
      next: () => { Swal.fire({ icon: 'success', title: 'Nómina eliminada', timer: 1600, showConfirmButton: false }); this.reload(); },
      error: () => Swal.fire('Error', 'No se pudo eliminar la nómina.', 'error')
    });
  }

  getFilteredPayrolls(): Payroll[] {
    const s = this.filterStatus();
    const term = this.search().trim().toLowerCase();
    return this.payrolls().filter(p => {
      const matchesStatus = !s || p.status === s;
      const matchesTerm = !term || `${p.periodStart} ${p.periodEnd} ${p.paymentDate ?? ''} ${p.status} ${p.notes ?? ''}`.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }

  statusLabel(s: string) {
    return ({ draft: 'Borrador', processed: 'Procesada', paid: 'Pagada', cancelled: 'Cancelada' } as any)[s] ?? s;
  }

  statusColor(s: string) {
    return ({ draft: '#f59e0b', processed: '#3b82f6', paid: '#22c55e', cancelled: '#94a3b8' } as any)[s] ?? '#94a3b8';
  }

  employerContributions(p: Payroll): number {
    return (p.totalEmployerHealth ?? 0) + (p.totalEmployerPension ?? 0) + (p.totalArl ?? 0)
      + (p.totalCompensationFund ?? 0) + (p.totalSena ?? 0) + (p.totalIcbf ?? 0);
  }

  fmt(n: number | undefined | null): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n ?? 0);
  }
}
