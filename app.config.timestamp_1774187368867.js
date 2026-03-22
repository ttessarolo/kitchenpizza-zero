// app.config.ts
import { defineConfig } from "@tanstack/react-start/config";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import netlifyPlugin from "@netlify/vite-plugin-tanstack-start";
var app_config_default = defineConfig({
  vite: {
    plugins: [
      viteTsConfigPaths(),
      tailwindcss(),
      netlifyPlugin()
    ]
  }
});
export {
  app_config_default as default
};
