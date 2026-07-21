import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client'; 
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  
  constructor() {
    // 1. Create a native Postgres pool using your database URL
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // 2. Wrap the pool in Prisma's new driver adapter
    const adapter = new PrismaPg(pool);
    
    // 3. Pass the adapter to satisfy Prisma 7's strict constructor rules!
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}