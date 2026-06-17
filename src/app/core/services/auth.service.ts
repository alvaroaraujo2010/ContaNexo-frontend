import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { LoginResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  user = signal<{ fullName: string; email: string; role: string; tenantId: number; tenantCode: string; businessName: string; plan: string } | null>(this.loadUser());
  enabledModules = signal<string[]>([]);

  login(businessCode: string, username: string, password: string) {
    return this.api.postPublic<LoginResponse>('auth/login', { businessCode, username, password }).pipe(
      tap(res => {
        localStorage.setItem('contanexo_token', res.token);
        const user = {
          fullName: res.fullName,
          email: res.email,
          role: res.role,
          tenantId: res.tenantId,
          tenantCode: res.tenantCode,
          businessName: res.businessName,
          plan: res.plan
        };
        localStorage.setItem('contanexo_user', JSON.stringify(user));
        this.user.set(user);
      })
    );
  }

  loadPlanModules() {
    if (this.user()?.role === 'SuperUsuario') {
      this.enabledModules.set([]); // SuperUsuario ve todo
      return;
    }
    this.api.get<string[]>('plan-modules/my-plan').subscribe(modules => this.enabledModules.set(modules));
  }

  logout() {
    localStorage.removeItem('contanexo_token');
    localStorage.removeItem('contanexo_user');
    this.user.set(null);
    this.enabledModules.set([]);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('contanexo_token');
  }

  hasRole(roles?: string[]): boolean {
    if (!roles?.length) return true;
    const role = this.user()?.role;
    if (!role) return false;
    if (role === 'SuperUsuario') return true;
    return roles.includes(role);
  }

  isModuleEnabled(moduleKey?: string): boolean {
    if (!moduleKey) return true;
    const role = this.user()?.role;
    if (role === 'SuperUsuario') return true;
    const modules = this.enabledModules();
    if (modules.length === 0) return true; // aún no cargados
    return modules.includes(moduleKey);
  }

  private loadUser() {
    const raw = localStorage.getItem('contanexo_user');
    return raw ? JSON.parse(raw) : null;
  }
}
