import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Tenant } from '../../../core/models';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModuleHeaderComponent],
  templateUrl: './tenants.component.html'
})
export class TenantsComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  items = signal<Tenant[]>([]);
  search = signal('');
  showForm = false;
  editingId: number | null = null;

  form = this.fb.group({
    code: ['', Validators.required],
    businessName: ['', Validators.required],
    taxId: [''],
    plan: ['basico', Validators.required],
    commercialStatus: ['trial', Validators.required],
    billingCycle: ['manual', Validators.required],
    nextBillingDate: [''],
    maxUsers: [null as number | null],
    commercialNotes: [''],
    isActive: [true],
    adminFullName: ['', Validators.required],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.api.loadList<Tenant[]>('tenants', data => this.items.set(data)).subscribe();
  }

  filteredItems() {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.items();
    return this.items().filter(t => `${t.code} ${t.businessName} ${t.taxId ?? ''} ${t.plan} ${t.commercialStatus} ${t.billingCycle}`.toLowerCase().includes(term));
  }

  save() {
    if (this.form.invalid) return;
    const payload = this.form.getRawValue();
    const request = this.editingId
      ? this.api.put<Tenant>(`tenants/${this.editingId}`, payload)
      : this.api.post<Tenant>('tenants', payload);

    this.api.run(request, {
      success: this.editingId ? 'Negocio actualizado correctamente' : 'Negocio creado correctamente',
      error: this.editingId ? 'No se pudo actualizar el negocio' : 'No se pudo crear el negocio'
    }).subscribe({
      next: () => {
        this.cancelEdit();
        this.reload();
      }
    });
  }

  toggle(tenant: Tenant) {
    this.api.run(this.api.put<Tenant>(`tenants/${tenant.id}`, {
      businessName: tenant.businessName,
      taxId: tenant.taxId,
      plan: tenant.plan,
      commercialStatus: tenant.commercialStatus,
      billingCycle: tenant.billingCycle,
      nextBillingDate: tenant.nextBillingDate,
      maxUsers: tenant.maxUsers,
      commercialNotes: tenant.commercialNotes,
      isActive: !tenant.isActive
    }), {
      success: tenant.isActive ? 'Negocio desactivado' : 'Negocio activado',
      error: 'No se pudo actualizar el negocio'
    }).subscribe({ next: () => this.reload() });
  }

  newTenant() {
    this.editingId = null;
    this.showForm = true;
    this.form.controls.code.enable();
    this.setAdminValidators(true);
    this.form.reset({ plan: 'basico', commercialStatus: 'trial', billingCycle: 'manual', isActive: true, adminPassword: '' });
  }

  edit(tenant: Tenant) {
    this.editingId = tenant.id;
    this.showForm = true;
    this.form.controls.code.disable();
    this.setAdminValidators(false);
    this.form.reset({
      code: tenant.code,
      businessName: tenant.businessName,
      taxId: tenant.taxId ?? '',
      plan: tenant.plan,
      commercialStatus: tenant.commercialStatus,
      billingCycle: tenant.billingCycle,
      nextBillingDate: tenant.nextBillingDate?.slice(0, 10) ?? '',
      maxUsers: tenant.maxUsers ?? null,
      commercialNotes: tenant.commercialNotes ?? '',
      isActive: tenant.isActive,
      adminFullName: '',
      adminEmail: '',
      adminPassword: ''
    });
  }

  cancelEdit() {
    this.editingId = null;
    this.showForm = false;
    this.form.controls.code.enable();
    this.setAdminValidators(true);
    this.form.reset({ plan: 'basico', commercialStatus: 'trial', billingCycle: 'manual', isActive: true, adminPassword: '' });
  }

  private setAdminValidators(required: boolean) {
    if (required) {
      this.form.controls.adminFullName.setValidators(Validators.required);
      this.form.controls.adminEmail.setValidators([Validators.required, Validators.email]);
      this.form.controls.adminPassword.setValidators([Validators.required, Validators.minLength(8)]);
    } else {
      this.form.controls.adminFullName.clearValidators();
      this.form.controls.adminEmail.clearValidators();
      this.form.controls.adminPassword.clearValidators();
    }
    this.form.controls.adminFullName.updateValueAndValidity();
    this.form.controls.adminEmail.updateValueAndValidity();
    this.form.controls.adminPassword.updateValueAndValidity();
  }
}
