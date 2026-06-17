import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { InventoryMovement, Product } from '../../../core/models';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, ModuleHeaderComponent],
  templateUrl: './inventory.component.html'
})
export class InventoryComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private navSub?: Subscription;

  products = signal<Product[]>([]);
  movements = signal<InventoryMovement[]>([]);
  productSearch = signal('');
  movementSearch = signal('');
  productPickerOpen = false;
  submitted = false;

  readonly limits = {
    productSearch: 120,
    movementSearch: 120,
    quantity: 1000000,
    notes: 250
  };

  form = this.fb.group({
    productId: [0, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(this.limits.quantity)]],
    type: ['Entrada', Validators.required],
    notes: ['', Validators.maxLength(this.limits.notes)]
  });

  ngOnInit() {
    this.reload();
    this.navSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.reload());
  }

  ngOnDestroy() { this.navSub?.unsubscribe(); }

  reload() {
    this.api.loadList<Product[]>('products', d => this.products.set(d)).subscribe();
    this.api.loadList<InventoryMovement[]>('inventory/movements', d => this.movements.set(d)).subscribe();
  }

  filteredProducts() {
    const term = this.productSearch().trim().toLowerCase();
    if (!term) return this.products();
    return this.products().filter(p => `${p.sku} ${p.name} ${p.categoryName}`.toLowerCase().includes(term));
  }

  visibleProducts() {
    return this.filteredProducts().slice(0, 30);
  }

  productLabel(p: Product) {
    return `${p.sku} - ${p.name} (Stock: ${p.stock})`;
  }

  searchProduct(value: string) {
    this.productSearch.set(value);
    this.form.patchValue({ productId: 0 });
    this.productPickerOpen = true;
  }

  selectProduct(product: Product) {
    this.form.patchValue({ productId: product.id });
    this.productSearch.set(this.productLabel(product));
    this.productPickerOpen = false;
  }

  closeProductPicker() {
    setTimeout(() => this.productPickerOpen = false, 150);
  }

  filteredMovements() {
    const term = this.movementSearch().trim().toLowerCase();
    if (!term) return this.movements();
    return this.movements().filter(m => `${m.productName} ${m.type} ${m.reference ?? ''} ${m.notes ?? ''}`.toLowerCase().includes(term));
  }

  adjust() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const body = {
      ...this.form.getRawValue(),
      notes: this.form.getRawValue().notes?.trim() || null
    };
    this.api
      .run(this.api.post('inventory/adjust', body), {
        success: 'Movimiento de inventario registrado',
        error: 'No se pudo registrar el movimiento'
      })
      .subscribe({
        next: () => {
          this.form.reset({ type: 'Entrada', quantity: 1, productId: 0 });
          this.productSearch.set('');
          this.productPickerOpen = false;
          this.submitted = false;
          this.reload();
        }
      });
  }

  fieldError(name: 'productId' | 'quantity' | 'type' | 'notes') {
    const control = this.form.get(name);
    if (!control || !this.shouldShowError(control)) return '';
    if (control.hasError('required') || control.hasError('min')) {
      if (name === 'productId') return 'Seleccione un producto';
      if (name === 'quantity') return 'Ingrese una cantidad mayor a 0';
      return 'Campo obligatorio';
    }
    if (control.hasError('max')) return `Maximo ${this.limits.quantity}`;
    if (control.hasError('maxlength')) return `Maximo ${this.limits.notes} caracteres`;
    return '';
  }

  private shouldShowError(control: AbstractControl) {
    return control.invalid && (control.touched || control.dirty || this.submitted);
  }
}
