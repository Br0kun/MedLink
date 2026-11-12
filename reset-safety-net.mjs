/**
 * Demo/testing helper — backdates uploadedAt and clears lastNotifiedAt
 * so the Safety Net engine fires immediately on the next run.
 *
 * Run with: node reset-safety-net.mjs
 */
import 'dotenv/config'
import { prisma } from './src/config/db.js'

const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

const updated = await prisma.analysis.updateMany({
  where: { isReviewed: false },
  data: {
    lastNotifiedAt: null,   // clear cooldown lock
    uploadedAt: oneHourAgo, // fake upload time so ≥ 15 min threshold passes
  }
})

console.log(`✅ Reset ${updated.count} unreviewed analysis/analyses:`)
console.log(`   uploadedAt  → ${oneHourAgo.toISOString()} (1 hour ago)`)
console.log(`   lastNotifiedAt → null`)
console.log('\n   Now run: node run-safety-net.mjs')

await prisma.$disconnect()
