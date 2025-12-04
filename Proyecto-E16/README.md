# API de sistema de recomendación de música

## 1. Objetivo 
El proyecto tiene como objetivo el desarrollo de una aplicación web de recomendaciones musicales en la que los usuarios podrán descubrir, escuchar y compartir música. En lugar de almacenar archivos de audio en el servidor, la
aplicación utilizará enlaces a videos de YouTube. Cada canción estará asociada a un enlace de YouTube y tendrá una imagen de miniatura proporcionada por YouTube.
La aplicación proporcionará una experiencia de usuario interactiva, donde los usuarios podrán:
- Buscar y reproducir música directamente desde YouTube.
- Recibir recomendaciones basadas en sus preferencias de escucha.
- Interactuar con amigos, compartir canciones y seguir sus gustos musicales.

La aplicación estará desarrollada con *Angular* en el frontend y Node.js con Express en el backend, conectados a una base de datos MongoDB para almacenar usuarios, canciones y relaciones sociales. La autenticación se gestionará mediante JWT (JSON Web Tokens) para garantizar la seguridad.

El *sistema de recomendaciones* podrá mejorarse usando algoritmos de filtrado colaborativo, ofreciendo una experiencia musical cada vez más centrada en los gustos del usuario.

## 2. Utilidad y Público Objetivo


### Público Objetivo:
- *Usuarios generales*: Personas que buscan una forma sencilla de descubrir nueva música y compartirla con sus amigos.
- *Amigos y seguidores*: Aquellos interesados en seguir lo que sus amigos están escuchando y ver las recomendaciones que tienen.
- *Usuarios recurrentes*: Usuarios que desean una experiencia personalizada, basada en sus hábitos de escucha y las recomendaciones de la comunidad.


# IMPORTANTE 
PARA PODER EJECUTAR EL SERVER HAY QUE INSTALAR LAS DEPENDENCIAS YA QUE .gitignore SE A HA DESABILITADA LA SUBIDA DE server/node_modules POR LO QUE HAY QUE REINTALARLA ESAS DEPENDENDENCIAS PARA QUE FUNCIONE. ESTAS DEPENDENCIAS SON LAS SIGUIENTES.

Server
```
npm install cors dotenv express mongodb
npm install --save-dev typescript @types/cors @types/express @types/node ts-node
npm install jsonwebtoken
```

Arrancar el server con el comando en la carpetra server:
```
npx ts-node src/app.ts
```

usar la version correcta para el correcto funcionamiento de angular en este caso 
```
nvm install 20.19.0
nvm use 20.19.0

``` 
Intalar angular para visualizar en tu terminal no hace falta que sea en la carpeta
```
npm install -g @angular/cli
```
Para inicializar angular cliente:
```
ng serve -o
```



Como se debe de tener la carpeta de client
```
client/
├── src/
│   ├── app/
│   │   ├── core/                       # 🔹 Servicios y configuración global
│   │   │   ├── guards/                 # Rutas protegidas (auth guard, etc.)
│   │   │   ├── interceptors/           # Interceptores HTTP (JWT, errores)
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── user.service.ts
│   │   │   │   ├── song.service.ts
│   │   │   │   └── playlist.service.ts
│   │   │   └── models/                 # Interfaces / tipos globales
│   │   │       ├── user.model.ts
│   │   │       ├── song.model.ts
│   │   │       └── playlist.model.ts
│   │   │
│   │   ├── shared/                     # 🔹 Componentes reutilizables
│   │   │   ├── navbar/
│   │   │   ├── sidebar/
│   │   │   ├── player/
│   │   │   ├── song-card/
│   │   │   └── playlist-card/
│   │   │
│   │   ├── features/                   # 🔹 Páginas principales (lazy loaded)
│   │   │   ├── home/
│   │   │   ├── search/
│   │   │   ├── profile/
│   │   │   ├── settings/
│   │   │   ├── playlist-detail/
│   │   │   └── auth/                   # Login / registro
│   │   │
│   │   ├── app-routing.module.ts       # Rutas principales
│   │   ├── app.component.ts            # Raíz de la app
│   │   └── app.module.ts
│   │
│   ├── assets/                         # Imágenes, íconos, estilos globales
│   ├── environments/                   # URLs del backend, config por entorno
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   └── index.html
│
├── angular.json
├── package.json
└── tsconfig.json
```


## Estructuras JSONs:

### Estructura de cancion --> song
```
{
  "title_": " Never Gonna Give You Up",
  "artist_": "Rick Astley",
  "youtubeURL_": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "thumbnailURL_": "https://img.youtube.com/vi/fJ9rUzIMcZQ/0.jpg",
  "genre_": "Rock",
  "durationInSeconds_": 333
}
```

### Estructura de playlist --> playlist
```
POST http://localhost:3000/api/playlists
{
  "name_": "Playlist de estudio",
  "description_": "Música para concentrarme",
  "cover_": "https://i.imgur.com/cover123.jpg",
  "owner_": "672f0c43debe99dbf7b8c1b3",
  "songs_": ["672eff9a7a0f8bb3c6a3e3d2"],
  "isPublic_": false,
  "duration_": 1800
}
```

### Estructura de registro de un usuario --> user
```
GET http://localhost:3000/api/users/register
Json:
{
  "_id": "67300d39bdf50e94e0d0a7e8",
  "username_": "gifty138",
  "email_": "usuario@ejemplo.com",
  "profilePictureUrl_": "",
  "createdAt_": "2025-10-31T23:21:00.000Z",
  "friends_": []
}
```

### Estructura para iniciar sesion
```
POST http://localhost:3000/api/users/login
Json:
{
  "email_": "usuario@ejemplo.com",
  "password_": "123456"
}
```


Se modificó los atributos de playlist para incluir los playlist con amigos.

Instalar mas paquetes en el backend
```
npm install ytdl-core fluent-ffmpeg
npm install --save-dev @types/fluent-ffmpeg
npm install axios
npm install --save-dev @types/axios
```

Instalara paquetes en el frontend
```
npm install 
npm install tailwindcss postcss autoprefixer
```

Instalar paquetes para usar el Selenium
Si usan el WSL, Ubuntu o linux ejecuten estos comandos
```
npm install selenium-webdriver
npm install chromedriver
npm install --save-dev @types/selenium-webdriver
sudo apt update
sudo apt install -y chromium-browser libnss3 libxi6 libxss1 libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxrender1 libxtst6 libglib2.0-0 wget unzip
```

Para visualizar como funciona los tests se debe descargar X Serve **(VcXsrv o Xming)**
https://sourceforge.net/projects/vcxsrv/

Y para ejecutar los tests:
```
npx ts-node --project tsconfig.tests.json test/login.test.ts
```

Para usar el selenium-side:
```
npm install -g selenium-side-runner
npm install -g chromedriver
```
Ejecutar los test:
```
selenium-side-runner
```

Para hacer los unit testing
```
npm install --save-dev jest ts-jest @types/jest
npm install --save-dev supertest @types/supertest
```
Para ejecutar el test:
```
npm run test
```

Instalar el Multer:
```
npm install multer
npm install --save-dev @types/multer
```

Instalar el sharp:
```
npm install sharp
```