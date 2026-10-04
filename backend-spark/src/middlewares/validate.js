const { validationResult } = require("express-validator");

/**
 * Middleware to check validation results from express-validator
 * Returns formatted error response if validation fails
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    // Log request body/query and validation errors for debugging
    console.error("❌ Validation failed – body:", JSON.stringify(req.body ?? {}, null, 2));
    console.error("❌ Validation failed – query:", JSON.stringify(req.query ?? {}, null, 2));
    console.error("❌ Validation errors:", JSON.stringify(formattedErrors, null, 2));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: formattedErrors,
    });
  }

  next();
};

module.exports = validate;
