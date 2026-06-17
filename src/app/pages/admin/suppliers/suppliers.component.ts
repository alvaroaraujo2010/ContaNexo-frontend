import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Supplier } from '../../../core/models';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [ReactiveFormsModule, ModuleHeaderComponent],
  templateUrl: './suppliers.component.html'
})
export class SuppliersComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private navSub?: Subscription;

  items = signal<Supplier[]>([]);
  search = signal('');
  showForm = false;
  editingId: number | null = null;
  submitted = false;

  readonly limits = {
    name: 120,
    taxId: 30,
    contactName: 120,
    phone: 30,
    email: 160,
    address: 250
  };

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(this.limits.name)]],
    taxId: ['', Validators.maxLength(this.limits.taxId)],
    contactName: ['', Validators.maxLength(this.limits.contactName)],
    phone: ['', Validators.maxLength(this.limits.phone)],
    email: ['', [Validators.email, Validators.maxLength(this.limits.email)]],
    address: ['', Validators.maxLength(this.limits.address)],
    isActive: [true]
  });

  ngOnInit() {
    this.reload();
    this.navSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.reload());
  }

  ngOnDestroy() { this.navSub?.unsubscribe(); }

  reload() {
    this.api.loadList<Supplier[]>('suppliers', d => this.items.set(d)).subscribe();
  }

  filteredItems() {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.items();
    return this.items().filter(s => `${s.name} ${s.taxId ?? ''} ${s.contactName ?? ''} ${s.phone ?? ''} ${s.email ?? ''}`.toLowerCase().includes(term));
  }

  edit(s: Supplier) {
    this.editingId = s.id; this.showForm = true; this.submitted = false;
    this.form.patchValue({ name: s.name, taxId: s.taxId || '', contactName: s.contactName || '', phone: s.phone || '', email: s.email || '', address: s.address || '', isActive: s.isActive });
  }

  save() {
    this.submitted = true;
    if (this.form.invalid) return;
    const body = this.form.getRawValue();
    const req = this.editingId ? this.api.put(`suppliers/${this.editingId}`, body) : this.api.post('suppliers', body);
    this.api
      .run(req, {
        success: this.editingId ? 'Proveedor actualizado' : 'Proveedor creado',
        error: 'No se pudo guardar el proveedor'
      })
      .subscribe({
        next: () => {
          this.showForm = false;
          this.editingId = null;
          this.submitted = false;
          this.form.reset({ isActive: true });
          this.reload();
        }
      });
  }

  fieldError(name: string) {
    const control = this.form.get(name);
    if (!control || !control.errors || (!this.submitted && !control.touched)) return null;
    if (control.hasError('required')) return 'Campo requerido';
    if (control.hasError('email')) return 'Correo inválido';
    if (control.hasError('maxlength')) return `Máximo ${this.limits[name as keyof typeof this.limits]} caracteres`;
    return null;
  }
}
