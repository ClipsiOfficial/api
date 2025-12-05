#!/usr/bin/env node

/**
 * Database Setup Script
 * Creates the database directory structure and runs migrations and seeds
 * Compatible with Windows, macOS, and Linux
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path configuration
const dbDir = path.join(process.cwd(), ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const dbFile = path.join(dbDir, "626f94dc3f5df36314f9f96e8d9a65a79b8477532bde6ba286c1ce0b7d42e990.sqlite");

async function setupDatabase() {
  try {
    console.log("📦 Starting database setup...\n");

    // Step 1: Remove existing database if it exists
    console.log("🗑️  Removing existing database...");
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
      console.log(`✅ Removed: ${dbFile}`);
    }
    else {
      console.log("✅ No existing database to remove");
    }

    // Step 2: Create directory structure
    console.log("\n📁 Creating database directory structure...");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`✅ Created: ${dbDir}`);
    }
    else {
      console.log(`✅ Directory already exists: ${dbDir}`);
    }

    // Step 3: Create fresh database file
    console.log("\n📄 Creating fresh database file...");
    fs.writeFileSync(dbFile, "");
    console.log(`✅ Created: ${dbFile}`);

    // Step 4: Run migrations
    console.log("\n🔄 Running migrations...");
    execSync("pnpm exec drizzle-kit push", { stdio: "inherit" });
    console.log("✅ Migrations completed");

    // Step 5: Seed the database
    console.log("\n🌱 Seeding database...");
    execSync("pnpm exec tsx scripts/seed.ts", { stdio: "inherit" });
    console.log("✅ Database seeded");

    console.log("\n✨ Database setup completed successfully!");
  }
  catch (error) {
    console.error("\n❌ Error during database setup:");
    if (error instanceof Error) {
      console.error(error.message);
    }
    else {
      console.error(error);
    }
    process.exit(1);
  }
}

setupDatabase();
