import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, ModuleHeaderComponent],
  template: `
<div class="module-page">
  <app-module-header title="Auditoría" subtitle="Registro de cambios en el sistema" badge="Administración" />

  <div style="display:flex;gap:0.5rem;margin-bottom:1rem">
    <select #entity (change)="entityFilter=entity.value; load()">
      <option value="">Todas las entidades</option>
      @for (e of entities; track e) { <option [value]="e">{{e}}</option> }
    </select>
    <select #op (change)="opFilter=op.value; load()">
      <option value="">Todas las operaciones</option>
      <option value="Crear">Crear</option>
      <option value="Modificar">Modificar</option>
      <option value="Eliminar">Eliminar</option>
    </select>
    <span style="margin-left:auto;align-self:center;color:var(--text-muted);font-size:0.85rem">Total: {{total}}</span>
  </div>

  <div class="data-card">
    <table class="data">
      <thead><tr><th>Fecha</th><th>Usuario</th><th>Entidad</th><th>Operación</th><th>Campos</th></tr></thead>
      <tbody>
        @for (l of logs; track l.id) {
        <tr>
          <td>{{l.createdAt | date:'dd/MM/yyyy HH:mm'}}</td>
          <td>{{l.userName || '—'}}</td>
          <td>{{l.entityName}}</td>
          <td><span class="badge" [class.badge-ok]="l.operationType==='Crear'" [class.badge-warn]="l.operationType==='Modificar'" [class.badge-danger]="l.operationType==='Eliminar'">{{l.operationType}}</span></td>
          <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{l.changedProperties || '—'}}</td>
        </tr>
        } @empty {
        <tr><td colspan="5"><div class="empty-state"><strong>Sin registros de auditoría</strong></div></td></tr>
        }
      </tbody>
    </table>
  </div>

  <div style="display:flex;justify-content:center;gap:0.5rem;margin-top:1rem">
    <button class="btn" [disabled]="page<=1" (click)="page=page-1; load()">Anterior</button>
    <span style="align-self:center">Pág. {{page}} de {{totalPages}}</span>
    <button class="btn" [disabled]="page>=totalPages" (click)="page=page+1; load()">Siguiente</button>
  </div>
</div>
  `
})
export class AuditLogComponent implements OnInit {
  private api = inject(ApiService);
  logs: any[] = [];
  total = 0;
  page = 1;
  pageSize = 50;
  entityFilter = '';
  opFilter = '';
  entities = ['Product', 'Sale', 'Purchase', 'Category', 'Supplier', 'Customer', 'Account', 'JournalEntry', 'Employee', 'Payroll', 'User', 'CompanySettings', 'ArInvoice'];

  get totalPages() { return Math.max(1, Math.ceil(this.total / this.pageSize)); }

  ngOnInit() { this.load(); }

  load() {
    let path = `auditLog?page=${this.page}&pageSize=${this.pageSize}`;
    if (this.entityFilter) path += `&entity=${this.entityFilter}`;
    if (this.opFilter) path += `&operation=${this.opFilter}`;
    this.api.get<any>(path).subscribe(r => {
      this.logs = r.items;
      this.total = r.totalCount;
    });
  }
}
