const { test } = require("../../fixtures/media-create.fixture"); // <- inyecta createdMedia y la borra al final
const { expect } = require("@playwright/test");

test.describe("POST /api/media - Flujo happy path (reusa un solo media_id y limpia al final)", () => {
  test("TC-POST-001 | Crear media (fixture) y validar campos", async ({
    createdMedia,
  }) => {
    expect(createdMedia).toBeDefined();
    expect(createdMedia.title).toContain("Test Media");
    expect(createdMedia.description).toBe("Descripción de prueba");
    expect(createdMedia.type).toBe("video");
    expect(Array.isArray(createdMedia.categories)).toBe(true);
    expect(Array.isArray(createdMedia.tags)).toBe(true);
  });

  test("TC-POST-002 | Upload remoto y update usando el MISMO _id", async ({
    request,
    createdMedia,
  }) => {
    // --- Upload remoto ---
    const params = {
      size: 1048576,
      file_name: "Test_Video.mp4",
      type: "remote",
      fileUrl:
        "https://cdn.pixabay.com/video/2019/03/12/21952-323495860_tiny.mp4",
      media_id: createdMedia._id ?? createdMedia.id,
    };
    const query = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const uploadRes = await request.get(`/api/media/upload?${query}`);
    expect([200, 201]).toContain(uploadRes.status());

    const uploadBody = await uploadRes.json();
    const jobId =
      uploadBody?.data?.jobId ||
      uploadBody?.data?.job_id ||
      uploadBody?.job_id ||
      uploadBody?.id;
    expect(jobId).toBeDefined();

    // --- Consultar VMS (rápido) ---
    const vmsBaseUrl = process.env.VMS;
    const tokenVms = process.env.TOKEN_VMS;
    expect(vmsBaseUrl, "Falta VMS en .env").toBeDefined();
    expect(tokenVms, "Falta TOKEN_VMS en .env").toBeDefined();

    await new Promise((r) => setTimeout(r, 7000)); // espera mínima para que el job aparezca
    const jobRes = await request.get(`${vmsBaseUrl}/job-details?id=${jobId}`, {
      headers: { "X-API-KEY": tokenVms },
    });
    expect([200, 201]).toContain(jobRes.status());
    const jobData = await jobRes.json().catch(() => ({}));
    expect(jobData?.workflows?.[0]?.status).toBe("DONE");

    // --- Update (mismo ID)
    const apiToken = process.env.API_TOKEN;
    expect(apiToken, "Falta API_TOKEN en .env").toBeDefined();

    const updatePayload = {
      title: `Media actualizada ${Date.now()}`,
      description: "Descripción actualizada desde api suite test",
    };

    const updateRes = await request.post(
      `/api/media/${
        createdMedia._id ?? createdMedia.id
      }?token=${encodeURIComponent(apiToken)}`,
      { data: updatePayload }
    );
    expect([200, 201]).toContain(updateRes.status());

    const updateBody = await updateRes.json();
    expect(updateBody.status ?? updateBody.data?.status).toBe("OK");
    expect(updateBody.data.title).toBe(updatePayload.title);
    expect(updateBody.data.description).toBe(updatePayload.description);
  });

  test("TC-META-SMOKE | GET → DELETE no original → POST transcode (mismo media_id)", async ({
    request,
    createdMedia,
  }) => {
    const apiToken = process.env.API_TOKEN;
    expect(apiToken, "Falta API_TOKEN en .env").toBeDefined();
    const mediaId = createdMedia._id ?? createdMedia.id;

    // 1) GET meta
    const metaRes = await request.get(
      `/api/media/${mediaId}/meta?token=${encodeURIComponent(apiToken)}`
    );
    expect([200, 201]).toContain(metaRes.status());
    const metaBody = await metaRes.json();
    const metas = metaBody?.data?.meta ?? [];
    expect(Array.isArray(metas)).toBe(true);
    expect(metas.length).toBeGreaterThan(0);

    // elegir una meta no original
    const target = metas.find((m) => !m.is_original);
    expect(target, "Debe existir al menos una meta no original").toBeDefined();
    const metaId = target.id || target._id;

    // 2) DELETE
    const delRes = await request.delete(
      `/api/media/${mediaId}/meta/${metaId}?token=${encodeURIComponent(
        apiToken
      )}`
    );
    expect([200, 201, 204]).toContain(delRes.status());

    // confirmar que ya no esté
    // 2b) Verificar soft-delete: el meta sigue listado pero con status NEW
    const afterRes = await request.get(
      `/api/media/${mediaId}/meta?token=${encodeURIComponent(apiToken)}`
    );
    expect([200, 201]).toContain(afterRes.status());
    const afterBody = await afterRes.json();
    const afterList = afterBody?.data?.meta ?? [];

    const deletedItem = afterList.find((m) => (m.id || m._id) === metaId);
    expect(
      deletedItem,
      "El meta debe seguir listado tras DELETE (soft-delete)"
    ).toBeDefined();
    expect(deletedItem.status).toBe("NEW");

    // 3) POST transcode (solo contrato, sin polling)
    const transRes = await request.post(
      `/api/media/${mediaId}/meta/${metaId}?token=${encodeURIComponent(
        apiToken
      )}`
    );
    // Imprimir status y body de la respuesta transcode
  });
});
