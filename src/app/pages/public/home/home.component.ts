import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Company } from '../../../core/models';
import { DEFAULT_PUBLIC_COMPANY } from '../../../core/company-defaults';
import { SidebarIconComponent } from '../../../layout/admin-layout/sidebar-icon.component';
import { BrandLogoComponent } from '../../../shared/brand-logo/brand-logo.component';
import { BRAND_IMAGES } from '../../../core/brand-assets';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, SidebarIconComponent, BrandLogoComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  readonly company = signal<Company>(DEFAULT_PUBLIC_COMPANY);
  readonly heroBg = BRAND_IMAGES.heroBg;

  ngOnInit() {
    this.api.getPublic<Company>('company/public').subscribe({
      next: c => this.company.set(c),
      error: () => this.company.set(DEFAULT_PUBLIC_COMPANY)
    });
  }
}
