import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription, switchMap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Product, Purchase, Supplier } from '../../../core/models';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CurrencyPipe, DatePipe, ModuleHeaderComponent],
  templateUrl: './purchases.component.html'
})
export class PurchasesComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private navSub?: Subscription;

  items = signal<Purchase[]>([]);
  suppliers = signal<Supplier[]>([]);
  products = signal<Product[]>([]);
  search = signal('');
  showForm = false;
  editingId: number | null = null;
  submitted = false;
  lineSubmitted = false;
  lines: { productId: number; quantity: number; unitCost: number; name: string }[] = [];

  readonly limits = {
    search: 120,
    notes: 500,
    quantity: 1000000,
    unitCost: 1000000000
  };

  form = this.fb.group({
    supplierId: [0, [Validators.required, Validators.min(1)]],
    purchaseDate: [''],
    taxRate: [0.19, [Validators.required, Validators.min(0), Validators.max(1)]],
    notes: ['', Validators.maxLength(this.limits.notes)],
    productId: [0],
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(this.limits.quantity)]],
    unitCost: [0, [Validators.required, Validators.min(0), Validators.max(this.limits.unitCost)]]
  });

  ngOnInit() {
    this.reload();
    this.navSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.reload());
  }

  ngOnDestroy() { this.navSub?.unsubscribe(); }

  reload() {
    this.api.loadList<Purchase[]>('purchases', d => this.items.set(d)).subscribe();
    this.api.loadList<Supplier[]>('suppliers', d => this.suppliers.set(d)).subscribe();
    this.api.loadList<Product[]>('products', d => this.products.set(d)).subscribe();
  }

  filteredItems() {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.items();
    return this.items().filter(p => `${p.documentNumber} ${p.supplierName} ${p.status} ${p.notes ?? ''}`.toLowerCase().includes(term));
  }

  openNew() {
    this.showForm = true;
    this.editingId = null;
    this.submitted = false;
    this.lineSubmitted = false;
    this.lines = [];
    this.form.reset({ supplierId: 0, purchaseDate: '', taxRate: 0.19, notes: '', productId: 0, quantity: 1, unitCost: 0 });
  }

  cancelForm() {
    this.showForm = false;
    this.editingId = null;
    this.submitted = false;
    this.lineSubmitted = false;
    this.lines = [];
    this.form.reset({ supplierId: 0, purchaseDate: '', taxRate: 0.19, notes: '', productId: 0, quantity: 1, unitCost: 0 });
  }

  edit(purchase: Purchase) {
    if (purchase.status !== 'Borrador') return;
    this.showForm = true;
    this.editingId = purchase.id;
    this.submitted = false;
    this.lineSubmitted = false;
    const taxRate = purchase.subtotal > 0 ? Number((purchase.tax / purchase.subtotal).toFixed(2)) : 0;
    this.form.patchValue({
      supplierId: purchase.supplierId,
      purchaseDate: this.toDateInput(purchase.purchaseDate),
      taxRate,
      notes: purchase.notes ?? '',
      productId: 0,
      quantity: 1,
      unitCost: 0
    });
    this.lines = purchase.details.map(d => ({
      productId: d.productId,
      quantity: d.quantity,
      unitCost: d.unitCost,
      name: d.productName
    }));
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  addLine() {
    this.lineSubmitted = true;
    const v = this.form.getRawValue();
    const prod = this.products().find(p => p.id === Number(v.productId));
    if (!prod || !v.quantity || v.quantity <= 0 || v.quantity > this.limits.quantity || v.unitCost == null || v.unitCost < 0 || v.unitCost > this.limits.unitCost) return;

    this.lines.push({ productId: prod.id, quantity: v.quantity, unitCost: v.unitCost || prod.unitCost, name: prod.name });
    this.form.patchValue({ productId: 0, quantity: 1, unitCost: 0 });
    this.lineSubmitted = false;
  }

  removeLine(index: number) {
    this.lines.splice(index, 1);
  }

  saveDraft() {
    this.submitted = true;
    if (this.headerInvalid() || !this.lines.length) {
      this.form.markAllAsTouched();
      return;
    }

    this.api
      .run(this.saveRequest(), {
        success: this.editingId ? 'Borrador de compra actualizado' : 'Borrador de compra creado',
        error: 'No se pudo guardar la compra'
      })
      .subscribe({ next: () => this.afterSave() });
  }

  saveAndComplete() {
    this.submitted = true;
    if (this.headerInvalid() || !this.lines.length) {
      this.form.markAllAsTouched();
      return;
    }

    this.api
      .run(this.saveRequest().pipe(switchMap(p => this.api.post<Purchase>(`purchases/${p.id}/complete`, {}))), {
        success: 'Compra completada e inventario actualizado',
        error: 'No se pudo completar la compra'
      })
      .subscribe({ next: () => this.afterSave() });
  }

  complete(purchase: Purchase) {
    this.api
      .run(this.api.post<Purchase>(`purchases/${purchase.id}/complete`, {}), {
        success: 'Compra completada e inventario actualizado',
        error: 'No se pudo completar la compra'
      })
      .subscribe({ next: () => this.reload() });
  }

  cancel(purchase: Purchase) {
    this.api
      .run(this.api.post<Purchase>(`purchases/${purchase.id}/cancel`, {}), {
        success: 'Compra anulada',
        error: 'No se pudo anular la compra'
      })
      .subscribe({ next: () => this.reload() });
  }

  fieldError(name: 'supplierId' | 'taxRate' | 'notes') {
    const control = this.form.get(name);
    if (!control || !this.shouldShowError(control, this.submitted)) return '';
    if (control.hasError('required') || control.hasError('min')) {
      return name === 'supplierId' ? 'Seleccione un proveedor' : 'Campo obligatorio';
    }
    if (control.hasError('max')) return 'El IVA debe estar entre 0 y 1';
    if (control.hasError('maxlength')) return `Maximo ${this.limits.notes} caracteres`;
    return '';
  }

  lineError(name: 'productId' | 'quantity' | 'unitCost') {
    const control = this.form.get(name);
    if (!this.lineSubmitted) return '';
    if (name === 'productId' && !this.form.getRawValue().productId) return 'Seleccione un producto';
    if (!control || !control.invalid) return '';
    if (control.hasError('required') || control.hasError('min')) return name === 'quantity' ? 'Cantidad mayor a 0' : 'No puede ser negativo';
    if (control.hasError('max')) return name === 'quantity' ? `Maximo ${this.limits.quantity}` : `Maximo ${this.limits.unitCost}`;
    return '';
  }

  statusClass(status: string) {
    if (status === 'Completada') return 'badge-ok';
    if (status === 'Anulada') return 'badge-danger';
    return 'badge-warn';
  }

  private saveRequest() {
    const v = this.form.getRawValue();
    const payload = {
      supplierId: Number(v.supplierId),
      purchaseDate: v.purchaseDate || null,
      taxRate: v.taxRate ?? 0,
      notes: v.notes?.trim() || null,
      details: this.lines.map(l => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost }))
    };

    return this.editingId
      ? this.api.put<Purchase>(`purchases/${this.editingId}`, payload)
      : this.api.post<Purchase>('purchases', payload);
  }

  private afterSave() {
    this.cancelForm();
    this.reload();
  }

  private headerInvalid() {
    return !!this.form.get('supplierId')?.invalid || !!this.form.get('taxRate')?.invalid || !!this.form.get('notes')?.invalid;
  }

  private shouldShowError(control: AbstractControl, submitted: boolean) {
    return control.invalid && (control.touched || control.dirty || submitted);
  }

  private toDateInput(value: string) {
    if (!value) return '';
    return value.slice(0, 10);
  }
}
