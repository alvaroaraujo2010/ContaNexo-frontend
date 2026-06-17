import { Routes } from '@angular/router';
import { authGuard, publicGuard, authChildGuard } from './core/guards/auth.guard';
import { HomeComponent } from './pages/public/home/home.component';
import { LoginComponent } from './pages/public/login/login.component';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';
import { ProductsComponent } from './pages/admin/products/products.component';
import { CategoriesComponent } from './pages/admin/categories/categories.component';
import { InventoryComponent } from './pages/admin/inventory/inventory.component';
import { SuppliersComponent } from './pages/admin/suppliers/suppliers.component';
import { CustomersComponent } from './pages/admin/customers/customers.component';
import { PurchasesComponent } from './pages/admin/purchases/purchases.component';
import { SalesComponent } from './pages/admin/sales/sales.component';
import { AccountingComponent } from './pages/admin/accounting/accounting.component';
import { UsersComponent } from './pages/admin/users/users.component';
import { TenantsComponent } from './pages/admin/tenants/tenants.component';
import { CompanyComponent } from './pages/admin/company/company.component';
import { PayrollComponent } from './pages/admin/payroll/payroll.component';
import { PayrollDetailsComponent } from './pages/admin/payroll/payroll-details/payroll-details.component';
import { EmployeesComponent } from './pages/admin/payroll/employees/employees.component';
import { DeductionsComponent } from './pages/admin/payroll/deductions/deductions.component';
import { SocialSecurityComponent } from './pages/admin/payroll/social-security/social-security.component';
import { PaymentRecordsComponent } from './pages/admin/payroll/payment-records/payment-records.component';
import { LegalParametersComponent } from './pages/admin/payroll/legal-parameters/legal-parameters.component';
import { SettlementsComponent } from './pages/admin/payroll/settlements/settlements.component';
import { ProvisionsComponent } from './pages/admin/payroll/provisions/provisions.component';
import { AccountsReceivableComponent } from './pages/admin/accounts-receivable/accounts-receivable.component';
import { InvoiceDetailComponent } from './pages/admin/accounts-receivable/invoice-detail/invoice-detail.component';
import { PaymentTrackingComponent } from './pages/admin/accounts-receivable/payment-tracking/payment-tracking.component';
import { PaymentPlanComponent } from './pages/admin/accounts-receivable/payment-plan/payment-plan.component';
import { RemindersComponent } from './pages/admin/accounts-receivable/reminders/reminders.component';
import { ReportsComponent } from './pages/admin/accounts-receivable/reports/reports.component';

import { PlanModulesComponent } from './pages/admin/plan-modules/plan-modules.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent, canActivate: [publicGuard] },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    children: [
      { path: '', component: DashboardComponent, data: { roles: ['Administrador', 'Contador', 'Vendedor', 'Almacen', 'SuperUsuario'] } },
      { path: 'productos', component: ProductsComponent, data: { roles: ['Administrador', 'Almacen', 'SuperUsuario'] } },
      { path: 'categorias', component: CategoriesComponent, data: { roles: ['Administrador', 'Almacen', 'SuperUsuario'] } },
      { path: 'inventario', component: InventoryComponent, data: { roles: ['Administrador', 'Almacen', 'SuperUsuario'] } },
      { path: 'proveedores', component: SuppliersComponent, data: { roles: ['Administrador', 'Almacen', 'SuperUsuario'] } },
      { path: 'clientes', component: CustomersComponent, data: { roles: ['Administrador', 'Vendedor', 'SuperUsuario'] } },
      { path: 'compras', component: PurchasesComponent, data: { roles: ['Administrador', 'Almacen', 'SuperUsuario'] } },
      { path: 'ventas', component: SalesComponent, data: { roles: ['Administrador', 'Vendedor', 'SuperUsuario'] } },
      { path: 'contabilidad', component: AccountingComponent, data: { roles: ['Administrador', 'Contador', 'SuperUsuario'] } },
      { path: 'usuarios', component: UsersComponent, data: { roles: ['Administrador', 'SuperUsuario'] } },
      { path: 'negocios', component: TenantsComponent, data: { roles: ['Administrador', 'SuperUsuario'] } },
      { path: 'empresa', component: CompanyComponent, data: { roles: ['Administrador', 'Contador', 'SuperUsuario'] } },
      { path: 'plan-modulos', component: PlanModulesComponent, data: { roles: ['SuperUsuario'] } },
      // Módulo de Nómina
      { path: 'nomina', component: PayrollComponent, data: { roles: ['Administrador', 'Contador', 'SuperUsuario'] } },
      { path: 'nomina/:id', component: PayrollDetailsComponent, data: { roles: ['Administrador', 'Contador', 'SuperUsuario'] } },
      { path: 'nomina-empleados', component: EmployeesComponent, data: { roles: ['Administrador', 'Contador', 'SuperUsuario'] } },
      { path: 'nomina-deducciones', component: DeductionsComponent, data: { roles: ['Administrador', 'SuperUsuario'] } },
      { path: 'nomina-seguridad-social', component: SocialSecurityComponent, data: { roles: ['Administrador', 'Contador', 'SuperUsuario'] } },
      { path: 'nomina-pagos', component: PaymentRecordsComponent, data: { roles: ['Administrador', 'Contador', 'SuperUsuario'] } },
      { path: 'nomina-parametros', component: LegalParametersComponent, data: { roles: ['Administrador', 'SuperUsuario'] } },
      { path: 'nomina-provisiones', component: ProvisionsComponent, data: { roles: ['Administrador', 'Contador', 'SuperUsuario'] } },
      { path: 'nomina-liquidaciones', component: SettlementsComponent, data: { roles: ['Administrador', 'Contador', 'SuperUsuario'] } },
      // Módulo de Cuentas por Cobrar
      { path: 'cuentas-por-cobrar', component: AccountsReceivableComponent, data: { roles: ['Administrador', 'Contador', 'Vendedor', 'SuperUsuario'] } },
      { path: 'cuentas-por-cobrar/:id', component: InvoiceDetailComponent, data: { roles: ['Administrador', 'Contador', 'Vendedor', 'SuperUsuario'] } },
      { path: 'cuentas-por-cobrar/pago/:id', component: PaymentTrackingComponent, data: { roles: ['Administrador', 'Contador', 'Vendedor', 'SuperUsuario'] } },
      { path: 'cuentas-por-cobrar/plan-pago/:id', component: PaymentPlanComponent, data: { roles: ['Administrador', 'Contador', 'SuperUsuario'] } },
      { path: 'cuentas-por-cobrar-recordatorios', component: RemindersComponent, data: { roles: ['Administrador', 'Contador', 'Vendedor', 'SuperUsuario'] } },
      { path: 'cuentas-por-cobrar-reportes', component: ReportsComponent, data: { roles: ['Administrador', 'Contador', 'Vendedor', 'SuperUsuario'] } }
    ]
  },
  { path: '**', redirectTo: '' }
];
