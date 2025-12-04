const { Builder, By, Key, until } = require('selenium-webdriver');
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
  });

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
});