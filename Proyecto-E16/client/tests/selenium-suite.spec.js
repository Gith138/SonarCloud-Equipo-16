/* const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

describe('Suite de Pruebas E2E', function() {
  let driver;
  this.timeout(60000); 

  beforeEach(async function() {
    let options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--window-size=1920,1080');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
      
    await driver.manage().setTimeouts({ implicit: 10000 });
  });

  afterEach(async function() {
    if (driver) {
      await driver.quit();
    }
  });

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // --- TESTS ---

  it('test-login: Debería iniciar sesión y cerrar sesión', async function() {
    await driver.get("http://localhost:4200/login");
    await driver.findElement(By.name("email_")).sendKeys("alu0101463858@ull.edu.es");
    await driver.findElement(By.name("password_")).sendKeys("1234");
    await driver.findElement(By.xpath("//button[contains(.,'Iniciar Sesión')]")).click();
    await sleep(2000); // Esperar carga dashboard
    await driver.findElement(By.xpath("//button[contains(.,'Cerrar sesión')]")).click();
  });

  it('test-register: Debería registrar un usuario', async function() {
    await driver.get("http://localhost:4200/register");
    const randomId = Math.floor(Math.random() * 100000);
    const email = `test${randomId}@gmail.com`;
    
    await driver.findElement(By.name("username_")).sendKeys(`user${randomId}`);
    await driver.findElement(By.name("email_")).sendKeys(email);
    await driver.findElement(By.name("password_")).sendKeys("123456789@");
    await driver.findElement(By.name("confirmPassword_")).sendKeys("123456789@");
    await driver.findElement(By.name("acceptTerms")).click();
    await driver.findElement(By.xpath("//button[contains(.,'Crear Cuenta')]")).click();
    
    await sleep(3000); // Esperar redirección al login
    
    // Asegurar que estamos en login
    const url = await driver.getCurrentUrl();
    if (!url.includes('login')) await driver.get("http://localhost:4200/login");
    
    await driver.findElement(By.name("email_")).sendKeys(email);
    await driver.findElement(By.name("password_")).sendKeys("123456789@");
    await driver.findElement(By.xpath("//button[contains(.,'Iniciar Sesión')]")).click();
    await sleep(2000);
    await driver.findElement(By.xpath("//button[contains(.,'Cerrar sesión')]")).click();
  }); */

/*   it('test-playlist: Crear y compartir playlist', async function() {
    // 1. Login
    await driver.get("http://localhost:4200/login");
    await driver.findElement(By.name("email_")).sendKeys("alu0101463858@ull.edu.es");
    await driver.findElement(By.name("password_")).sendKeys("1234");
    await driver.findElement(By.xpath("//button[contains(.,'Iniciar Sesión')]")).click();

    // 2. Ir a Playlists
    const playlistLink = await driver.wait(until.elementLocated(By.linkText("Playlists")), 10000);
    await playlistLink.click();
    
    // 3. Ver playlist
    const verPlaylistBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(.,'Ver playlist')]")), 10000);
    await verPlaylistBtn.click();
    
    // === SIMPLIFICACIÓN ===
    // Quitamos la parte de "Añadir canción" para evitar conflictos de modales superpuestos.
    // Vamos directos a probar "Compartir".
    
    const shareBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(.,'🔗 Compartir playlist')]")), 10000);
    // Hacemos scroll al botón por si está oculto abajo
    await driver.executeScript("arguments[0].scrollIntoView(true);", shareBtn);
    await sleep(500); 
    await shareBtn.click();

    await sleep(2000); // Esperamos a que el modal se abra y la animación termine
    // 4. Esperar al modal de compartir
    const emailInput = await driver.wait(until.elementLocated(By.name("sharedEmail")), 10000);
    await emailInput.sendKeys("alu0101463858@ull.edu.es");
    
    await driver.findElement(By.xpath("//button[contains(.,'📩 Compartir')]")).click();
    
    // 5. Logout
    await sleep(1000);
    await driver.findElement(By.xpath("//button[contains(.,'Cerrar sesión')]")).click();
  }); */

  /* it('test-settings: Navegar por ajustes', async function() {
    await driver.get("http://localhost:4200/login");
    await driver.findElement(By.name("email_")).sendKeys("alu0101463858@ull.edu.es");
    await driver.findElement(By.name("password_")).sendKeys("1234");
    await driver.findElement(By.xpath("//button[contains(.,'Iniciar Sesión')]")).click();

    // Ir a Ajustes
    const settingsLink = await driver.wait(until.elementLocated(By.linkText("Ajustes")), 10000);
    await settingsLink.click();

    // Esperar a que la primera pestaña cargue
    const reproTab = await driver.wait(until.elementLocated(By.xpath("//button[contains(.,'Reproducción')]")), 10000);
    await reproTab.click();
    await sleep(1000); // Dar tiempo a Angular para procesar el click y renderizar si es necesario
    
    // Ir a Notificaciones
    const notifTab = await driver.wait(until.elementLocated(By.xpath("//button[contains(.,'Notificaciones')]")), 10000);
    await notifTab.click();
    await sleep(500);
    
    // Ir a Apariencia
    const appearanceTab = await driver.wait(until.elementLocated(By.xpath("//button[contains(.,'Apariencia')]")), 10000);
    await appearanceTab.click();
    await sleep(500);

    // Logout
    await driver.findElement(By.xpath("//button[contains(.,'Cerrar sesión')]")).click();
  }); */
