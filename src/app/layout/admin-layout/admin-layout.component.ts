import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarIconComponent } from './sidebar-icon.component';
import { BrandLogoComponent } from '../../shared/brand-logo/brand-logo.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SidebarIconComponent, BrandLogoComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  auth = inject(AuthService);
  menu = [
    { path: '/admin', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/productos', label: 'Productos', icon: 'productos' },
    { path: '/admin/categorias', label: 'Categorías', icon: 'categorias' },
    { path: '/admin/inventario', label: 'Inventario', icon: 'inventario' },
    { path: '/admin/proveedores', label: 'Proveedores', icon: 'proveedores' },
    { path: '/admin/clientes', label: 'Clientes', icon: 'clientes' },
    { path: '/admin/compras', label: 'Compras', icon: 'compras' },
    { path: '/admin/ventas', label: 'Ventas', icon: 'ventas' },
    { path: '/admin/contabilidad', label: 'Contabilidad', icon: 'contabilidad' },
    { path: '/admin/nomina', label: 'Nómina', icon: 'nomina' },
    { path: '/admin/nomina-empleados', label: 'Empleados', icon: 'empleados', indent: true },
    { path: '/admin/nomina-deducciones', label: 'Deducciones', icon: 'deducciones', indent: true },
    { path: '/admin/nomina-seguridad-social', label: 'Seguridad Social', icon: 'seguridad', indent: true },
    { path: '/admin/nomina-pagos', label: 'Pagos Realizados', icon: 'pagos', indent: true },
    { path: '/admin/nomina-provisiones', label: 'Provisiones', icon: 'provisiones', indent: true },
    { path: '/admin/nomina-liquidaciones', label: 'Liquidaciones', icon: 'liquidacion', indent: true },
    { path: '/admin/nomina-parametros', label: 'Parámetros Legales', icon: 'parametros', indent: true },
    { path: '/admin/cuentas-por-cobrar', label: 'Cuentas por Cobrar', icon: 'cobros' },
    { path: '/admin/cuentas-por-cobrar-recordatorios', label: 'Recordatorios', icon: 'recordatorios', indent: true },
    { path: '/admin/cuentas-por-cobrar-reportes', label: 'Reportes', icon: 'reportes', indent: true },
    { path: '/admin/usuarios', label: 'Usuarios', icon: 'usuarios' },
    { path: '/admin/empresa', label: 'Empresa', icon: 'empresa' }
  ];
}
