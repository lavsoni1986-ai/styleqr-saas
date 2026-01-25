import nextVitals from "eslint-config-next/core-web-vitals";

const config = [{ ignores: ["deprecated/**", "node_modules/**", ".next/**"] }, ...nextVitals];
export default config;
