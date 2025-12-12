import { execSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";
import { hash } from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

async function seed() {
  const isProd = process.env.NODE_ENV === "production";
  const dbName = process.env.CLOUDFLARE_DB_NAME;
  const email = process.env.ADMIN_EMAIL;
  const rawPassword = process.env.ADMIN_PASSWORD;

  if (!dbName || !email || !rawPassword) {
    console.error("❌ Error: Faltan variables en .env (CLOUDFLARE_DB_NAME, ADMIN_EMAIL, ADMIN_PASSWORD)");
    process.exit(1);
  }

  const username = "admin";
  console.log(`🌱 Generando seed para entorno: ${isProd ? "🚨 PRODUCCIÓN" : "💻 LOCAL"}`);

  try {
    // 1. Generar el Hash exactamente igual que en tu app
    const hashedPassword = await hash(rawPassword, 10);

    // 2. Crear el contenido SQL
    // IMPORTANTE: Incluimos 'name' y 'price' en subscription para cumplir con el NOT NULL de tu schema.ts
    const sqlContent = `
      -- Crear suscripción por defecto si no existe
      INSERT OR IGNORE INTO subscription (id, name, price, project_limit) VALUES (1, 'Plan Admin', 0, 1000);

      -- Crear usuario Admin
      INSERT OR IGNORE INTO user (username, email, password, role, subscription) 
      VALUES ('${username}', '${email}', '${hashedPassword}', 'admin', 1);
    `;

    // 3. Escribir archivo temporal (evita problemas de caracteres especiales en la terminal)
    const tempFileName = "temp_seed.sql";
    fs.writeFileSync(tempFileName, sqlContent);

    // 4. Ejecutar Wrangler apuntando al archivo
    const flag = isProd ? "--remote" : "--local";
    console.log(`🚀 Ejecutando SQL en D1 (${dbName})...`);

    // Aquí usamos --file en lugar de --command
    execSync(`npx wrangler d1 execute ${dbName} ${flag} --file=${tempFileName}`, {
      stdio: "inherit",
    });

    // 5. Limpieza
    fs.unlinkSync(tempFileName);
    console.log("✅ Seed completado y archivo temporal eliminado.");
  }
  catch (error) {
    console.error("❌ Error durante el seed:", error);
    // Intentar borrar el archivo si falló
    try {
      fs.unlinkSync("temp_seed.sql");
    }
    catch { }
    process.exit(1);
  }
}

seed();
