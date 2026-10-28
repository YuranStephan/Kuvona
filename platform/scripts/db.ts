// Database maintenance: npm run db:migrate | db:seed | db:seed-catalog | db:reset | create-admin -- email "Nome"
import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { localDataDir, migratePostgres, openPglite, openPostgres } from "../src/server/db/client";
import { users } from "../src/server/db/schema";
import { hashPassword } from "../src/server/auth/password";
import { LOCAL_ACCOUNTS, seedCatalogOnly, seedIfEmpty } from "../src/server/seed/seed";

const [command, ...args] = process.argv.slice(2);
const url = process.env.DATABASE_URL;

async function open() {
  return url ? openPostgres(url) : openPglite(localDataDir());
}

async function main() {
  switch (command) {
    case "migrate": {
      if (url) await migratePostgres(url);
      else await (await openPglite(localDataDir())).close();
      console.log("Migrações aplicadas.");
      return;
    }
    case "seed": {
      if (url) throw new Error("O seed cria contas de teste com palavras-passe conhecidas e só corre na base de dados local.");
      const { db, close } = await openPglite(localDataDir());
      const seeded = await seedIfEmpty(db);
      await close();
      console.log(seeded ? "Dados de demonstração criados." : "A base de dados já tem dados; nada foi alterado.");
      if (seeded) for (const a of LOCAL_ACCOUNTS) console.log(`  ${a.role.padEnd(10)} ${a.email}  ${a.password}`);
      return;
    }
    case "seed-catalog": {
      // Safe on a hosted database: no test accounts, no demo payment numbers. Skips if courses already exist.
      const { db, close } = await open();
      const loaded = await seedCatalogOnly(db);
      await close();
      console.log(loaded ? "Catálogo inicial carregado (8 cursos, vídeos públicos do YouTube)." : "Já existem cursos; nada foi alterado.");
      return;
    }
    case "reset": {
      if (url) throw new Error("Reset só é permitido na base de dados local.");
      if (!args.includes("--yes")) throw new Error("Isto apaga todos os dados locais. Repete com: npm run db:reset -- --yes");
      await rm(localDataDir(), { recursive: true, force: true });
      console.log("Base de dados local apagada. Será recriada no próximo arranque.");
      return;
    }
    case "create-admin": {
      const [email, ...nameParts] = args;
      const name = nameParts.join(" ").trim();
      if (!email || !name) throw new Error('Uso: npm run create-admin -- email@exemplo.com "Nome Apelido"');
      const password = randomBytes(12).toString("base64url");
      const { db, close } = await open();
      const normalized = email.trim().toLowerCase();
      const [existing] = await db.select().from(users).where(eq(users.email, normalized));
      if (existing) {
        await db.update(users).set({ role: "admin", passwordHash: await hashPassword(password) }).where(eq(users.id, existing.id));
      } else {
        await db.insert(users).values({ email: normalized, name, role: "admin", passwordHash: await hashPassword(password), emailVerifiedAt: new Date() });
      }
      await close();
      console.log(`Conta de gestão pronta: ${normalized}\nPalavra-passe temporária (mostrada uma única vez): ${password}\nMuda-a em Conta → Segurança depois de entrar.`);
      return;
    }
    default:
      throw new Error("Comandos: migrate | seed | seed-catalog | reset | create-admin");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
