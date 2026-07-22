import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountsReceivableService } from '../../../../core/services/accounts-receivable.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Invoice, PaymentPlan } from '../../../../core/models';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-payment-plan',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-plan.component.html',
  styleUrl: './payment-plan.component.scss'
})
export class PaymentPlanComponent implements OnInit {
  private arService = inject(AccountsReceivableService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  invoice = signal<Invoice | null>(null);
  loading = signal(true);
  saving = false;

  form = this.fb.group({
    numberOfInstallments: [3, [Validators.required, Validators.min(2), Validators.max(24)]],
    startDate: [new Date().toISOString().split('T')[0], Validators.required],
    installments: this.fb.array([])
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
        this.generateInstallments();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Error al cargar factura');
        this.loading.set(false);
      }
    });
  }

  generateInstallments() {
    const invoice = this.invoice();
    if (!invoice) return;

    const numberOfInstallments = this.form.get('numberOfInstallments')?.value || 1;
    const startDate = this.form.get('startDate')?.value || new Date().toISOString().split('T')[0];

    const installments = this.arService.generateInstallments(
      invoice.amountPending,
      numberOfInstallments,
      startDate
    );

    const installmentsArray = this.form.get('installments') as FormArray;
    installmentsArray.clear();

    installments.forEach(inst => {
      installmentsArray.push(
        this.fb.group({
          number: [inst.number],
          dueDate: [inst.dueDate],
          amount: [inst.amount, [Validators.required, Validators.min(0)]]
        })
      );
    });
  }

  getInstallmentsArray(): FormArray {
    return this.form.get('installments') as FormArray;
  }

  onInstallmentsChange() {
    this.generateInstallments();
  }

  getTotalInstallments(): number {
    return this.getInstallmentsArray().controls.reduce((sum, ctrl) => {
      return sum + (ctrl.get('amount')?.value || 0);
    }, 0);
  }

  save() {
    if (this.form.invalid || this.saving) return;

    this.saving = true;
    const invoice = this.invoice();
    if (!invoice) {
      this.saving = false;
      return;
    }

    const installments = this.getInstallmentsArray().getRawValue();

    const paymentPlan: Omit<PaymentPlan, 'id' | 'createdAt'> = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.documentNumber,
      customerId: invoice.customerId || 0,
      customerName: invoice.customerName,
      totalAmount: invoice.amountPending,
      numberOfInstallments: this.form.get('numberOfInstallments')?.value || 0,
      installmentAmount: this.getTotalInstallments() / (this.form.get('numberOfInstallments')?.value || 1),
      startDate: this.form.get('startDate')?.value || '',
      installments,
      status: 'active',
      notes: ''
    };

    this.arService.createPaymentPlan(paymentPlan).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Plan creado', text: 'Plan de pago creado correctamente.', timer: 1800, showConfirmButton: false });
        this.saving = false;
        this.router.navigate(['/admin/cuentas-por-cobrar', invoice.id]);
      },
      error: () => {
        Swal.fire('Error', 'No se pudo crear el plan de pago.', 'error');
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
}
