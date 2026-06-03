import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ModuleHeaderComponent } from '../../../../shared/module-header/module-header.component';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AccountsReceivableService } from '../../../../core/services/accounts-receivable.service';
import { Reminder } from '../../../../core/models';

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

  sendReminder(reminder: Reminder) {
    if (confirm(`¿Enviar recordatorio para la factura ${reminder.invoiceNumber}?`)) {
      this.arService.sendReminder(reminder.id).subscribe({
        next: () => {
          alert('Recordatorio enviado exitosamente');
          this.reload();
        },
        error: () => alert('Error al enviar recordatorio')
      });
    }
  }

  getFilteredReminders(): Reminder[] {
    const status = this.filterStatus();
    if (!status) return this.reminders();
    return this.reminders().filter(r => r.status === status);
  }
}
