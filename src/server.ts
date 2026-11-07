import "dotenv/config";
import { app } from "./app.js";
import { env } from "./config/env.js";
const server = app.listen(env.port, () => console.log(`Server listening on port ${env.port}`));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => { server.close(() => process.exit(0)); });
}
