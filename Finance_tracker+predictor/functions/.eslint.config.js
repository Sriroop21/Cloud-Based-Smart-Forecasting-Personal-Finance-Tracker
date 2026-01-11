module.exports = {
  extends: [
    "eslint:recommended", // Basic recommended linting rules
    "plugin:node/recommended", // Node-specific linting rules
  ],
  env: {
    node: true,
    es2021: true, // Ensure compatibility with ES2021 features
  },
  parserOptions: {
    ecmaVersion: 2021, // Use ECMAScript 2021 syntax
    sourceType: "module", // Use modules (ESM)
  },
  rules: {
    "max-len": ["error", { code: 80 }], // Enforce max-len of 80 characters
  },
};
