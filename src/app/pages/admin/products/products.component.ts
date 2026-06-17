import { Component, ElementRef, HostListener, ViewChild, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Category, Product } from '../../../core/models';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CurrencyPipe, ModuleHeaderComponent],
  templateUrl: './products.component.html'
})
export class ProductsComponent implements OnInit, OnDestroy {
  @ViewChild('productForm') private productForm?: ElementRef<HTMLElement>;

  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private navSub?: Subscription;

  items = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  search = signal('');
  showForm = false;
  editingId: number | null = null;
  saving = false;

  form = this.fb.group({
    sku: ['', Validators.required],
    name: ['', Validators.required],
    description: [''],
    categoryId: [0, Validators.min(1)],
    unitCost: [0],
    unitPrice: [0],
    stock: [0, Validators.min(0)],
    minStock: [5],
    unit: ['UND'],
    isActive: [true]
  });

  ngOnInit() {
    this.reload();
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.reload());
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
  }

  @HostListener('window:focus')
  onWindowFocus() {
    this.reloadProducts();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.visibilityState === 'visible') this.reloadProducts();
  }

  reload() {
    this.reloadProducts();
    this.api.loadList<Category[]>('categories', data => this.categories.set(data)).subscribe();
  }

  reloadProducts() {
    this.api.loadList<Product[]>('products', data => this.items.set([...data])).subscribe();
  }

  filteredItems() {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.items();
    return this.items().filter(p => `${p.sku} ${p.name} ${p.categoryName}`.toLowerCase().includes(term));
  }

  displayStock(p: Product) {
    return this.effectiveStock(p);
  }

  isLowStock(p: Product) {
    return this.effectiveStock(p) <= p.minStock;
  }

  edit(p: Product) {
    const legacyStock = this.legacyStockFromUnit(p);
    this.editingId = p.id;
    this.showForm = true;
    this.form.patchValue({
      sku: p.sku,
      name: p.name,
      description: p.description || '',
      categoryId: p.categoryId,
      unitCost: p.unitCost,
      unitPrice: p.unitPrice,
      stock: this.effectiveStock(p),
      minStock: p.minStock,
      unit: legacyStock !== null ? 'UND' : p.unit,
      isActive: p.isActive
    });
    setTimeout(() => this.productForm?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  save() {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const body = this.normalizeBody(this.form.getRawValue());
    const req = this.editingId
      ? this.api.put<Product>(`products/${this.editingId}`, body)
      : this.api.post<Product>('products', body);

    this.api
      .run(req, {
        success: this.editingId ? 'Producto actualizado correctamente' : 'Producto creado correctamente',
        error: 'No se pudo guardar el producto'
      })
      .subscribe({
        next: product => {
          const desiredStock = Number(body.stock ?? 0);
          if (product.stock !== desiredStock) {
            this.api.post('inventory/adjust', {
              productId: product.id,
              quantity: desiredStock,
              type: 'Ajuste',
              notes: 'Ajuste desde productos'
            }).subscribe({
              next: () => this.finishSave({ ...product, stock: desiredStock, lowStock: desiredStock <= product.minStock }),
              error: () => {
                this.saving = false;
                this.reloadProducts();
              }
            });
            return;
          }

          this.finishSave(product);
        },
        error: () => {
          this.saving = false;
        }
      });
  }

  private finishSave(product: Product) {
    this.items.update(items => {
      const exists = items.some(item => item.id === product.id);
      return exists
        ? items.map(item => item.id === product.id ? product : item)
        : [...items, product].sort((a, b) => a.name.localeCompare(b.name));
    });
    this.showForm = false;
    this.editingId = null;
    this.form.reset({ stock: 0, minStock: 5, unit: 'UND', categoryId: 0, isActive: true });
    this.saving = false;
    this.reloadProducts();
  }

  private normalizeBody(body: typeof this.form.value) {
    return {
      ...body,
      stock: Math.max(0, Number(body.stock ?? 0)),
      minStock: Math.max(0, Number(body.minStock ?? 0)),
      unit: String(body.unit || 'UND').trim() || 'UND'
    };
  }

  private effectiveStock(p: Product) {
    return p.stock === 0 ? this.legacyStockFromUnit(p) ?? p.stock : p.stock;
  }

  private legacyStockFromUnit(p: Product) {
    const unitAsNumber = Number(p.unit);
    return p.stock === 0 && Number.isInteger(unitAsNumber) && unitAsNumber > 0 ? unitAsNumber : null;
  }
}
