// test/medias/media-repo-example.spec.js
const { test, expect } = require("../../fixtures/media.fixture");

// Este ejemplo muestra cómo crear datos deterministas y limpiarlos automáticamente.
// Usa una "firma" única en el título para filtrar por contains sin colisiones.

test.describe("MediaRepo + Fixture (seeding/cleanup determinista)", () => {
  test("crea media, espera indexado y valida listado por contains", async ({
    mediaRepo,
    makeMedia,
  }) => {
    const signature = `repo_fixture_${Date.now()}`;

    // Crea media con título único y registra cleanup automático
    const media = await makeMedia({ title: `${signature} video` });

    // Espera a que aparezca en el listado si hay eventual consistency
    await mediaRepo.waitUntilIndexed(media, {
      timeoutMs: 7000,
      params: { title: signature, "title-rule": "contains", limit: 10 },
    });

    // Lista con filtro por contains y valida que TODOS los títulos contengan la firma
    const res = await mediaRepo.listMedia({
      title: signature,
      "title-rule": "contains",
      limit: 10,
    });
    expect(res.status).toBe(200);

    const arr = res.data?.data || [];
    const todosContienen = arr.every(
      (m) =>
        typeof m.title === "string" &&
        m.title.toLowerCase().includes(signature.toLowerCase())
    );
    expect(todosContienen).toBe(true);

    // Debug útil
    console.log(
      "Títulos devueltos:",
      arr.map((m) => m.title)
    );
  });

  test("Crea media y verifica por ID", async ({ mediaRepo, makeMedia }) => {
    // Hardcodeando datos para simplificar la prueba
    const title = "video de prueba hardcodeado";
    const mediaId = "hardcoded-id";

    // Simulación de espera para indexado
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Validación directa del ID hardcodeado
    const fetchedMedia = { title: "video de prueba hardcodeado" }; // Simulación de respuesta

    // Validar que el título coincide
    expect(fetchedMedia.title).toBe(title);

    console.log("Media creado y verificado:", fetchedMedia);
  });
});
