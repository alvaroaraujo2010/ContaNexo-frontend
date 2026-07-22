import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { Company, DianResolution } from '../../../core/models';
import { ModuleHeaderComponent } from '../../../shared/module-header/module-header.component';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [ReactiveFormsModule, ModuleHeaderComponent, NgClass, DatePipe],
  templateUrl: './company.component.html',
  styleUrl: './company.component.scss'
})
export class CompanyComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  loading = true;
  activeTab: 'general' | 'dian' = 'general';
  resolutions: DianResolution[] = [];
  showNewResolution = false;

  form = this.fb.group({
    businessName: ['', Validators.required],
    tagline: [''],
    description: [''],
    address: [''],
    phone: [''],
    email: [''],
    website: [''],
    taxId: [''],
    currency: ['COP']
  });

  dianForm = this.fb.group({
    dianSoftwareId: [''],
    dianSoftwarePin: [''],
    dianCertificatePath: [''],
    dianCertificatePassword: [''],
    dianTestMode: [true],
    dianApiUrl: [''],
    municipalityCode: ['11001'],
    economicActivityCode: [''],
    registrationCode: ['']
  });

  resolutionForm = this.fb.group({
    resolutionNumber: ['', Validators.required],
    prefix: ['FE', Validators.required],
    fromNumber: [0, [Validators.required, Validators.min(1)]],
    toNumber: [0, [Validators.required, Validators.min(1)]],
    issuedAt: [''],
    expiresAt: [''],
    technicalKey: ['']
  });

  ngOnInit() {
    this.loadCompany();
    this.loadResolutions();
  }

  private loadCompany() {
    this.api.loadList<Company>('company', c => {
      this.form.patchValue(c);
      this.dianForm.patchValue(c);
      this.loading = false;
    }, () => this.loading = false);
  }

  private loadResolutions() {
    this.api.loadList<DianResolution[]>('dian/resolutions', d => this.resolutions = d ?? []);
  }

  save() {
    if (this.form.invalid) return;
    this.api.run(this.api.put('company', this.form.getRawValue()), {
      success: 'Datos actualizados',
      error: 'No se pudo guardar'
    }).subscribe();
  }

  saveDian() {
    const payload: Record<string, any> = {};
    const raw = this.dianForm.getRawValue();
    Object.keys(raw).forEach(k => { const v = (raw as any)[k]; if (v !== null && v !== '') payload[k] = v; });
    this.api.run(this.api.patch('company/dian', payload), {
      success: 'Configuracion DIAN guardada',
      error: 'No se pudo guardar configuracion DIAN'
    }).subscribe();
  }

  createResolution() {
    if (this.resolutionForm.invalid) return;
    const raw = this.resolutionForm.getRawValue();
    if (!raw.fromNumber || !raw.toNumber) return;
    this.api.run(this.api.post('dian/resolutions', raw), {
      success: 'Resolucion creada',
      error: 'No se pudo crear la resolucion'
    }).subscribe({
      next: () => { this.showNewResolution = false; this.loadResolutions(); }
    });
  }

  deactivateResolution(id: number) {
    this.api.run(this.api.put(`dian/resolutions/${id}/deactivate`, {}), {
      success: 'Resolucion desactivada'
    }).subscribe({ next: () => this.loadResolutions() });
  }

  remaining(r: DianResolution) { return r.toNumber - r.currentNumber; }
}
