const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const ajvErrors = require("ajv-errors");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajvErrors(ajv);

module.exports = { ajv };