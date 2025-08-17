require("dotenv").config();
const { logger } = require("./logger");

/** Error enriquecido para debug */
class ApiError extends Error {
  constructor(message, meta = {}) {
    super(message);
    this.name = "ApiError";
    Object.assign(this, meta); // method, url, status, requestId, durationMs, responseSnippet
  }
}

class ApiClient {
  /**
   * @param {import('@playwright/test').APIRequestContext} request
   * @param {{ baseUrl?: string, token?: string }} [opts]
   */
  constructor(request, opts = {}) {
    this.request = request;
    this.baseUrl = opts.baseUrl || process.env.API_BASE_URL || "";
    this.token = opts.token || process.env.API_TOKEN || "";

    if (!this.baseUrl || !this.token) {
      throw new Error("Faltan variables de entorno API_BASE_URL o API_TOKEN");
    }
  }

  /** GET con params */
  async get(endpoint, params = {}) {
    return this._request("GET", endpoint, { params });
  }

  /** POST x-www-form-urlencoded */
  async postForm(endpoint, form = {}, params = {}) {
    return this._request("POST", endpoint, { params, form });
  }

  /** POST JSON */
  async postJson(endpoint, data = {}, params = {}) {
    return this._request("POST", endpoint, { params, data });
  }

  /** PUT JSON */
  async putJson(endpoint, data = {}, params = {}) {
    return this._request("PUT", endpoint, { params, data });
  }

  /** PATCH JSON */
  async patchJson(endpoint, data = {}, params = {}) {
    return this._request("PATCH", endpoint, { params, data });
  }

  /** DELETE (opcionalmente con params) */
  async delete(endpoint, params = {}) {
    return this._request("DELETE", endpoint, { params });
  }

  /** Núcleo: hace la request, loggea y enriquece errores */
  async _request(
    method,
    endpoint,
    { params = {}, headers = {}, data, form } = {}
  ) {
    // agrega token a query si no está presente
    if (!("token" in params)) params.token = this.token;

    const url = this._buildUrl(endpoint, params);
    const started = Date.now();

    const baseHeaders = {
      "X-API-Token": this.token,
      ...headers,
    };

    const requestOptions = { method, headers: baseHeaders };
    if (data !== undefined) {
      requestOptions.data = data; // JSON
      requestOptions.headers["Content-Type"] = "application/json";
    }
    if (form !== undefined) {
      requestOptions.form = form; // x-www-form-urlencoded
      requestOptions.headers["Content-Type"] =
        "application/x-www-form-urlencoded";
    }

    // Log de salida (DEBUG)
    logger.debug({
      msg: "API request start",
      method,
      url,
      hasData: data !== undefined,
      hasForm: form !== undefined,
    });

    try {
      const response = await this.request.fetch(url, requestOptions);
      const durationMs = Date.now() - started;
      const status = response.status();
      const headersObj = Object.fromEntries(
        response.headersArray().map((h) => [h.name.toLowerCase(), h.value])
      );
      const requestId =
        headersObj["x-request-id"] || headersObj["x-correlation-id"];

      // Intentar parsear JSON; si falla, devolver texto
      const text = await response.text();
      let parsed;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }

      if (status >= 400) {
        const snippet = text?.slice(0, 1000); // limitar tamaño
        logger.error({
          msg: "API request error",
          method,
          url,
          status,
          requestId,
          durationMs,
          responseSnippet: snippet,
        });
        throw new ApiError(`HTTP ${status} en ${method} ${url}`, {
          method,
          url,
          status,
          requestId,
          durationMs,
          responseSnippet: snippet,
        });
      }

      logger.info({
        msg: "API request success",
        method,
        url: maskToken(url),
        status,
        requestId,
        durationMs,
      });

      return { status, data: parsed ?? text ?? null, headers: headersObj };
    } catch (err) {
      // Errores de red, timeouts, etc.
      const durationMs = Date.now() - started;
      logger.error({
        msg: "API request failure",
        method,
        url,
        durationMs,
        errorName: err.name,
        errorMessage: err.message,
      });

      if (err instanceof ApiError) throw err; // ya enriquecido
      throw new ApiError(
        `Fallo de red/cliente en ${method} ${url}: ${err.message}`,
        {
          method,
          url,
          status: undefined,
          requestId: undefined,
          durationMs,
        }
      );
    }
  }

  /** Construye la URL con querystring */
  _buildUrl(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const sep = endpoint.includes("?") ? "&" : "?";
    return `${this.baseUrl}${endpoint}${query ? sep + query : ""}`;
  }
}

/** Oculta el token en la URL para los logs */
function maskToken(url) {
  return url.replace(/(token=)[^&]+/, "$1[REDACTED]");
}

module.exports = { ApiClient, ApiError };
