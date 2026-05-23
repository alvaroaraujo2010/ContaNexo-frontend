import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Customer, Product, Sale } from '../../../core/models';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, ModuleHeaderComponent],
  templateUrl: './sales.component.html'
})
export class SalesComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private navSub?: Subscription;

  items = signal<Sale[]>([]);
  customers = signal<Customer[]>([]);
  products = signal<Product[]>([]);
  showForm = false;
  lines: { productId: number; quantity: number; unitPrice: number; name: string }[] = [];

  form = this.fb.group({
    customerId: [0],
    taxRate: [0.19],
    paymentMethod: ['Efectivo'],
    notes: [''],
    productId: [0],
    quantity: [1],
    unitPrice: [0]
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

  addLine() {
    const v = this.form.getRawValue();
    const prod = this.products().find(p => p.id === Number(v.productId));
    if (!prod || !v.quantity) return;
    this.lines.push({ productId: prod.id, quantity: v.quantity!, unitPrice: v.unitPrice || prod.unitPrice, name: prod.name });
  }

  save() {
    const v = this.form.getRawValue();
    if (!this.lines.length) return;
    const req = this.api.post('sales', {
      customerId: Number(v.customerId) || null,
      taxRate: v.taxRate,
      paymentMethod: v.paymentMethod,
      notes: v.notes,
      details: this.lines.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice }))
    });
    this.api
      .run(req, {
        success: 'Venta registrada correctamente',
        error: 'No se pudo registrar la venta'
      })
      .subscribe({
        next: () => {
          this.showForm = false;
          this.lines = [];
          this.reload();
        }
      });
  }
}
