const { test: base } = require("@playwright/test");
const { ApiClient } = require("../utils/api-client");

exports.test = base.extend({
  randomMedia: async ({ request }, use) => {
    const api = new ApiClient(request);
    const res = await api.get("/api/media", { limit: 50 }); // puedes ajustar el limit
    const medias = res.data?.data || [];
    if (medias.length === 0) throw new Error("No hay medias disponibles");

    // Selecciona una media al azar
    const media = medias[Math.floor(Math.random() * medias.length)];

    // Extrae palabras de title y description
    const titleWord =
      (media.title || "").split(/\s+/).find((w) => w.length > 2) || "";
    const descWord =
      (media.description || "").split(/\s+/).find((w) => w.length > 2) || "";

    // Prepara el objeto con los datos requeridos
    const mediaFixture = {
      id: media.id || media._id,
      title: media.title,
      description: media.description,
      categoryId: Array.isArray(media.categories)
        ? media.categories[0]
        : media.categories,
      titleWord,
      descWord,
    };

    await use(mediaFixture);
  },
});
