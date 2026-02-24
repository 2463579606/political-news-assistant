import { serve } from "@hono/node-server"
import app from "./routes/news-simple.js"

const port = 3001

console.log("Starting Political News Assistant API (Demo)...")
console.log(`Server will run on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
