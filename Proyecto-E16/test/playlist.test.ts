import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import "chromedriver";

// Función para tipear como humano
async function typeSlowly(element: any, text: string, delay: number = 50) {
  for (const char of text) {
    await element.sendKeys(char);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

async function testPlaylist() {
  const options = new chrome.Options();
  options.addArguments("--start-maximized"); // visible
  // options.addArguments("--headless", "--disable-gpu", "--window-size=1920,1080"); // headless

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    await driver.get("http://localhost:4200/playlists/690fa03e311d47c8cf3241e7"); // tu ruta

    // ================= AÑADIR CANCIÓN =================
    const addButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(),'➕ Añadir canción')]")),
      5000
    );
    await addButton.click();

    const titleInput = await driver.wait(
      until.elementLocated(By.name("song_title")),
      5000
    );
    await typeSlowly(titleInput, "Blinding Lights", 50);

    const urlInput = await driver.findElement(By.name("youtube_url"));
    await typeSlowly(urlInput, "https://www.youtube.com/watch?v=4NRXx6U8ABQ", 50);

    const genreInput = await driver.findElement(By.name("genre"));
    await typeSlowly(genreInput, "Pop", 50);

    await driver.findElement(By.css('button[type="submit"]')).click();
    console.log("Canción añadida.");

    // ================= COMPARTIR PLAYLIST =================
    const shareButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(),'🔗 Compartir playlist')]")),
      5000
    );
    await shareButton.click();

    const emailInput = await driver.wait(
      until.elementLocated(By.name("sharedEmail")),
      5000
    );
    await typeSlowly(emailInput, "usuario@test.com", 50);

    await driver.findElement(
      By.xpath("//button[contains(text(),'📩 Compartir')]")
    ).click();
    console.log("Playlist compartida.");

    // ================= OPCIONAL: REPRODUCIR Y BORRAR =================
    // Puedes buscar los botones de reproducir y borrar con xpath similar
    // await driver.findElement(By.xpath("//button[contains(text(),'▶')]")).click();
    // await driver.findElement(By.xpath("//button[contains(text(),'🗑')]")).click();

    await driver.sleep(2000); // espera para ver los resultados

  } finally {
    await driver.quit();
  }
}

testPlaylist();
