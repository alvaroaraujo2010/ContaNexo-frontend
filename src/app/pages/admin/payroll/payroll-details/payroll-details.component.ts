import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PayrollService } from '../../../../core/services/payroll.service';
import { Payroll, Employee, Deduction, PayrollDetail } from '../../../../core/models';
import { ModuleHeaderComponent } from '../../../../shared/module-header/module-header.component';
import Swal from 'sweetalert2';
import { AuthService } from '../../../../core/services/auth.service';

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
  auth = inject(AuthService);

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

  isAdmin() { return this.auth.hasRole(['Administrador']); }

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
      next: updated => { this.payroll.set(updated); this.selectedDetail.set(updated.details?.[0] ?? null); this.saving = false; this.rebuildDraftForm(); Swal.fire({ icon: 'success', title: 'Borrador calculado', timer: 1600, showConfirmButton: false }); },
      error: e => { Swal.fire('Error', e?.error?.message ?? 'Error al guardar detalle de nómina', 'error'); this.saving = false; }
    });
  }

  async process() {
    const p = this.payroll();
    if (!p) return;
    const result = await Swal.fire({
      icon: 'question',
      title: 'Procesar nómina',
      text: `Se calcularán ingresos variables, prestaciones, retención y se generará el asiento contable del período ${p.periodStart} - ${p.periodEnd}.`,
      showCancelButton: true,
      confirmButtonText: 'Procesar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    this.saving = true;
    this.payrollService.processPayroll(p.id).subscribe({
      next: (updated) => { this.payroll.set(updated); this.saving = false; },
      error: (e) => { Swal.fire('Error', e?.error?.message ?? 'Error al procesar', 'error'); this.saving = false; }
    });
  }

  async pay() {
    const p = this.payroll();
    if (!p) return;
    const result = await Swal.fire({
      icon: 'info',
      title: 'Registrar pago de nómina',
      html: `
        <input id="payroll-date" type="date" class="swal2-input" value="${new Date().toISOString().split('T')[0] ?? ''}">
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
    this.saving = true;
    this.payrollService.payPayroll(p.id, {
      paymentDate: result.value.date,
      paymentMethod: result.value.method,
      reference: result.value.reference || undefined
    }).subscribe({
      next: () => { Swal.fire({ icon: 'success', title: 'Nómina pagada', timer: 1800, showConfirmButton: false }); this.saving = false; this.loadData(p.id); },
      error: (e) => { Swal.fire('Error', e?.error?.message ?? 'No se pudo pagar la nómina', 'error'); this.saving = false; }
    });
  }

  async downloadPayslip(d: PayrollDetail) {
    const p = this.payroll();
    if (!p) return;

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const generatedAt = new Date().toLocaleString('es-CO');

    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('ContaNexo', 16, 15);
    doc.setFontSize(12);
    doc.text('Desprendible de nómina', 16, 24);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(`Empleado: ${d.employeeName}`, 16, 48);
    doc.setFontSize(10);
    doc.text(`Período: ${p.periodStart} al ${p.periodEnd}`, 16, 58);
    doc.text(`Estado nómina: ${this.statusLabel(p.status)}`, 16, 66);
    doc.text(`Generado: ${generatedAt}`, 16, 74);

    let y = 92;
    y = this.pdfSection(doc, 'Devengados', y, [
      ['Salario básico', d.baseSalary],
      ['Ingresos variables', d.variableIncome],
      ['Auxilio de transporte', d.transportAllowance],
      ['Total devengado', d.totalGross]
    ]);

    y = this.pdfSection(doc, 'Deducciones', y + 8, [
      ['Salud empleado (4%)', d.employeeHealthDeduction],
      ['Pensión empleado (4%)', d.employeePensionDeduction],
      ['Fondo Solidaridad Pensional', d.solidarityFundDeduction],
      ['Retención en la fuente', d.withholdingTax],
      ...d.deductions.filter(x => x.category === 'other').map(x => [x.deductionName, x.amount] as [string, number]),
      ['Total deducciones', d.totalDeductions]
    ], true);

    doc.setFillColor(240, 253, 250);
    doc.roundedRect(16, y + 10, 178, 24, 4, 4, 'F');
    doc.setTextColor(15, 118, 110);
    doc.setFontSize(14);
    doc.text('Neto a pagar', 24, y + 25);
    doc.text(this.fmt(d.netSalary), 150, y + 25, { align: 'right' });

    y += 48;
    y = this.pdfSection(doc, 'Provisiones informativas', y, [
      ['Prima de servicios', d.primaProvision],
      ['Cesantías', d.cesantiasProvision],
      ['Intereses cesantías', d.cesantiasInterestProvision],
      ['Vacaciones', d.vacationProvision],
      ['Total provisiones', d.totalProvisions]
    ]);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text('Documento generado por ContaNexo para control interno de nómina.', 16, 282);
    doc.save(`desprendible-${d.employeeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${p.periodStart}.pdf`);
    Swal.fire({ icon: 'success', title: 'Desprendible generado', timer: 1600, showConfirmButton: false });
  }

  private pdfSection(doc: any, title: string, startY: number, rows: [string, number][], negative = false): number {
    let y = startY;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(16, y - 8, 178, 10, 2, 2, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.text(title, 22, y - 1);
    y += 9;

    rows.filter(([, amount]) => amount > 0).forEach(([label, amount]) => {
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(10);
      doc.text(label, 22, y);
      doc.text(`${negative ? '-' : ''}${this.fmt(amount)}`, 150, y, { align: 'right' });
      y += 8;
    });
    return y;
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
