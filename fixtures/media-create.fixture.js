// fixtures/media-create.fixture.js
const { test: base } = require("@playwright/test");
const { ApiClient } = require("../utils/api-client");
require("dotenv").config();

exports.test = base.extend({
  createdMedia: async ({ request }, use) => {
    const api = new ApiClient(request);

    const payload = {
      title: `Test Media ${Date.now()}`,
      description: "Descripción de prueba",
      type: "video",
      categories: [],
      tags: ["qa-test"],
    };

    const res = await api.postJson("/api/media", payload);
    if (![200, 201].includes(res.status) || !res.data?.data) {
      throw new Error(`No se pudo crear la media: status=${res.status}`);
    }

    const media = res.data.data;

    // 👉 entregar la media a los tests
    await use(media);

    // 🧹 cleanup: borrar la media al terminar todos los tests que usan el fixture
    const apiToken = process.env.API_TOKEN;
    if (apiToken) {
      try {
        const delUrl = `/api/media/${media._id}?token=${encodeURIComponent(
          apiToken
        )}`;
        const delRes = await request.delete(delUrl);
        console.log(`Media ${media._id} eliminada, status:`, delRes.status());
      } catch (e) {
        console.warn(`No se pudo eliminar la media ${media._id}:`, e.message);
      }
    } else {
      console.warn("No se eliminó la media porque falta API_TOKEN en .env");
    }
  },
});
