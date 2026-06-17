import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';
import Swal from 'sweetalert2';

interface ModuleRow {
  id: number;
  plan: string;
  moduleKey: string;
  isEnabled: boolean;
  changing: boolean;
}

@Component({
  selector: 'app-plan-modules',
  standalone: true,
  imports: [CommonModule, ModuleHeaderComponent],
  templateUrl: './plan-modules.component.html',
  styles: [`
    .plan-modules-table th, .plan-modules-table td { text-align: center; white-space: nowrap; }
    .plan-modules-table th:first-child, .plan-modules-table td:first-child { text-align: left; }
    .plan-modules-table .btn.sm { min-width: 70px; border: none; cursor: pointer; }
  `]
})
export class PlanModulesComponent implements OnInit {
  private api = inject(ApiService);

  modules = signal<ModuleRow[]>([]);
  plans = signal<string[]>([]);
  moduleKeys = signal<string[]>([]);

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<ModuleRow[]>('plan-modules').subscribe(data => {
      const plans = [...new Set(data.map(m => m.plan))].sort();
      const keys = [...new Set(data.map(m => m.moduleKey))].sort();
      this.plans.set(plans);
      this.moduleKeys.set(keys);
      this.modules.set(data.map(m => ({ ...m, changing: false })));
    });
  }

  toggle(module: ModuleRow) {
    this.modules.update(list =>
      list.map(m => m.id === module.id ? { ...m, changing: true } : m)
    );
    this.api.put(`plan-modules/${module.id}`, { isEnabled: !module.isEnabled }).subscribe({
      next: () => {
        this.modules.update(list =>
          list.map(m => m.id === module.id ? { ...m, isEnabled: !m.isEnabled, changing: false } : m)
        );
        Swal.fire({ icon: 'success', title: 'Módulo actualizado', timer: 1200, showConfirmButton: false });
      },
      error: () => {
        this.modules.update(list =>
          list.map(m => m.id === module.id ? { ...m, changing: false } : m)
        );
        Swal.fire('Error', 'No se pudo actualizar el módulo', 'error');
      }
    });
  }

  isEnabled(plan: string, moduleKey: string): boolean {
    return this.modules().some(m => m.plan === plan && m.moduleKey === moduleKey && m.isEnabled);
  }

  isChanging(plan: string, moduleKey: string): boolean {
    return this.modules().some(m => m.plan === plan && m.moduleKey === moduleKey && m.changing);
  }

  moduleLabel(key: string): string {
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      products: 'Productos',
      categories: 'Categorías',
      inventory: 'Inventario',
      suppliers: 'Proveedores',
      customers: 'Clientes',
      purchases: 'Compras',
      sales: 'Ventas',
      accounting: 'Contabilidad',
      payroll: 'Nómina',
      'payroll-employees': 'Empleados',
      'payroll-deductions': 'Deducciones',
      'payroll-social-security': 'Seguridad Social',
      'payroll-payments': 'Pagos Realizados',
      'payroll-provisions': 'Provisiones',
      'payroll-settlements': 'Liquidaciones',
      'payroll-parameters': 'Parámetros Legales',
      'accounts-receivable': 'Cuentas por Cobrar',
      'accounts-receivable-reminders': 'Recordatorios',
      'accounts-receivable-reports': 'Reportes',
      company: 'Empresa'
    };
    return labels[key] || key;
  }

  rowFor(plan: string, moduleKey: string): ModuleRow | undefined {
    return this.modules().find(m => m.plan === plan && m.moduleKey === moduleKey);
  }
}
