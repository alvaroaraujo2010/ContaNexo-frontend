import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ModuleHeaderComponent } from '../../../../shared/module-header/module-header.component';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AccountsReceivableService } from '../../../../core/services/accounts-receivable.service';
import { Reminder } from '../../../../core/models';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModuleHeaderComponent],
  templateUrl: './reminders.component.html',
  styleUrl: './reminders.component.scss'
})
export class RemindersComponent implements OnInit {
  private arService = inject(AccountsReceivableService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private navSub?: Subscription;

  reminders = signal<Reminder[]>([]);
  filterStatus = signal<string>('');

  ngOnInit() {
    this.reload();
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.reload());
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
  }

  reload() {
    this.arService.getReminders().subscribe({
      next: (data) => this.reminders.set(data),
      error: () => console.error('Error loading reminders')
    });
  }

  async sendReminder(reminder: Reminder) {
    const message = this.buildReminderMessage(reminder);
    const result = await Swal.fire({
      icon: 'question',
      title: 'Enviar recordatorio',
      html: `
        <div style="text-align:left">
          <p><strong>Factura:</strong> ${reminder.invoiceNumber}</p>
          <p><strong>Cliente:</strong> ${reminder.customerName}</p>
          <p><strong>Mensaje:</strong></p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;line-height:1.45">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    this.arService.sendReminder(reminder.id).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Recordatorio enviado', timer: 1800, showConfirmButton: false });
        this.reload();
      },
      error: () => Swal.fire('Error', 'No se pudo enviar el recordatorio.', 'error')
    });
  }

  getFilteredReminders(): Reminder[] {
    const status = this.filterStatus();
    if (!status) return this.reminders();
    return this.reminders().filter(r => r.status === status);
  }

  previewReminder(reminder: Reminder) {
    Swal.fire({
      icon: 'info',
      title: `Recordatorio ${reminder.invoiceNumber}`,
      html: `<div style="text-align:left;line-height:1.5">${this.buildReminderMessage(reminder).replace(/\n/g, '<br>')}</div>`,
      confirmButtonText: 'Cerrar'
    });
  }

  reminderTypeLabel(type: Reminder['reminderType']): string {
    return ({ first: 'Primer aviso', second: 'Segundo aviso', third: 'Tercer aviso', final: 'Aviso final' } as const)[type] ?? type;
  }

  private buildReminderMessage(reminder: Reminder): string {
    const amount = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(reminder.amountPending);
    const urgency = reminder.reminderType === 'final'
      ? 'Le solicitamos priorizar este pago o comunicarse con nosotros para acordar una alternativa.'
      : 'Agradecemos realizar el pago o informarnos la fecha estimada de cancelación.';

    return `Estimado cliente ${reminder.customerName},\n\nRegistramos un saldo pendiente de ${amount} correspondiente a la factura ${reminder.invoiceNumber}, con ${reminder.daysOverdue} día(s) de vencimiento.\n\n${urgency}\n\nEste mensaje fue generado desde ContaNexo para seguimiento de cartera.`;
  }
}