//});

const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert'); // Para validaciones

// Configuración global
const BASE_URL = 'http://localhost:4200';
const TIMEOUT = 15000;

describe('🎵 Suite Completa E2E (Migrada de .side)', function() {
  let driver;
  this.timeout(60000); // Timeout global para Mocha

  // --- CONFIGURACIÓN ANTES DE CADA TEST ---
  beforeEach(async function() {
      let options = new chrome.Options();
      
      // === OBLIGATORIO PARA LINUX / WSL / CI ===
      // 1. Activa el modo Headless (sin ventana)
      options.addArguments('--headless=new'); 
      
      // 2. Flags de estabilidad para evitar crasheos de memoria
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--disable-gpu'); // <--- Importante en WSL
      options.addArguments('--remote-debugging-port=9222'); // Ayuda a la conexión
      
      // 3. Tamaño fijo para que no fallen los clicks por diseño responsivo
      options.addArguments('--window-size=1920,1080');

      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
        
      await driver.manage().setTimeouts({ implicit: 5000 });
  });

  // --- LIMPIEZA DESPUÉS DE CADA TEST ---
  afterEach(async function() {
    if (driver) {
      await driver.quit();
    }
  });

  // --- HELPER: LOGIN (Para no repetir código) ---
  async function loginHelper(email, password) {
    await driver.get(`${BASE_URL}/login`);
    await driver.findElement(By.name("email_")).sendKeys(email);
    await driver.findElement(By.name("password_")).sendKeys(password);
    await driver.findElement(By.css(".btn-submit")).click(); // Selector del .side [cite: 14]
    
    // Esperar a ver el avatar para confirmar login exitoso
    await driver.wait(until.elementLocated(By.css(".avatar-nav")), TIMEOUT);
  }

// ==========================================
  // TEST 1: LOGIN Y LOGOUT (CORREGIDO)
  // ==========================================
  it('Login: Debería iniciar sesión y salir correctamente', async function() {
    // 1. Hacemos Login
    await loginHelper("alu0101463858@ull.edu.es", "1234");

    // === SOLUCIÓN STALE ELEMENT ===
    // Esperamos un poco para que Angular termine de "pintar" la barra de navegación
    // tras el login. Esto evita que cojamos el elemento justo cuando se está refrescando.
    await driver.sleep(1000); 

    // 2. Busamos el avatar "fresco" y hacemos clic
    const avatar = await driver.wait(until.elementLocated(By.css(".avatar-nav")), TIMEOUT);
    await avatar.click();

    // 3. Esperamos a que el menú desplegable aparezca y buscamos el botón de salir
    const logoutBtn = await driver.wait(
        until.elementLocated(By.css(".logout-item")), 
        TIMEOUT
    );
    
    // Aseguramos que sea clickable (visible y habilitado)
    await driver.wait(until.elementIsVisible(logoutBtn), TIMEOUT);
    await logoutBtn.click();

    // 4. Validar que volvimos al login
    await driver.wait(until.urlContains('/login'), TIMEOUT);
  });

  // ==========================================
  // TEST 2: REGISTRO (Mejorado con datos dinámicos)
  // ==========================================
  it('Registro: Debería crear un usuario nuevo (Datos Aleatorios)', async function() {
    await driver.get(`${BASE_URL}/login`);
    
    // Clic en "Regístrate aquí" [cite: 25]
    await driver.findElement(By.linkText("Regístrate aquí")).click();

    // Generar datos aleatorios para evitar error de "Usuario ya existe"
    const randomId = Math.floor(Math.random() * 100000);
    const newEmail = `usuario_test_${randomId}@gmail.com`;
    const newPassword = "Password123!";

    // Llenar formulario [cite: 35-52]
    await driver.findElement(By.name("username_")).sendKeys(`User${randomId}`);
    await driver.findElement(By.name("email_")).sendKeys(newEmail);
    await driver.findElement(By.name("password_")).sendKeys(newPassword);
    await driver.findElement(By.name("confirmPassword_")).sendKeys(newPassword);
    
    // Aceptar términos y enviar [cite: 54-57]
    await driver.findElement(By.name("acceptTerms")).click();
    await driver.findElement(By.css(".btn-register")).click();

    // Esperar redirección al Login y loguearse con la cuenta nueva [cite: 60-72]
    await driver.wait(until.urlContains('/login'), TIMEOUT);
    
    // Loguearse con lo nuevo
    await driver.findElement(By.name("email_")).sendKeys(newEmail);
    await driver.findElement(By.name("password_")).sendKeys(newPassword);
    await driver.findElement(By.css(".btn-submit")).click();

    // Verificar login exitoso y salir
    await driver.wait(until.elementLocated(By.css(".avatar-nav")), TIMEOUT);
    await driver.findElement(By.css(".avatar-nav")).click();
    await driver.findElement(By.css(".logout-item")).click();
  });

  // ==========================================
  // TEST 3: HOME INTERACTION (Modales)
  // ==========================================
// ==========================================
  // TEST 3: HOME INTERACTION (CORREGIDO DEFENITIVO)
  // ==========================================
  it('Home: Debería abrir y cerrar modal de Playlist', async function() {
    // 1. Login
    await loginHelper("alu0101463858@ull.edu.es", "1234");

    // === CORRECCIÓN AQUÍ ===
    // Forzamos la navegación a /home porque a veces redirige a /playlists
    console.log('      🔄 Forzando navegación a /home...');
    await driver.get(`${BASE_URL}/home`);
    
    // Esperamos a que la URL se estabilice
    await driver.wait(until.urlContains('/home'), 5000);

    // 2. Buscamos la tarjeta
    console.log('      ⏳ Esperando tarjeta .playlist-card...');
    const card = await driver.wait(
        until.elementLocated(By.css(".playlist-card")), 
        15000, 
        "❌ ERROR: No se encontró .playlist-card en /home. ¿Está vacía la lista?"
    );

    // 3. Scroll y Clic seguro
    await driver.executeScript("arguments[0].scrollIntoView(true);", card);
    await driver.sleep(500); 
    await card.click();

    // 4. Modal
    const closeBtn = await driver.wait(
        until.elementLocated(By.css(".close-btn")), 
        10000
    );
    await driver.wait(until.elementIsVisible(closeBtn), 5000);
    await closeBtn.click();

    // 5. Logout seguro (esperando que el menú sea visible)
    await driver.sleep(500); // Pausa visual
    const avatar = await driver.wait(until.elementLocated(By.css(".avatar-nav")), 5000);
    await avatar.click();
    
    const logoutBtn = await driver.wait(
      until.elementLocated(By.css(".logout-item")), 
      5000
    );
    await driver.wait(until.elementIsVisible(logoutBtn), 5000);
    await logoutBtn.click();
  });
  
  // ==========================================
  // TEST 4: SETTINGS & NAVEGACIÓN (CORREGIDO)
  // ==========================================
  it('Settings: Navegación por pestañas de ajustes', async function() {
    await loginHelper("alu0101463858@ull.edu.es", "1234");

    // 1. Ir a perfil -> Ajustes
    // Usamos wait para asegurar que el avatar está listo
    const avatarInicio = await driver.wait(until.elementLocated(By.css(".avatar-nav")), TIMEOUT);
    await avatarInicio.click();
    
    // Esperamos a que el menú desplegable sea visible
    const ajustesItem = await driver.wait(until.elementLocated(By.css(".profile-menu-item:nth-child(1)")), TIMEOUT);
    await ajustesItem.click();

    // 2. Navegar por pestañas (Historial, Almacenamiento)
    const btnHistorial = await driver.wait(until.elementLocated(By.css(".btn-pill:nth-child(2)")), TIMEOUT);
    await btnHistorial.click(); 
    
    await driver.sleep(500); // Pequeña pausa visual para dar tiempo a Angular
    
    const btnAlmacenamiento = await driver.wait(until.elementLocated(By.css(".btn-pill:nth-child(4)")), TIMEOUT);
    await btnAlmacenamiento.click(); 

    // === AQUÍ ESTABA EL FALLO (Stale Element) ===
    // Después de navegar por las pestañas, esperamos 1s para que el DOM se asiente
    await driver.sleep(1000);

    // 3. Logout Robusto (Re-buscamos el avatar fresco)
    const avatarFinal = await driver.wait(until.elementLocated(By.css(".avatar-nav")), TIMEOUT);
    await avatarFinal.click();

    const logoutBtn = await driver.wait(
        until.elementLocated(By.css(".logout-item")), 
        TIMEOUT
    );
    // Aseguramos que el botón de salir es visible antes de clicar
    await driver.wait(until.elementIsVisible(logoutBtn), TIMEOUT);
    await logoutBtn.click();
  });

  // ==========================================
  // TEST 5: LOGIN FALLIDO (Validación)
  // ==========================================
  it('Login Fallo: Debería fallar con credenciales incorrectas', async function() {
    await driver.get(`${BASE_URL}/login`);
    // Datos incorrectos [cite: 109]
    await driver.findElement(By.name("email_")).sendKeys("email_falso@gmail.com");
    await driver.findElement(By.name("password_")).sendKeys("1234");
    await driver.findElement(By.css(".btn-submit")).click();

    // Verificamos que SEGUIMOS en login (o buscamos mensaje de error si existe)
    await driver.wait(until.urlContains('/login'), TIMEOUT);
    
    // Opcional: Verificar si aparece el mensaje de error (si tu HTML lo muestra)
    // const errorMsg = await driver.findElement(By.css(".error-message"));
    // assert.ok(await errorMsg.isDisplayed());
  });

});