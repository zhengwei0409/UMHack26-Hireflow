#!/usr/bin/env python3
import os
import sys
sys.path.insert(0, '/home/unix/UMHack26-Hireflow/backend/node_modules/@prisma/client')

# Use environment variable
os.environ['DATABASE_URL'] = 'postgresql://postgres:password@localhost:5432/umhack_hr'

try:
    from prisma import Prisma
    import asyncio
    
    async def main():
        db = Prisma()
        await db.connect()
        candidates = await db.candidate.find_many(select={'id': True, 'full_name': True})
        for c in candidates:
            print(f"{c.id}: {c.full_name}")
        await db.disconnect()
    
    asyncio.run(main())
except ImportError:
    # Fallback to psycopg2
    import psycopg2
    conn = psycopg2.connect("postgresql://postgres:password@localhost:5432/umhack_hr")
    cur = conn.cursor()
    cur.execute("SELECT id, full_name FROM candidates LIMIT 10")
    for row in cur.fetchall():
        print(f"{row[0]}: {row[1]}")
    conn.close()