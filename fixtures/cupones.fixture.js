// fixtures/cupones.fixture.js
const { test: base } = require("@playwright/test");
const { ApiClient } = require("../utils/api-client");

exports.test = base.extend({
  cuponesData: async ({ request }, use) => {
    const api = new ApiClient(request);

    // 1. Obtener cupones existentes
    const getRes = await api.get("/api/coupon", { limit: 10 });
    const cupones = getRes.data?.data || [];

    // 2. Extraer datos útiles
    const reusable = cupones.find((c) => c.is_reusable && c.is_valid);
    const used = cupones.find((c) => c.is_used);
    const groupId = reusable?.group?._id || cupones[0]?.group?._id;
    const couponId = reusable?._id || cupones[0]?._id;
    const couponCode = reusable?.code || cupones[0]?.code;

    // 3. Crear cupón de prueba si no hay reutilizable
    let createdCoupon = null;
    if (!reusable && groupId) {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const payload = {
        group: groupId,
        valid_from: now.toISOString(),
        valid_to: tomorrow.toISOString(),
        is_reusable: true,
        max_use: 5,
        customer_max_use: 2,
        custom_code: `TEST-${Date.now()}`,
        detail: "Test Coupon",
        quantity: 1,
        discount_type: "amount",
        amount: 10,
        type: "ppv-live",
        type_code: "test_discount",
        payment_required: false,
        metadata: { test: true },
      };
      const postRes = await api.postJson("/api/coupon", payload);
      createdCoupon = postRes.data?.data?.[0];
    }

    await use({
      cupones,
      reusable,
      used,
      groupId,
      couponId,
      couponCode,
      createdCoupon,
    });
  },
});
