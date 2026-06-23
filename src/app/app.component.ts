import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<h1>Repro App - Case 177927099300547</h1><router-outlet />`,
  styles: [`
    :host {
      @apply flex flex-col items-center justify-center min-h-screen bg-gray-100;
    }
    h1 {
      @apply text-2xl font-bold text-blue-600;
    }
  `]
})
export class AppComponent {
  title = 'repro-app';
}
