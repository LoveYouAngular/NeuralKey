import { Component, signal } from '@angular/core';
import { Login } from './login'; // Import Login component

@Component({
  selector: 'app-root',
  imports: [Login], // Add Login to imports
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('web-login');
}
