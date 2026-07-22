import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { SidebarIconComponent } from './sidebar-icon.component';
import { BrandLogoComponent } from '../../shared/brand-logo/brand-logo.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SidebarIconComponent, BrandLogoComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);

  ngOnInit() {
    this.auth.loadPlanModules();
  }

  menu = [
    { path: '/admin', label: 'Dashboard', icon: 'dashboard', roles: ['Administrador', 'Contador', 'Vendedor', 'Almacen', 'SuperUsuario'], moduleKey: 'dashboard' },
    { path: '/admin/productos', label: 'Productos', icon: 'productos', roles: ['Administrador', 'Almacen', 'SuperUsuario'], moduleKey: 'products' },
    { path: '/admin/categorias', label: 'Categorías', icon: 'categorias', roles: ['Administrador', 'Almacen', 'SuperUsuario'], moduleKey: 'categories' },
    { path: '/admin/inventario', label: 'Inventario', icon: 'inventario', roles: ['Administrador', 'Almacen', 'SuperUsuario'], moduleKey: 'inventory' },
    { path: '/admin/proveedores', label: 'Proveedores', icon: 'proveedores', roles: ['Administrador', 'Almacen', 'SuperUsuario'], moduleKey: 'suppliers' },
    { path: '/admin/clientes', label: 'Clientes', icon: 'clientes', roles: ['Administrador', 'Vendedor', 'SuperUsuario'], moduleKey: 'customers' },
    { path: '/admin/compras', label: 'Compras', icon: 'compras', roles: ['Administrador', 'Almacen', 'SuperUsuario'], moduleKey: 'purchases' },
    { path: '/admin/ventas', label: 'Ventas', icon: 'ventas', roles: ['Administrador', 'Vendedor', 'SuperUsuario'], moduleKey: 'sales' },
    { path: '/admin/contabilidad', label: 'Contabilidad', icon: 'contabilidad', roles: ['Administrador', 'Contador', 'SuperUsuario'], moduleKey: 'accounting' },
    { path: '/admin/nomina', label: 'Nómina', icon: 'nomina', roles: ['Administrador', 'Contador', 'SuperUsuario'], moduleKey: 'payroll' },
    { path: '/admin/nomina-empleados', label: 'Empleados', icon: 'empleados', indent: true, roles: ['Administrador', 'Contador', 'SuperUsuario'], moduleKey: 'payroll-employees' },
    { path: '/admin/nomina-deducciones', label: 'Deducciones', icon: 'deducciones', indent: true, roles: ['Administrador', 'SuperUsuario'], moduleKey: 'payroll-deductions' },
    { path: '/admin/nomina-seguridad-social', label: 'Seguridad Social', icon: 'seguridad', indent: true, roles: ['Administrador', 'Contador', 'SuperUsuario'], moduleKey: 'payroll-social-security' },
    { path: '/admin/nomina-pagos', label: 'Pagos Realizados', icon: 'pagos', indent: true, roles: ['Administrador', 'Contador', 'SuperUsuario'], moduleKey: 'payroll-payments' },
    { path: '/admin/nomina-provisiones', label: 'Provisiones', icon: 'provisiones', indent: true, roles: ['Administrador', 'Contador', 'SuperUsuario'], moduleKey: 'payroll-provisions' },
    { path: '/admin/nomina-liquidaciones', label: 'Liquidaciones', icon: 'liquidacion', indent: true, roles: ['Administrador', 'Contador', 'SuperUsuario'], moduleKey: 'payroll-settlements' },
    { path: '/admin/nomina-parametros', label: 'Parámetros Legales', icon: 'parametros', indent: true, roles: ['Administrador', 'SuperUsuario'], moduleKey: 'payroll-parameters' },
    { path: '/admin/cuentas-por-cobrar', label: 'Cuentas por Cobrar', icon: 'cobros', roles: ['Administrador', 'Contador', 'Vendedor', 'SuperUsuario'], moduleKey: 'accounts-receivable' },
    { path: '/admin/cuentas-por-cobrar-recordatorios', label: 'Recordatorios', icon: 'recordatorios', indent: true, roles: ['Administrador', 'Contador', 'Vendedor', 'SuperUsuario'], moduleKey: 'accounts-receivable-reminders' },
    { path: '/admin/cuentas-por-cobrar-reportes', label: 'Reportes', icon: 'reportes', indent: true, roles: ['Administrador', 'Contador', 'Vendedor', 'SuperUsuario'], moduleKey: 'accounts-receivable-reports' },
    { path: '/admin/negocios', label: 'Negocios', icon: 'empresa', roles: ['Administrador', 'SuperUsuario'], platformOnly: true },
    { path: '/admin/usuarios', label: 'Usuarios', icon: 'usuarios', roles: ['Administrador', 'SuperUsuario'] },
    { path: '/admin/plan-modulos', label: 'Módulos por Plan', icon: 'modulos', roles: ['SuperUsuario'] },
    { path: '/admin/auditoria', label: 'Auditoría', icon: 'auditoria', roles: ['Administrador', 'SuperUsuario'] },
    { path: '/admin/empresa', label: 'Empresa', icon: 'empresa', roles: ['Administrador', 'Contador', 'SuperUsuario'], moduleKey: 'company' }
  ];

  visibleMenu() {
    return this.menu.filter(item =>
      this.auth.hasRole(item.roles)
      && this.auth.isModuleEnabled((item as any).moduleKey)
      && (!item.platformOnly || this.auth.user()?.tenantCode === 'contanexo')
    );
  }

  async changePassword() {
    const result = await Swal.fire({
      title: 'Cambiar contrasena',
      html: `
        <input id="currentPassword" type="password" class="swal2-input" placeholder="Contrasena actual">
        <input id="newPassword" type="password" class="swal2-input" placeholder="Nueva contrasena">
        <input id="confirmPassword" type="password" class="swal2-input" placeholder="Confirmar nueva contrasena">
      `,
      confirmButtonText: 'Actualizar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const currentPassword = (document.getElementById('currentPassword') as HTMLInputElement).value;
        const newPassword = (document.getElementById('newPassword') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;
        if (!currentPassword || !newPassword || !confirmPassword) {
          Swal.showValidationMessage('Complete todos los campos');
          return false;
        }
        if (newPassword.length < 8) {
          Swal.showValidationMessage('La nueva contrasena debe tener al menos 8 caracteres');
          return false;
        }
        if (newPassword !== confirmPassword) {
          Swal.showValidationMessage('La confirmacion no coincide');
          return false;
        }
        return { currentPassword, newPassword };
      }
    });

    if (!result.isConfirmed || !result.value) return;
    this.api.post('auth/change-password', result.value).subscribe({
      next: () => Swal.fire({ icon: 'success', title: 'Contrasena actualizada', timer: 1600, showConfirmButton: false }),
      error: e => Swal.fire('Error', e?.error?.message ?? 'No se pudo actualizar la contrasena', 'error')
    });
  }
}
