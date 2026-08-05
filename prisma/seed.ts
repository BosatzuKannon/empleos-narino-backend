// =======================================================
// SEED — Categorías de servicios (talent marketplace)
// Ejecutar con: npx prisma db seed
// (idempotente: usa upsert sobre el nombre único)
// =======================================================

import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const SERVICE_CATEGORIES = [
  'Construcción y Obras',
  'Plomería',
  'Electricidad',
  'Reparaciones y Mantenimiento',
  'Diseño Gráfico',
  'Tecnología y Soporte',
  'Educación y Tutorías',
  'Salud y Bienestar',
  'Gastronomía y Cocina',
  'Agricultura y Jardinería',
  'Aseo y Limpieza',
  'Transporte y Mudanzas',
  'Belleza y Estética',
  'Fotografía y Video',
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    for (const name of SERVICE_CATEGORIES) {
      await prisma.serviceCategory.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    console.log(`Seed completado: ${SERVICE_CATEGORIES.length} categorías creadas.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Error ejecutando el seed:', error);
  process.exit(1);
});
