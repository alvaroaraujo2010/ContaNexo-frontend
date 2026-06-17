import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BrandLogoComponent } from '../../../shared/brand-logo/brand-logo.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BrandLogoComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  loading = false;

  form = this.fb.group({
    businessCode: ['contanexo', Validators.required],
    username: ['administrador', Validators.required],
    password: ['ingAlv4r0', Validators.required]
  });

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { businessCode, username, password } = this.form.getRawValue();
    this.auth.login(businessCode!, username!, password!).subscribe({
      next: () => {
        this.toast.success('Sesión iniciada correctamente');
        this.router.navigate(['/admin']);
      },
      error: () => {
        this.toast.error('Código de negocio o credenciales inválidas');
        this.loading = false;
      },
      complete: () => this.loading = false
    });
  }
}
