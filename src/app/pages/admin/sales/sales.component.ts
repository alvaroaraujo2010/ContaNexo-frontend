import { Component, ElementRef, ViewChild, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, firstValueFrom, Subscription, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
import { ApiService } from '../../../core/services/api.service';
import { ElectronicInvoicePdfService } from '../../../core/services/electronic-invoice-pdf.service';
import { ToastService } from '../../../core/services/toast.service';
import { Customer, ElectronicInvoice, Product, Sale } from '../../../core/models';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, PercentPipe, ModuleHeaderComponent],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss'
})
export class SalesComponent implements OnInit, OnDestroy {
  @ViewChild('customerSearchInput') private customerSearchInput?: ElementRef<HTMLInputElement>;

  private api = inject(ApiService);
  private invoicePdf = inject(ElectronicInvoicePdfService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private navSub?: Subscription;

  items = signal<Sale[]>([]);
  customers = signal<Customer[]>([]);
  products = signal<Product[]>([]);
  historySearch = signal('');
  invoice = signal<ElectronicInvoice | null>(null);
  invoiceLoading = false;
  lines: { productId: number; quantity: number; unitPrice: number; name: string; stock: number }[] = [];
  selectedCustomer: Customer | null = null;
  selectedProduct: Product | null = null;
  productActiveIndex = 0;
  editingId: number | null = null;
  submitted = false;
  paymentMethods = ['Efectivo', 'Tarjeta', 'Transferencia', 'Credito'];

  readonly limits = {
    search: 120,
    notes: 500,
    quantity: 1000000
  };

  form = this.fb.group({
    saleDate: [this.todayInput()],
    taxRate: [0.19, [Validators.required, Validators.min(0), Validators.max(1)]],
    paymentMethod: ['Efectivo', Validators.required],
    notes: ['', Validators.maxLength(this.limits.notes)],
    productSearch: [''],
    customerSearch: [''],
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(this.limits.quantity)]]
  });

  ngOnInit() {
    this.reload();
    this.navSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.reload());
  }

  ngOnDestroy() { this.navSub?.unsubscribe(); }

  reload() {
    this.api.loadList<Sale[]>('sales', d => this.items.set(d)).subscribe();
    this.api.loadList<Customer[]>('customers', d => this.customers.set(d)).subscribe();
    this.api.loadList<Product[]>('products', d => this.products.set(d)).subscribe();
  }

  filteredSales() {
    const term = this.historySearch().trim().toLowerCase();
    if (!term) return this.items();
    return this.items().filter(s => `${s.documentNumber} ${s.electronicInvoiceNumber ?? ''} ${s.customerName ?? 'Consumidor final'} ${s.paymentMethod} ${s.status} ${s.electronicInvoiceStatus}`.toLowerCase().includes(term));
  }

  filteredProducts() {
    const term = (this.form.controls.productSearch.value ?? '').trim().toLowerCase();
    if (term.length < 2 || this.selectedProductLabelMatches()) return [];
    return this.products()
      .filter(p => p.isActive && `${p.name} ${p.sku}`.toLowerCase().includes(term))
      .slice(0, 8);
  }

  filteredCustomers() {
    const term = (this.form.controls.customerSearch.value ?? '').trim().toLowerCase();
    if (term.length < 2 || this.selectedCustomerLabelMatches()) return [];
    return this.customers()
      .filter(c => c.isActive && `${c.name} ${c.taxId ?? ''}`.toLowerCase().includes(term))
      .slice(0, 6);
  }

  selectCustomer(customer: Customer | null) {
    this.selectedCustomer = customer;
    this.form.patchValue({ customerSearch: customer ? customer.name : '' });
  }

  clearSelectedProductOnInput() {
    if (!this.selectedProductLabelMatches()) this.selectedProduct = null;
    this.productActiveIndex = 0;
  }

  clearSelectedCustomerOnInput() {
    if (!this.selectedCustomerLabelMatches()) this.selectedCustomer = null;
  }

  moveProductSelection(delta: number) {
    const products = this.filteredProducts();
    if (!products.length) return;
    const next = this.productActiveIndex + delta;
    this.productActiveIndex = (next + products.length) % products.length;
  }

  async selectActiveProduct() {
    const product = this.filteredProducts()[this.productActiveIndex];
    if (!product) return;
    await this.selectProduct(product);
  }

  async selectProduct(product: Product) {
    if (product.stock <= 0) {
      await Swal.fire('Sin inventario', `${product.name} no tiene unidades disponibles.`, 'info');
      return;
    }

    this.selectedProduct = product;
    this.form.patchValue({ productSearch: `${product.sku} - ${product.name}`, quantity: 1 });

    const result = await Swal.fire({
      title: product.name,
      text: `Disponible: ${product.stock}`,
      input: 'number',
      inputLabel: 'Cantidad a vender',
      inputValue: 1,
      inputAttributes: { min: '1', max: String(product.stock), step: '1' },
      showCancelButton: true,
      confirmButtonText: 'Usar cantidad',
      cancelButtonText: 'Cancelar',
      preConfirm: value => {
        const quantity = Number(value);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          Swal.showValidationMessage('Ingrese una cantidad valida');
          return false;
        }
        if (quantity > product.stock) {
          Swal.showValidationMessage(`Solo hay ${product.stock} unidades disponibles`);
          return false;
        }
        return quantity;
      }
    });

    if (result.isConfirmed) {
      this.form.patchValue({ quantity: Number(result.value) });
    }
  }

  addSelectedProduct() {
    const product = this.selectedProduct;
    const quantity = Number(this.form.controls.quantity.value ?? 0);
    if (this.addProductLine(product, quantity)) this.clearProductEntry();
  }

  private addProductLine(product: Product | null, quantity: number) {
    if (!product) {
      this.toast.info('Seleccione un producto de la lista.');
      return false;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      this.toast.info('Ingrese una cantidad valida.');
      return false;
    }
    if (quantity > product.stock) {
      this.toast.error(`Solo hay ${product.stock} unidades disponibles.`);
      return false;
    }

    const existing = this.lines.find(l => l.productId === product.id);
    if (existing) {
      const nextQuantity = existing.quantity + quantity;
      if (nextQuantity > product.stock) {
        this.toast.error(`Ya agrego ${existing.quantity}. Disponible total: ${product.stock}.`);
        return false;
      }
      this.lines = this.lines.map(line =>
        line.productId === product.id ? { ...line, quantity: nextQuantity } : line
      );
    } else {
      this.lines = [
        ...this.lines,
        { productId: product.id, quantity, unitPrice: product.unitPrice, name: product.name, stock: product.stock }
      ];
    }
    return true;
  }

  private clearProductEntry() {
    this.selectedProduct = null;
    this.productActiveIndex = 0;
    this.form.patchValue({ productSearch: '', quantity: 1 });
  }

  blockInvalidQuantityKey(event: KeyboardEvent) {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  normalizeQuantityInput() {
    const raw = String(this.form.controls.quantity.value ?? '');
    const digits = raw.replace(/\D/g, '');
    const quantity = digits ? Number(digits) : null;
    const max = this.selectedProduct ? Math.min(this.selectedProduct.stock, this.limits.quantity) : this.limits.quantity;
    this.form.patchValue({ quantity: quantity ? Math.min(quantity, max) : null }, { emitEvent: false });
  }

  setPayment(method: string) {
    this.form.patchValue({ paymentMethod: method });
  }

  removeLine(productId: number) {
    this.lines = this.lines.filter(l => l.productId !== productId);
  }

  edit(sale: Sale) {
    if (sale.status !== 'Borrador') return;
    this.editingId = sale.id;
    this.submitted = false;
    this.selectedCustomer = sale.customerId ? this.customers().find(c => c.id === sale.customerId) ?? null : null;
    const taxRate = sale.subtotal > 0 ? Number((sale.tax / sale.subtotal).toFixed(2)) : 0;
    this.form.reset({
      saleDate: this.toDateInput(sale.saleDate),
      taxRate,
      paymentMethod: sale.paymentMethod || 'Efectivo',
      notes: sale.notes ?? '',
      productSearch: '',
      customerSearch: this.selectedCustomer?.name ?? '',
    });
    this.lines = sale.details.map(d => {
      const product = this.products().find(p => p.id === d.productId);
      return {
        productId: d.productId,
        quantity: d.quantity,
        unitPrice: d.unitPrice * (1 + taxRate),
        name: d.productName,
        stock: product?.stock ?? d.quantity
      };
    });
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  cancelForm() {
    this.editingId = null;
    this.submitted = false;
    this.lines = [];
    this.selectedCustomer = null;
    this.selectedProduct = null;
    this.form.reset({ saleDate: this.todayInput(), taxRate: 0.19, paymentMethod: 'Efectivo', notes: '', productSearch: '', customerSearch: '', quantity: 1 });
  }

  subtotal() {
    const rate = Number(this.form.controls.taxRate.value ?? 0);
    return this.total() / (1 + rate);
  }

  tax() {
    return this.total() - this.subtotal();
  }

  total() {
    return this.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  }

  async saveDraft() {
    this.submitted = true;
    if (!this.lines.length || this.form.controls.taxRate.invalid || this.form.controls.paymentMethod.invalid || this.form.controls.notes.invalid) {
      this.form.markAllAsTouched();
      if (!this.lines.length) this.toast.info('Agregue al menos un producto.');
      return;
    }

    this.api
      .run(this.saveRequest(), {
        success: this.editingId ? 'Borrador de venta actualizado' : 'Borrador de venta creado',
        error: 'No se pudo guardar la venta'
      })
      .subscribe({ next: () => this.afterSave() });
  }

  async saveAndComplete() {
    this.submitted = true;
    if (!this.lines.length || this.form.controls.taxRate.invalid || this.form.controls.paymentMethod.invalid || this.form.controls.notes.invalid) {
      this.form.markAllAsTouched();
      if (!this.lines.length) this.toast.info('Agregue al menos un producto.');
      return;
    }

    if (!(await this.confirmCustomerBeforeComplete())) return;

    try {
      const sale = await firstValueFrom(this.saveRequest().pipe(switchMap(s => this.api.post<Sale>(`sales/${s.id}/complete`, {}))));
      this.toast.success('Venta completada e inventario actualizado');
      await this.afterSaleActions(sale);
      this.afterSave();
    } catch (error: any) {
      await Swal.fire('Error', error?.error?.message ?? 'No se pudo completar la venta', 'error');
    }
  }

  async complete(sale: Sale) {
    if (!sale.customerId) {
      const customer = await Swal.fire({
        icon: 'question',
        title: 'Cliente de la venta',
        text: 'Desea seleccionar un cliente antes de completar? Si no, se usara Consumidor final.',
        showCancelButton: true,
        confirmButtonText: 'Seleccionar cliente',
        cancelButtonText: 'Consumidor final'
      });
      if (customer.isConfirmed) {
        this.edit(sale);
        setTimeout(() => this.customerSearchInput?.nativeElement.focus());
        return;
      }
    }

    this.api
      .run(this.api.post<Sale>(`sales/${sale.id}/complete`, {}), {
        success: 'Venta completada e inventario actualizado',
        error: 'No se pudo completar la venta'
      })
      .subscribe({ next: () => this.reload() });
  }

  cancelSale(sale: Sale) {
    this.api
      .run(this.api.post<Sale>(`sales/${sale.id}/cancel`, {}), {
        success: 'Venta anulada',
        error: 'No se pudo anular la venta'
      })
      .subscribe({ next: () => this.reload() });
  }

  invoiceLabel(sale: Sale) {
    if (sale.electronicInvoiceStatus === 'Emitida') return sale.electronicInvoiceNumber || 'Emitida';
    if (sale.status !== 'Completada') return 'No aplica';
    return 'Sin emitir';
  }

  invoiceClass(sale: Sale) {
    if (sale.electronicInvoiceStatus === 'Emitida') return 'fe-badge fe-badge--ok';
    if (sale.status !== 'Completada') return 'fe-badge fe-badge--muted';
    return 'fe-badge';
  }

  statusClass(status: string) {
    if (status === 'Completada') return 'badge-ok';
    if (status === 'Anulada') return 'badge-danger';
    return 'badge-warn';
  }

  private async afterSaleActions(sale: Sale) {
    const wantsElectronic = await Swal.fire({
      icon: 'question',
      title: 'Factura electronica',
      text: 'Desea emitir factura electronica para esta venta?',
      showCancelButton: true,
      confirmButtonText: 'Si, emitir',
      cancelButtonText: 'No por ahora'
    });

    let invoice = await firstValueFrom(this.api.get<ElectronicInvoice>(`sales/${sale.id}/electronic-invoice`));
    if (wantsElectronic.isConfirmed) {
      invoice = await firstValueFrom(this.api.post<ElectronicInvoice>(`sales/${sale.id}/electronic-invoice/emit`, {}));
      this.toast.success('Factura electronica emitida');
    }

    const wantsPrint = await Swal.fire({
      icon: 'question',
      title: 'Imprimir factura',
      text: 'Puede imprimir o guardar el PDF de la venta.',
      showCancelButton: true,
      confirmButtonText: 'Imprimir',
      cancelButtonText: 'No imprimir'
    });

    if (wantsPrint.isConfirmed) {
      this.invoicePdf.print(invoice);
      this.toast.info('Se abrio la factura en PDF para imprimir');
    }
  }

  openInvoice(sale: Sale) {
    if (sale.status !== 'Completada') {
      this.toast.info('La factura electronica solo aplica para ventas completadas.');
      return;
    }
    this.invoiceLoading = true;
    this.api.get<ElectronicInvoice>(`sales/${sale.id}/electronic-invoice`).subscribe({
      next: inv => {
        this.invoice.set(inv);
        this.invoiceLoading = false;
      },
      error: () => {
        this.invoiceLoading = false;
      }
    });
  }

  emitInvoice() {
    const inv = this.invoice();
    if (!inv || inv.electronicInvoiceStatus === 'Emitida') return;
    this.api
      .run(this.api.post<ElectronicInvoice>(`sales/${inv.saleId}/electronic-invoice/emit`, {}), {
        success: 'Factura electronica emitida y asiento contable generado',
        error: 'No se pudo emitir la factura'
      })
      .subscribe({
        next: updated => {
          this.invoice.set(updated);
          this.reload();
        }
      });
  }

  closeInvoice() {
    this.invoice.set(null);
  }

  printPdf() {
    const inv = this.invoice();
    if (!inv) return;
    this.invoicePdf.print(inv);
    this.toast.info('Se abrio la factura en PDF para imprimir');
  }

  downloadPdf() {
    const inv = this.invoice();
    if (!inv) return;
    this.invoicePdf.download(inv);
    this.toast.success(`PDF guardado: ${inv.electronicInvoiceNumber || inv.documentNumber}.pdf`);
  }

  private saveRequest() {
    const v = this.form.getRawValue();
    const payload = {
      customerId: this.selectedCustomer?.id ?? null,
      saleDate: v.saleDate || null,
      taxRate: v.taxRate ?? 0,
      paymentMethod: v.paymentMethod || 'Efectivo',
      notes: v.notes?.trim() || null,
      details: this.lines.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: this.netUnitPrice(l.unitPrice) }))
    };

    return this.editingId
      ? this.api.put<Sale>(`sales/${this.editingId}`, payload)
      : this.api.post<Sale>('sales', payload);
  }

  private afterSave() {
    this.cancelForm();
    this.reload();
  }

  private async confirmCustomerBeforeComplete() {
    if (this.selectedCustomer) return true;
    const result = await Swal.fire({
      icon: 'question',
      title: 'Cliente de la venta',
      text: 'Desea seleccionar un cliente antes de completar? Si no, se usara Consumidor final.',
      showCancelButton: true,
      confirmButtonText: 'Seleccionar cliente',
      cancelButtonText: 'Consumidor final'
    });

    if (!result.isConfirmed) {
      this.selectCustomer(null);
      return true;
    }

    setTimeout(() => this.customerSearchInput?.nativeElement.focus());
    return false;
  }

  private netUnitPrice(unitPriceWithTax: number) {
    const rate = Number(this.form.controls.taxRate.value ?? 0);
    return unitPriceWithTax / (1 + rate);
  }

  private selectedCustomerLabelMatches() {
    if (!this.selectedCustomer) return false;
    return (this.form.controls.customerSearch.value ?? '') === this.selectedCustomer.name;
  }

  private selectedProductLabelMatches() {
    if (!this.selectedProduct) return false;
    return (this.form.controls.productSearch.value ?? '') === `${this.selectedProduct.sku} - ${this.selectedProduct.name}`;
  }

  private toDateInput(value: string) {
    if (!value) return '';
    return value.slice(0, 10);
  }

  private todayInput() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }
}
