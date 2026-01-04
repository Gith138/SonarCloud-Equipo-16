# 🎵 Tempo (Sistema de Recomendación Musical)

**Tempo** es una aplicación web full-stack diseñada para descubrir, escuchar y compartir música de forma social. La plataforma utiliza la API de **YouTube** para la reproducción de contenido y ofrece una experiencia enriquecida mediante la gestión de perfiles, playlists personalizadas y funcionalidades sociales.

---

## 📖 Descripción

Este proyecto soluciona la necesidad de centralizar la música de YouTube en un entorno organizado y social. Permite a los usuarios crear su propia biblioteca musical, personalizar visualmente sus listas y conectar con amigos.

La arquitectura se ha refactorizado para garantizar un manejo eficiente de archivos multimedia y seguridad robusta. El backend gestiona la carga y optimización de imágenes en tiempo real, mientras que el sistema de autenticación incluye recuperación de cuentas segura.

---

## ✨ Funcionalidades Implementadas

### 🎧 Experiencia Musical
* **Reproducción Streaming:** Integración directa con YouTube sin almacenamiento local de audio.
* **Gestión de Canciones:** Búsqueda, añadido y organización de temas en playlists.

### 🖼️ Gestión Multimedia Avanzada (Nuevo)
* **Subida de Imágenes:** Los usuarios pueden subir avatares y portadas de playlists.
* **Procesamiento con Sharp:** Las imágenes se redimensionan y optimizan automáticamente en el servidor antes de guardarse.
* **Sistema de Fallback Inteligente:**
    * 1️⃣ Imagen personalizada subida por el usuario.
    * 2️⃣ Imágenes de alta calidad por defecto (API Unsplash) si no hay subida.
    * 3️⃣ Placeholders visuales para estados vacíos.
* **Limpieza Automática:** El sistema elimina archivos físicos del servidor cuando se borra o cambia una portada.

### 🔐 Seguridad y Autenticación
* **JWT (JSON Web Tokens):** Autenticación segura stateless.
* **Recuperación de Contraseña:** Sistema completo de "Olvidé mi contraseña" mediante envío de emails con tokens temporales de un solo uso.
* **Protección de Rutas:** Guards en Angular y Middleware en Express para proteger endpoints sensibles.

### 🤝 Aspecto Social
* **Sistema de Amigos:** Seguir usuarios y ver su actividad.
* **Playlists Compartidas:** Listas colaborativas o públicas.
* **Notificaciones:** Alertas en tiempo real sobre interacciones.

---

## 🛠️ Stack Tecnológico

### Frontend
* **Framework:** Angular (v17+)
* **Estilos:** Tailwind CSS (Diseño responsive y moderno)
* **Lenguaje:** TypeScript

### Backend
* **Runtime:** Node.js + Express.js
* **Base de Datos:** MongoDB (Mongoose ODM)
* **Multimedia & Archivos:**
    * `multer`: Gestión de subida de archivos `multipart/form-data`.
    * `sharp`: Procesamiento y optimización de imágenes de alto rendimiento.
* **Emails:** `nodemailer` (Configurado con Gmail SMTP + App Passwords).
* **Seguridad:** `bcryptjs`, `jsonwebtoken`.
* **Streaming:** `ytdl-core`, `fluent-ffmpeg`.

### Testing & QA
* **Unitario:** Jest, Supertest.
* **E2E:** Selenium WebDriver.
* **CI/CD:** Scripts de automatización de pruebas.

---

## 🚀 Instalación y Configuración

### 1. Requisitos Previos
* Node.js v20.19.0 (usando `nvm`).
* Instancia de MongoDB corriendo.
* Cuenta de Google con **Verificación en 2 pasos** y **Contraseña de Aplicación** generada (para el envío de correos).

### 2. Configuración del Backend

Debido a que `node_modules` no se sube al repositorio, instala las dependencias incluyendo las nuevas herramientas de imagen y correo:

```bash
cd server

# Instalación completa (Incluye multer, sharp, nodemailer, etc.)
npm install cors dotenv express mongodb jsonwebtoken multer sharp ytdl-core fluent-ffmpeg axios nodemailer bcryptjs

# Instalación de tipos para TypeScript
npm install --save-dev typescript @types/cors @types/express @types/node ts-node @types/multer @types/fluent-ffmpeg @types/axios @types/nodemailer @types/supertest @types/bcryptjs jest ts-jest @types/jest
```

#### ⚙️ Variables de Entorno (.env)

Crea un archivo `.env` en la carpeta `server` con la siguiente estructura:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/music_db
JWT_SECRET=tu_secreto_super_seguro
API_URL=http://localhost:3000

# Configuración de Correo (Gmail)
MAIL_USER=tu_email@gmail.com
MAIL_PASS=xxxx xxxx xxxx xxxx  <-- Tu Contraseña de Aplicación de 16 caracteres
```

Para arrancar el **servidor**:
```bash
npx ts-node src/app.ts
```
###### Nota: El servidor creará automáticamente una carpeta /uploads en la raíz para almacenar las imágenes.

### 3. Configuración del Frontend
```bash
cd client

# Asegurar versión de Node
nvm use 20.19.0

# Instalar dependencias
npm install
npm install tailwindcss postcss autoprefixer

# Arrancar Angular
ng serve -o
```
#### 📂 Estructura de Carpetas Clave
El proyecto sigue una arquitectura clara separando código fuente de archivos estáticos generados por el usuario.
```Plaintext
MusicRecSys/
├── client/                 # Frontend Angular
├── server/
│   ├── src/
│   │   ├── controllers/    # Lógica de negocio (Playlist, Auth, User)
│   │   ├── models/         # Esquemas Mongoose
│   │   ├── routes/         # Definición de endpoints API
│   │   ├── config/         # Configuración (Mailer, DB)
│   │   └── middlewares/    # Auth, Upload (Multer), Resize (Sharp)
│   │
│   └── uploads/            # CARPETA GENERADA AUTOMÁTICAMENTE
│       ├── playlist-xxx.png
│       └── user-xxx.png    # Aquí se guardan las imágenes físicas
└── ...
```
#### 🧪 Ejecución de Tests
* **Tests Unitarios (Jest)** Pruebas de controladores y lógica de negocio.
```bash
cd server
npm run test
```

* **Tests End-to-End (Selenium)** Automatización de flujo de usuario en navegador real. Requisito para Linux/WSL: Tener X Server (VcXsrv) ejecutándose.

```Bash

# Instalar Selenium WebDriver
cd client
npm install --save-dev mocha selenium-webdriver chromedriver chai
ng add @angular/pwa

# Ejecutar test de login
npx mocha tests/selenium-suite.spec.js
```
---

## 👥 Equipo de Desarrollo
Proyecto desarrollado de forma colaborativa por el equipo E16 – SyTW 2025/2026.
* Ángela Izquierdo Padrón
* Godgith John
* Alexander Valencia Hernández

###### © 2025 Tempo - Proyecto Académico.
