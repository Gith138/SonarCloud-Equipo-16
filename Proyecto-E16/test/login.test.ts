import { Builder, By, until } from "selenium-webdriver";
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

  // Función helper para tipear lento
  async function typeSlowly(element: any, text: string, delay: number = 100) {
    for (const char of text) {
      await element.sendKeys(char);
      await new Promise(resolve => setTimeout(resolve, delay)); // espera entre cada letra
    }
  }
  try {
    // Abrir la página de login de tu app Angular
    await driver.get("http://localhost:4200/login");

    // Esperar a que el input de email esté presente
    const emailInput = await driver.wait(
      until.elementLocated(By.name("email_")),5000);
      
    await emailInput.sendKeys("alu0101463858@ull.edu.es");
    await typeSlowly(emailInput, "alu0101463858@ull.edu.es", 200); // 200ms entre cada letra

    // Esperar a que el input de password esté presente
    const passwordInput = await driver.wait(
      until.elementLocated(By.name("password_")),
      5000
    );
    await passwordInput.sendKeys("1234");

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
testLogin();
