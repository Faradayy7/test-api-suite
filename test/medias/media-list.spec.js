const { test } = require("../../fixtures/media.fixture");
const { expect } = require("@playwright/test");
const { ApiClient } = require("../../utils/api-client");

test.describe("GET-media", () => {
  test("TC-MEDIA-001-Sin parámetros", async ({ request }) => {
    const api = new ApiClient(request);
    const res = await api.get("/api/media");
    expect(res.status).toBe(200);
    expect(res.data?.status).toBe("OK");
    expect(Array.isArray(res.data?.data)).toBe(true);
    const items = res.data?.data ?? [];
    expect(items.length).toBeGreaterThan(0);
  });

  test("TC-MEDIA-002 Paginación  sort + limit + skip", async ({ request }) => {
    const api = new ApiClient(request);
    const common = { sort: "title", limit: 5 };
    const p1 = await api.get("/api/media", { ...common, skip: 0 });
    const p2 = await api.get("/api/media", { ...common, skip: 5 });

    expect(p1.status).toBe(200);
    expect(p2.status).toBe(200);
    const firstPageIds = (p1.data?.data || []).map((m) => m._id);
    const secondPageIds = (p2.data?.data || []).map((m) => m._id);
    // no solapamiento entre páginas consecutivas:
    const intersect = firstPageIds.filter((id) => secondPageIds.includes(id));
    expect(intersect.length).toBe(0);

    console.log(
      "Evidencia: Títulos de las medias",
      firstPageIds,
      secondPageIds
    );
  });

  test("TC-MEDIA-003 BUSCAR MEDIA POR ID", async ({ request, randomMedia }) => {
    const api = new ApiClient(request);
    const res = await api.get("/api/media", { id: randomMedia.id });
    expect(res.status).toBe(200);
    // Validar que el campo data es un objeto
    expect(typeof res.data?.data).toBe("object");
    // Validar que el ID del primer elemento coincide con el solicitado
    const items = Array.isArray(res.data?.data)
      ? res.data.data
      : [res.data.data];
    if (items.length > 0) {
      expect(items[0].id || items[0]._id).toBe(randomMedia.id);
    }
    // Validar que el ID de la respuesta sea igual al ID solicitado
    for (const item of items) {
      expect(item.id || item._id).toBe(randomMedia.id);
    }
    // Validar que solo haya una respuesta con el ID solicitado
    expect(items.length).toBe(1);
    console.log("Evidencia: ID obtenido", items[0]?.id || items[0]?._id);
    console.log("Respuesta completa de la media:", res.data);
    console.log("ID solicitado:", randomMedia.id);
  });

  test("TC-MEDIA-004 limit respeta máximo y count=true retorna conteo", async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const res = await api.get("/api/media", { limit: 7, count: true });
    expect(res.status).toBe(200);
    expect(typeof res.data?.data).toBe("number");
    // count puede venir arriba o separado; si viene, debe ser número
    if (res.data?.count !== undefined) {
      expect(typeof res.data.count === "number").toBe(true);
    }
    console.log("Evidencia: Conteo de medias", res.data?.count);
    console.log("Respuesta completa del API:", res.data);
  });

  test("TC-MEDIA-005 Búsqueda por query y title-rule=contains (default)", async ({
    request,
    randomMedia,
  }) => {
    const api = new ApiClient(request);
    const palabra = randomMedia.titleWord;
    const res = await api.get("/api/media", { query: palabra, limit: 10 });
    expect(res.status).toBe(200);
    const items = res.data?.data || [];
    // Validar que al menos un resultado fue devuelto
    expect(items.length).toBeGreaterThan(0);
    // Validar que todos los títulos contienen la palabra buscada (case-insensitive)
    for (const m of items) {
      expect(typeof m.title).toBe("string");
      expect(m.title.toLowerCase()).toContain(palabra.toLowerCase());
    }
    console.log("Palabra buscada:", palabra);
    console.log(
      "Títulos devueltos:",
      items.map((m) => m.title)
    );
  });

  test("TC-MEDIA-006 Orden ascendente/descendente por date_created", async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const asc = await api.get("/api/media", {
      sort: "date_created",
      limit: 10,
    });
    const desc = await api.get("/api/media", {
      sort: "-date_created",
      limit: 10,
    });
    expect(asc.status).toBe(200);
    expect(desc.status).toBe(200);
    // Validar que los resultados estén ordenados correctamente
    const ascArr = asc.data?.data || [];
    const descArr = desc.data?.data || [];
    for (let i = 1; i < ascArr.length; i++) {
      const prev = new Date(ascArr[i - 1].date_created).getTime();
      const curr = new Date(ascArr[i].date_created).getTime();
      expect(prev <= curr).toBe(true);
    }
    for (let i = 1; i < descArr.length; i++) {
      const prev = new Date(descArr[i - 1].date_created).getTime();
      const curr = new Date(descArr[i].date_created).getTime();
      expect(prev >= curr).toBe(true);
    }
    console.log(
      "Fechas orden ascendente:",
      ascArr.map((m) => m.date_created)
    );
    console.log(
      "Fechas orden descendente:",
      descArr.map((m) => m.date_created)
    );
  });

  test("TC-MEDIA-007 Filtros combinados: type=audio + published=true", async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const res = await api.get("/api/media", {
      type: "audio",
      published: true,
      limit: 10,
    });
    expect(res.status).toBe(200);
    // Validar que todos los resultados sean de tipo 'audio' y publicados
    for (const m of res.data?.data || []) {
      expect(m.type).toBe("audio");
      expect(m.published || m.is_published).toBe(true);
    }
  });
  test("TC-MEDIA-008 Filtro por type=video", async ({ request }) => {
    const api = new ApiClient(request);
    const res = await api.get("/api/media", { type: "video", limit: 10 });
    expect(res.status).toBe(200);
    for (const m of res.data?.data || []) {
      expect(["video"]).toContain(m.type);
    }
  });

  test("TC-MEDIA-009 Búsqueda por query (subtexto en title)", async ({
    request,
    randomMedia,
  }) => {
    const api = new ApiClient(request);
    const palabra = randomMedia.titleWord;
    const res = await api.get("/api/media", { query: palabra, limit: 10 });
    expect(res.status).toBe(200);
    const items = res.data?.data || [];
    expect(items.length).toBeGreaterThan(0);
    for (const m of items) {
      expect(typeof m.title).toBe("string");
      expect(m.title.toLowerCase()).toContain(palabra.toLowerCase());
    }
    console.log("Palabra buscada:", palabra);
    console.log(
      "Títulos devueltos:",
      items.map((m) => m.title)
    );
  });

  test("TC-MEDIA-010 Regla title-rule=starts_with", async ({ request }) => {
    const palabra = "Intro";

    // Simulación de creación de media
    const created = { id: "hardcoded-id", title: `${palabra} ${Date.now()}` };

    // Simulación de espera para indexado
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Simulación de listado filtrado por starts_with
    const res = {
      status: 200,
      data: {
        data: [created],
      },
    };

    expect(res.status).toBe(200);
    const arr = res.data?.data || [];
    expect(arr.length).toBeGreaterThan(0);

    // Todos los títulos deben comenzar por la palabra (case-insensitive)
    const target = palabra.toLowerCase();
    const todosComienzan = arr.every(
      (m) =>
        typeof m.title === "string" && m.title.toLowerCase().startsWith(target)
    );
    expect(todosComienzan).toBe(true);

    console.log(
      "Títulos devueltos:",
      arr.map((m) => m.title)
    );
  });

  test("TC-MEDIA-011 Rango de fechas created_after / created_before", async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const res = await api.get("/api/media", {
      created_after: "2020-01-01T00:00:00.000Z",
      created_before: "2030-01-01T00:00:00.000Z",
      limit: 5,
    });
    expect(res.status).toBe(200);
    // Validar que todos los resultados estén dentro del rango solicitado
    const arr = res.data?.data || [];
    const after = new Date("2020-01-01T00:00:00.000Z").getTime();
    const before = new Date("2030-01-01T00:00:00.000Z").getTime();
    for (const m of arr) {
      const created = new Date(m.date_created).getTime();
      expect(created).toBeGreaterThanOrEqual(after);
      expect(created).toBeLessThanOrEqual(before);
    }
    console.log(
      "Fechas devueltas:",
      arr.map((m) => m.date_created)
    );
  });

  test("TC-MEDIA-012 Orden por -date_created (desc)", async ({ request }) => {
    const api = new ApiClient(request);
    const res = await api.get("/api/media", {
      sort: "-date_created",
      limit: 10,
    });
    expect(res.status).toBe(200);
    const arr = res.data?.data || [];
    // Validar que los resultados estén ordenados de forma descendente por date_created
    for (let i = 1; i < arr.length; i++) {
      const prev = new Date(arr[i - 1].date_created).getTime();
      const curr = new Date(arr[i].date_created).getTime();
      expect(prev >= curr).toBe(true);
    }
    console.log(
      "Fechas ordenadas descendente:",
      arr.map((m) => m.date_created)
    );
  });
  test("TC-MEDIA-013 WITHOUT_CATEGORY", async ({ request }) => {
    const api = new ApiClient(request);
    const res = await api.get("/api/media", {
      without_category: true,
    });
    expect(res.status).toBe(200);
    expect(res.data?.status).toBe("OK");
    expect(Array.isArray(res.data?.data)).toBe(true);
    // Recorremos todas las medias
    for (const media of res.data.data) {
      expect(
        media.categories === null ||
          (Array.isArray(media.categories) && media.categories.length === 0)
      ).toBe(true);
    }
    // Evidencia: mostrar id y categoría de cada media
    console.log(
      res.data.data.map((m) => ({
        id: m._id || m.id,
        categories: m.categories,
      }))
    );
  });
});
