import { Component, Input } from '@angular/core';
import { BRAND_IMAGES } from '../../core/brand-assets';

@Component({
  selector: 'app-module-header',
  standalone: true,
  template: `
    <header class="module-hero">
      <div class="module-hero__accent"></div>
      <img class="module-hero__watermark" [src]="iconWhite" alt="" aria-hidden="true" />
      <div class="module-hero__inner">
        <div class="module-hero__text">
          <span class="module-hero__badge">{{ badge }}</span>
          <h1>{{ title }}</h1>
          @if (subtitle) {
            <p>{{ subtitle }}</p>
          }
        </div>
        <div class="module-hero__actions">
          <ng-content />
        </div>
      </div>
    </header>
  `
})
export class ModuleHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() badge = 'ContaNexo';
  readonly iconWhite = BRAND_IMAGES.iconWhite;
}
