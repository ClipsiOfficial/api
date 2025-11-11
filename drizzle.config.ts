import { env } from "node:process";
import { D1Helper } from "@nerdfolio/drizzle-d1-helpers";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// I prefer to load from here than to duplicate the vars in .env
dotenv.config({ path: "./.env" });

// Replace with your D1 database binding name
const crawledDbHelper = D1Helper.get("DB");
const isProd = () => env.NODE_ENV === "production";

function getCredentials() {
  const prod = {
    driver: "d1-http",
    dbCredentials: {
      ...crawledDbHelper.withCfCredentials(
        env.CLOUDFLARE_ACCOUNT_ID,
        env.CLOUDFLARE_D1_TOKEN,
      ).proxyCredentials,
    },
  };

  const dev = {
    dbCredentials: {
      url: crawledDbHelper.sqliteLocalFileCredentials.url,
    },
  };
  return isProd() ? prod : dev;
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  ...getCredentials(),
});
