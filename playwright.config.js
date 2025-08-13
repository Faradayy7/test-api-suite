// playwright.config.js
const { defineConfig } = require("@playwright/test");
require("dotenv").config();

module.exports = defineConfig({
  testDir: "./test", // Carpeta donde irán los tests de API
  timeout: 30 * 1000, // 30 segundos por test
  retries: 0, // Sin reintentos por defecto
  workers: 4, // Paralelismo
  reporter: [["html", { outputFolder: "report" }]],

  use: {
    baseURL: process.env.API_BASE_URL, // URL base de la API
    extraHTTPHeaders: {
      "X-API-Token": process.env.API_TOKEN || "", // Header de autenticación
    },
    
  },
});
