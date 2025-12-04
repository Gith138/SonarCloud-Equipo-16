import { Builder, By, until, Key } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import "chromedriver";

// Función para tipear lentamente
async function typeSlowly(element: any, text: string, delay: number = 50) {
  for (const char of text) {
    await element.sendKeys(char);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

async function handleAlert(driver: any) {
  try {
    await driver.wait(until.alertIsPresent(), 2000);
    const alert = await driver.switchTo().alert();
    console.log("Alert text:", await alert.getText());
    await alert.accept();
  } catch {
    // No hay alerta, se continua
  }
}

async function testPlaylistAndSettings() {
  const options = new chrome.Options();
  options.addArguments("--start-maximized"); // visible
  // options.addArguments("--headless", "--disable-gpu", "--window-size=1920,1080"); // modo headless

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    // ================= LOGIN =================
    await driver.get("http://localhost:4200/login");
    // login con email/password
    await driver.findElement(By.name("email_")).sendKeys("alu0101463858@ull.edu.es");
    await driver.findElement(By.name("password_")).sendKeys("1234");
    await driver.findElement(By.css('button[type="submit"]')).click();

    // esperar a que se redirija al home
    await driver.wait(until.urlContains("/home"), 5000);

    // ================= ENTRAR A LA PLAYLIST =================
    await driver.get("http://localhost:4200/playlists/690fa03e311d47c8cf3241e7"); // reemplaza 123 con tu ID real
    await driver.wait(until.elementLocated(By.css('h1')), 5000);
    console.log("Página de playlist cargada.");

    // ================= AÑADIR UNA CANCIÓN =================
    const addButton = await driver.findElement(By.xpath("//button[contains(text(),'➕ Añadir canción')]"));
    await addButton.click();

    const titleInput = await driver.wait(until.elementLocated(By.name("song_title")), 5000);
    await typeSlowly(titleInput, "Shape of You", 50);

    const urlInput = await driver.findElement(By.name("youtube_url"));
    await typeSlowly(urlInput, "https://www.youtube.com/watch?v=JGwWNGJdvx8", 50);

    const genreInput = await driver.findElement(By.name("genre"));
    await typeSlowly(genreInput, "Pop", 50);

    await driver.findElement(By.css('button[type="submit"]')).click();
    console.log("Canción añadida.");

    // ================= IR A LA PÁGINA DE CONFIGURACIÓN =================
    await driver.get("http://localhost:4200/settings");
    await driver.wait(until.elementLocated(By.css('nav')), 5000);
    console.log("Página de Configuración cargada.");

    const tabs = [
      "Perfil",
      "Reproducción",
      "Notificaciones",
      "Privacidad",
      "Apariencia",
      "Almacenamiento"
    ];

     for (const tabName of tabs) {
      const tabBtn = await driver.findElement(By.xpath(`//button[contains(text(),'${tabName}')]`));
      await tabBtn.click();
      await driver.sleep(500); // pequeña pausa para animación de carga
      console.log(`Pestaña "${tabName}" seleccionada.`); 

      switch (tabName) {
        case "Perfil":
          const usernameInput = await driver.findElement(By.name("userName"));
          await driver.executeScript("arguments[0].scrollIntoView(true);", usernameInput);
          await usernameInput.clear();
          await typeSlowly(usernameInput, "UsuarioPrueba", 30);

          const emailInput = await driver.findElement(By.name("userEmail"));
          await driver.executeScript("arguments[0].scrollIntoView(true);", emailInput);
          await emailInput.clear();
          await typeSlowly(emailInput, "prueba@test.com", 30);

          const saveBtn = await driver.findElement(By.xpath("//button[contains(text(),'Guardar cambios')]"));
          await driver.executeScript("arguments[0].scrollIntoView(true);", saveBtn);
          await saveBtn.click();

          await handleAlert(driver);
          console.log("Perfil actualizado.");
          break;

        case "Reproducción":
          const autoplayCheckbox = await driver.findElement(By.xpath("//label[contains(text(),'Reproducción automática')]/input"));
          await driver.executeScript("arguments[0].scrollIntoView(true);", autoplayCheckbox);
          if (!(await autoplayCheckbox.isSelected())) await autoplayCheckbox.click();

          const normalizationCheckbox = await driver.findElement(By.xpath("//label[contains(text(),'Normalización de volumen')]/input"));
          await driver.executeScript("arguments[0].scrollIntoView(true);", normalizationCheckbox);
          if (!(await normalizationCheckbox.isSelected())) await normalizationCheckbox.click();

          console.log("Opciones de reproducción actualizadas.");
          break;

        case "Notificaciones":
          const pushLabel = await driver.findElement(By.xpath("//label[contains(text(),'Notificaciones push')]"));
          await driver.executeScript("arguments[0].scrollIntoView(true);", pushLabel);
          await pushLabel.click();

          const emailLabel = await driver.findElement(By.xpath("//label[contains(text(),'Notificaciones por email')]"));
          await driver.executeScript("arguments[0].scrollIntoView(true);", emailLabel);
          await emailLabel.click();

          console.log("Notificaciones actualizadas.");
          break;

        case "Privacidad":
          const privateLabel = await driver.findElement(By.xpath("//label[contains(text(),'Sesión privada')]"));
          await driver.executeScript("arguments[0].scrollIntoView(true);", privateLabel);
          await privateLabel.click();

          // Permitir contenido explícito
          const explicitLabel = await driver.findElement(By.xpath("//label[contains(text(),'Permitir contenido explícito')]"));
          await driver.executeScript("arguments[0].scrollIntoView(true);", explicitLabel);
          await explicitLabel.click();

          console.log("Privacidad configurada.");
          break;

        case "Apariencia":
          const languageSelect = await driver.findElement(By.xpath("//label[contains(text(),'Idioma')]/following-sibling::select"));
          await languageSelect.sendKeys("English");

          const friendActivityLabel = await driver.findElement(By.xpath("//label[contains(text(),'Mostrar actividad de amigos')]"));
          await driver.executeScript("arguments[0].scrollIntoView(true);", friendActivityLabel);
          await friendActivityLabel.click();

          console.log("Apariencia configurada.");
          break;

        case "Almacenamiento":
          const clearCacheBtn = await driver.findElement(By.xpath("//button[contains(text(),'Limpiar caché')]"));
          await driver.executeScript("arguments[0].scrollIntoView(true);", clearCacheBtn);
          await clearCacheBtn.click();

          console.log("Caché limpiada.");
          break;
      }

      await driver.sleep(500); // pequeña pausa entre pestañas
    }

    console.log("Test de playlist y configuración completado.");
    await driver.sleep(2000);

  } finally {
    await driver.quit();
  }
}

testPlaylistAndSettings();
