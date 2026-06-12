import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PayrollService } from '../../../../core/services/payroll.service';
import { Payroll, Employee, Deduction, PayrollDetail } from '../../../../core/models';
import { ModuleHeaderComponent } from '../../../../shared/module-header/module-header.component';

@Component({
  selector: 'app-payroll-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModuleHeaderComponent],
  templateUrl: './payroll-details.component.html',
  styleUrl: './payroll-details.component.scss'
})
export class PayrollDetailsComponent implements OnInit {
  private payrollService = inject(PayrollService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  payroll = signal<Payroll | null>(null);
  employees = signal<Employee[]>([]);
  deductions = signal<Deduction[]>([]);
  loading = signal(true);
  saving = false;
  selectedDetail = signal<PayrollDetail | null>(null);

  form = this.fb.group({
    details: this.fb.array([])
  });

  get detailsForm(): FormArray {
    return this.form.controls.details as FormArray;
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadData(parseInt(id));
  }

  loadData(id: number) {
    this.loading.set(true);
    this.payrollService.getPayroll(id).subscribe({
      next: (payroll) => {
        this.payroll.set(payroll);
        if (payroll.details?.length > 0) this.selectedDetail.set(payroll.details[0]);
        this.rebuildDraftForm();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.payrollService.getEmployees().subscribe({
      next: data => { this.employees.set(data); this.rebuildDraftForm(); }
    });
    this.payrollService.getDeductions().subscribe({
      next: data => this.deductions.set(data)
    });
  }

  selectDetail(d: PayrollDetail) { this.selectedDetail.set(d); }

  rebuildDraftForm() {
    const p = this.payroll();
    const employees = this.employees();
    if (!p || p.status !== 'draft' || employees.length === 0) return;

    this.detailsForm.clear();
    const existing = new Map((p.details ?? []).map(d => [d.employeeId, d]));
    employees.filter(e => e.isActive).forEach(emp => {
      const detail = existing.get(emp.id);
      const otherDeductions = (detail?.deductions ?? [])
        .filter(d => d.category === 'other')
        .reduce((sum, d) => sum + (d.amount ?? 0), 0);

      this.detailsForm.push(this.fb.group({
        employeeId: [emp.id, Validators.required],
        employeeName: [emp.name, Validators.required],
        baseSalary: [detail?.baseSalary ?? emp.baseSalary ?? 0, [Validators.required, Validators.min(0)]],
        variableIncome: [detail?.variableIncome ?? 0, [Validators.min(0)]],
        additionalDeduction: [otherDeductions, [Validators.min(0)]],
      }));
    });
  }

  saveDraftDetails() {
    const p = this.payroll();
    if (!p || this.form.invalid || this.saving) return;
    this.saving = true;
    const details = this.detailsForm.getRawValue().map((d: any) => ({
      employeeId: d.employeeId,
      employeeName: d.employeeName,
      baseSalary: Number(d.baseSalary ?? 0),
      variableIncome: Number(d.variableIncome ?? 0),
      totalDeductions: 0,
      netSalary: 0,
      deductions: Number(d.additionalDeduction ?? 0) > 0
        ? [{ deductionId: 0, deductionName: 'Deducciones adicionales', amount: Number(d.additionalDeduction) }]
        : []
    }));

    this.payrollService.updatePayroll(p.id, { details } as any).subscribe({
      next: updated => { this.payroll.set(updated); this.selectedDetail.set(updated.details?.[0] ?? null); this.saving = false; this.rebuildDraftForm(); },
      error: e => { alert(e?.error?.message ?? 'Error al guardar detalle de nómina'); this.saving = false; }
    });
  }

  process() {
    const p = this.payroll();
    if (!p) return;
    if (!confirm(`¿Procesar nómina del período ${p.periodStart} - ${p.periodEnd}?\nSe calcularán ingresos variables, prestaciones, retención y se generará el asiento contable.`)) return;
    this.saving = true;
    this.payrollService.processPayroll(p.id).subscribe({
      next: (updated) => { this.payroll.set(updated); this.saving = false; },
      error: (e) => { alert(e?.error?.message ?? 'Error al procesar'); this.saving = false; }
    });
  }

  pay() {
    const p = this.payroll();
    if (!p) return;
    const date = prompt('Fecha de pago (YYYY-MM-DD):', new Date().toISOString().split('T')[0] ?? '');
    if (!date) return;
    this.saving = true;
    this.payrollService.payPayroll(p.id, { paymentDate: date, paymentMethod: 'transfer' }).subscribe({
      next: () => { alert('Nómina pagada'); this.saving = false; this.loadData(p.id); },
      error: (e) => { alert(e?.error?.message ?? 'Error'); this.saving = false; }
    });
  }

  cancel() { this.router.navigate(['/admin/nomina']); }

  fmt(n: number | undefined | null): string {
    if (n == null) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  statusLabel(s: string) {
    return ({ draft: 'Borrador', processed: 'Procesada', paid: 'Pagada', cancelled: 'Cancelada' } as any)[s] ?? s;
  }
  statusColor(s: string) {
    return ({ draft: '#f59e0b', processed: '#3b82f6', paid: '#22c55e', cancelled: '#94a3b8' } as any)[s] ?? '#94a3b8';
  }
}
