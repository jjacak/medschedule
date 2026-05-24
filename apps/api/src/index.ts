import { Hono } from "hono";
import { serve } from "@hono/node-server";
import "dotenv/config";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    message: "API working",
  });
});

serve({
  fetch: app.fetch,
  port: 3001,
});
