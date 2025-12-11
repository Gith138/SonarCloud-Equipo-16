import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient, private router: Router) {}

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(credentials: { email_: string; password_: string }): Observable<any> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, credentials).pipe(
      // El operador 'tap' nos permite hacer efectos secundarios (guardar token) sin alterar la respuesta
      tap(response => {
        sessionStorage.setItem('token', response.token);
        localStorage.removeItem('token');
      })
    );
  }

  logout() {
    sessionStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
  
  isLoggedIn(): boolean {
    return !!sessionStorage.getItem('token');
  }
}