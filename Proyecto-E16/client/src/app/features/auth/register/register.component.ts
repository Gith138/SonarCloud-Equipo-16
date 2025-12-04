import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  username_ = '';
  email_ = '';
  password_ = '';
  confirmPassword_ = '';
  acceptTerms = false;
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  formValid(): boolean {
    return (
      this.username_.trim() !== '' &&
      this.email_.trim() !== '' &&
      this.password_.length >= 6 &&
      this.password_ === this.confirmPassword_ &&
      this.acceptTerms
    );
  }

  onRegister() {
    if (!this.formValid()) {
      this.errorMessage = 'Por favor completa todos los campos correctamente.';
      return;
    }

    this.errorMessage = '';

    const userData = {
      username_: this.username_,
      email_: this.email_,
      password_: this.password_,
    };

    // Llamada al backend
    this.http.post('http://localhost:3000/api/auth/register', userData)
      .subscribe({
        next: (res: any) => {
          console.log('Usuario registrado:', res);
          // Redirigir al login
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('Error al registrar:', err);
          this.errorMessage = err.error?.message || 'Error al registrar usuario';
        }
      });
  }
}
