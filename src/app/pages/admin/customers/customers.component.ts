import { Component, ElementRef, ViewChild, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Customer } from '../../../core/models';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [ReactiveFormsModule, ModuleHeaderComponent],
  templateUrl: './customers.component.html'
})
export class CustomersComponent implements OnInit, OnDestroy {
  @ViewChild('customerForm') private customerForm?: ElementRef<HTMLElement>;

  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private navSub?: Subscription;

  items = signal<Customer[]>([]);
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
    taxId: ['', [Validators.required, Validators.maxLength(this.limits.taxId)]],
    contactName: ['', [Validators.required, Validators.maxLength(this.limits.contactName)]],
    phone: ['', [Validators.required, Validators.maxLength(this.limits.phone)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(this.limits.email)]],
    address: ['', [Validators.required, Validators.maxLength(this.limits.address)]],
    isActive: [true]
  });

  ngOnInit() {
    this.reload();
    this.navSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.reload());
  }

  ngOnDestroy() { this.navSub?.unsubscribe(); }

  reload() {
    this.api.loadList<Customer[]>('customers', d => this.items.set(d)).subscribe();
  }

  filteredItems() {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.items();
    return this.items().filter(c => `${c.name} ${c.taxId ?? ''} ${c.contactName ?? ''} ${c.phone ?? ''} ${c.email ?? ''}`.toLowerCase().includes(term));
  }

  edit(c: Customer) {
    this.editingId = c.id; this.showForm = true; this.submitted = false;
    this.form.patchValue({ name: c.name, taxId: c.taxId || '', contactName: c.contactName || '', phone: c.phone || '', email: c.email || '', address: c.address || '', isActive: c.isActive });
    setTimeout(() => this.customerForm?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  save() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const body = this.trimBody(this.form.getRawValue());
    const req = this.editingId ? this.api.put(`customers/${this.editingId}`, body) : this.api.post('customers', body);
    this.api
      .run(req, {
        success: this.editingId ? 'Cliente actualizado' : 'Cliente creado',
        error: 'No se pudo guardar el cliente'
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

  fieldError(name: keyof typeof this.limits) {
    const control = this.form.get(name);
    if (!control || !this.shouldShowError(control)) return '';
    if (control.hasError('required')) return 'Campo obligatorio';
    if (control.hasError('email')) return 'Ingrese un email valido';
    if (control.hasError('maxlength')) return `Maximo ${this.limits[name]} caracteres`;
    return '';
  }

  private shouldShowError(control: AbstractControl) {
    return control.invalid && (control.touched || control.dirty || this.submitted);
  }

  private trimBody(body: typeof this.form.value) {
    return {
      name: body.name?.trim() ?? '',
      taxId: body.taxId?.trim() ?? '',
      contactName: body.contactName?.trim() ?? '',
      phone: body.phone?.trim() ?? '',
      email: body.email?.trim() ?? '',
      address: body.address?.trim() ?? '',
      isActive: body.isActive ?? true
    };
  }
}
