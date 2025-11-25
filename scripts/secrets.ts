import { execSync } from "node:child_process";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";

const secrets = [
  "RABBITMQ_USER",
  "RABBITMQ_PASSWORD",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "JWT_SECRET",
];

function askQuestion(query: string): Promise<string> {
  const rl = createInterface({
    input: stdin,
    output: stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.toLowerCase());
    });
  });
}

async function main() {
  for (const secret of secrets) {
    const answer = await askQuestion(`¿Quieres configurar el secreto "${secret}"? (y/n): `);
    if (answer === "y" || answer === "yes") {
      console.log(`Configurando secreto: ${secret}`);
      execSync(`wrangler secret put ${secret} --env production`, { stdio: "inherit" });
    }
    else {
      console.log(`Saltando secreto: ${secret}`);
    }
  }
}

main().catch(console.error);
