import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const masterEmail = process.env.MASTER_EMAIL || "master@hidrapink.com";
  const masterPassword = process.env.MASTER_PASSWORD || "master123";
  const influencerEmail = process.env.INFLUENCER_EMAIL || "influencer@hidrapink.com";
  const influencerPassword = process.env.INFLUENCER_PASSWORD || "influencer123";

  const masterPasswordHash = await bcrypt.hash(masterPassword, 10);
  const influencerPasswordHash = await bcrypt.hash(influencerPassword, 10);

  const masterUser = await prisma.user.upsert({
    where: { email: masterEmail },
    update: {
      passwordHash: masterPasswordHash,
      role: "master",
      mustChangePassword: false,
    },
    create: {
      email: masterEmail,
      passwordHash: masterPasswordHash,
      role: "master",
      mustChangePassword: false,
    },
  });

  const influencerUser = await prisma.user.upsert({
    where: { email: influencerEmail },
    update: {
      passwordHash: influencerPasswordHash,
      role: "influencer",
      mustChangePassword: false,
    },
    create: {
      email: influencerEmail,
      passwordHash: influencerPasswordHash,
      role: "influencer",
      mustChangePassword: false,
    },
  });

  await prisma.influencer.upsert({
    where: { instagram: "hidra.influencer" },
    update: {
      userId: influencerUser.id,
      email: influencerEmail,
    },
    create: {
      name: "Influenciadora Exemplo",
      instagram: "hidra.influencer",
      email: influencerEmail,
      coupon: "HIDRA10",
      commissionRate: new Prisma.Decimal("0.10"),
      salesQuantity: 0,
      salesValue: new Prisma.Decimal("0"),
      userId: influencerUser.id,
    },
  });

  console.log("Seed completed:");
  console.log(`  Master -> ${masterEmail} / ${masterPassword}`);
  console.log(`  Influencer -> ${influencerEmail} / ${influencerPassword}`);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
