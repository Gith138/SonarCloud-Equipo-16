/* import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import "chromedriver";

async function testLogin() {
  // Configuración de Chrome para VER la ejecución
  const options = new chrome.Options();
  options.addArguments("--start-maximized"); // abrir ventana maximizada
  // opcional: puedes agregar otras flags si quieres, pero NO headless

  // Crear driver
  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    // Abrir la página de login de tu app Angular
    await driver.get("http://localhost:4200/register");

    // Esperar a que el input de password esté presente
    const UsernameInput = await driver.wait(
      until.elementLocated(By.name("username_")),
      5000
    );
    await UsernameInput.sendKeys("prueba1");

    // Esperar a que el input de email esté presente
    const emailInput = await driver.wait(
      until.elementLocated(By.name("email_")),
      5000
    );
    await emailInput.sendKeys("prueba1@gmail.com");

    // Esperar a que el input de password esté presente
    const passwordInput = await driver.wait(
      until.elementLocated(By.name("password_")),
      5000
    );
    await passwordInput.sendKeys("123456");

    // Esperar a que el input de password esté presente
    const confirmPassword = await driver.wait(
      until.elementLocated(By.name("confirmPassword_")),
      5000
    );
    await confirmPassword.sendKeys("123456");

const acceptTerms = await driver.wait(
  until.elementLocated(By.name("acceptTerms")),
  5000
);

    // Si no está seleccionado, hacer clic
    const isSelected = await acceptTerms.isSelected();
    if (!isSelected) {
      await acceptTerms.click();
    }
    // Hacer clic en el botón de login
    const loginButton = await driver.findElement(By.css('button[type="submit"]'));
    await loginButton.click();

    // Esperar hasta que aparezca el mensaje de error (si existe)
    const errorDiv = await driver.wait(
      until.elementLocated(By.css('div[ng-reflect-ng-if="true"], div.text-red-400')),
      5000
    ).catch(() => null); // Si no aparece, seguimos

    if (errorDiv) {
      const errorText = await errorDiv.getText();
      console.log("Mensaje de error:", errorText);
    } else {
      console.log("Login correcto!");
    }

    // Pausa para ver el resultado antes de cerrar (opcional)
    await driver.sleep(3000);

  } finally {
    // Cerrar el navegador
    await driver.quit();
  }
}

// Ejecutar test
testLogin(); */
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import "chromedriver";

async function testRegisterAndLogin() {
  const options = new chrome.Options();
  options.addArguments("--start-maximized"); // Modo visible
/*   const options = new chrome.Options();
  options.addArguments("--headless"); // Modo sin GUI
  options.addArguments("--disable-gpu"); // Recomendado en Windows
  options.addArguments("--window-size=1920,1080"); // Tamaño de la ventana virtual */

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  // Datos de prueba
  const username = "prueba1";
  const email = "prueba1@gmail.com";
  const password = "123456";

  try {
    // Función helper para tipear lento
    async function typeSlowly(element: any, text: string, delay: number = 100) {
      for (const char of text) {
        await element.sendKeys(char);
        await new Promise(resolve => setTimeout(resolve, delay)); // espera entre cada letra
      }
    }

    // ================= REGISTRO =================
    await driver.get("http://localhost:4200/register");

    await typeSlowly(await driver.wait(until.elementLocated(By.name("username_")), 1000), username, 20);
    await typeSlowly(await driver.wait(until.elementLocated(By.name("email_")), 1000), email, 20);
    await typeSlowly(await driver.wait(until.elementLocated(By.name("password_")), 1000), password, 20);
    await typeSlowly(await driver.wait(until.elementLocated(By.name("confirmPassword_")), 1000), password, 20);

    // Checkbox de términos
    const acceptTerms = await driver.wait(until.elementLocated(By.name("acceptTerms")), 5000);
    if (!(await acceptTerms.isSelected())) await acceptTerms.click();

    // Botón de submit
    await driver.findElement(By.css('button[type="submit"]')).click();

    // Esperar que desaparezca el formulario o aparezca mensaje de éxito
    await driver.sleep(2000); // pausa corta para esperar respuesta del servidor

    console.log("Registro completado.");

    // ================= LOGIN =================
    await driver.get("http://localhost:4200/login");

    await typeSlowly(await driver.wait(until.elementLocated(By.name("email_")), 5000), email, 20);
    await typeSlowly(await driver.wait(until.elementLocated(By.name("password_")), 5000), password, 20);

    await driver.findElement(By.css('button[type="submit"]')).click();

    // Verificar si login exitoso
    const errorDiv = await driver.wait(
      until.elementLocated(By.css('div[ng-reflect-ng-if="true"], div.text-red-400')),
      3000
    ).catch(() => null);

    if (errorDiv) {
      const errorText = await errorDiv.getText();
      console.log("Error al hacer login:", errorText);
    } else {
      console.log("Login correcto!");
    }

    // Pausa para ver el resultado
    await driver.sleep(3000);

  } finally {
    await driver.quit();
  }
}

testRegisterAndLogin();
