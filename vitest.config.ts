import { fileURLToPath, URL } from "node:url";

const vitestConfig = {
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
  },
};

export default vitestConfig;
