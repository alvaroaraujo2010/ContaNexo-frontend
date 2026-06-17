import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { User } from '../../../core/models';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [ReactiveFormsModule, ModuleHeaderComponent],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private navSub?: Subscription;

  items = signal<User[]>([]);
  search = signal('');
  showForm = false;
  editingId: number | null = null;

  form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    role: ['Vendedor', Validators.required],
    isActive: [true]
  });

  ngOnInit() {
    this.reload();
    this.navSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.reload());
  }

  ngOnDestroy() { this.navSub?.unsubscribe(); }

  reload() {
    this.api.loadList<User[]>('users', d => this.items.set(d)).subscribe();
  }

  filteredItems() {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.items();
    return this.items().filter(u => `${u.fullName} ${u.email} ${u.role}`.toLowerCase().includes(term));
  }

  save() {
    if (this.form.invalid) return;
    const payload = this.form.getRawValue();
    const request = this.editingId
      ? this.api.put(`users/${this.editingId}`, { ...payload, password: payload.password || null })
      : this.api.post('users', payload);

    this.api
      .run(request, {
        success: this.editingId ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente',
        error: this.editingId ? 'No se pudo actualizar el usuario' : 'No se pudo crear el usuario'
      })
      .subscribe({
        next: () => {
          this.cancelEdit();
          this.reload();
        }
      });
  }

  edit(user: User) {
    this.editingId = user.id;
    this.showForm = true;
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.form.reset({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive
    });
  }

  newUser() {
    this.editingId = null;
    this.showForm = true;
    this.form.controls.password.setValidators(Validators.required);
    this.form.controls.password.updateValueAndValidity();
    this.form.reset({ role: 'Vendedor', isActive: true });
  }

  cancelEdit() {
    this.editingId = null;
    this.showForm = false;
    this.form.controls.password.setValidators(Validators.required);
    this.form.controls.password.updateValueAndValidity();
    this.form.reset({ role: 'Vendedor', isActive: true });
  }
}
