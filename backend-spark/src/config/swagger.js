const swaggerJsdoc = require("swagger-jsdoc");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Sparks Teacher Panel API",
      version: "1.0.0",
      description:
        "REST API documentation for Sparks Teacher Panel Backend",
      contact: {
        name: "Sparks Team",
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: "Development Server",
      },
    ],
  },
  apis: ["./src/routes/*.js"], // Path to route files with Swagger comments
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;

