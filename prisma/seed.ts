import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create blocks
  const blockA1 = await prisma.block.upsert({
    where: { blockCode: "A1" },
    update: {},
    create: {
      blockName: "Block A1",
      blockCode: "A1",
      areaHectares: 10.5,
    },
  });

  await prisma.block.upsert({
    where: { blockCode: "B1" },
    update: {},
    create: {
      blockName: "Block B1",
      blockCode: "B1",
      areaHectares: 12.0,
    },
  });

  console.log("✅ Blocks created");

  // Create sample palms
  const palms = [];
  for (let i = 1; i <= 10; i++) {
    const palm = await prisma.palm.upsert({
      where: { qrCode: `RP-A1-${String(i).padStart(5, "0")}` },
      update: {},
      create: {
        blockId: blockA1.id,
        qrCode: `RP-A1-${String(i).padStart(5, "0")}`,
        rowNumber: Math.floor((i - 1) / 5) + 1,
        columnNumber: ((i - 1) % 5) + 1,
        plantingDate: new Date("2020-01-15"),
        variety: "Tenera",
        status: "ACTIVE",
      },
    });
    palms.push(palm);
  }

  console.log("✅ Palms created");

  // Create employees
  const adminEmployee = await prisma.employee.upsert({
    where: { employeeCode: "EMP001" },
    update: {},
    create: {
      employeeCode: "EMP001",
      fullName: "Admin User",
      role: "ADMIN",
      phone: "+2348000000001",
      isActive: true,
    },
  });

  const supervisorEmployee = await prisma.employee.upsert({
    where: { employeeCode: "EMP002" },
    update: {},
    create: {
      employeeCode: "EMP002",
      fullName: "Supervisor User",
      role: "SUPERVISOR",
      phone: "+2348000000002",
      isActive: true,
    },
  });

  const workerEmployee = await prisma.employee.upsert({
    where: { employeeCode: "EMP003" },
    update: {},
    create: {
      employeeCode: "EMP003",
      fullName: "Field Worker",
      role: "WORKER",
      phone: "+2348000000003",
      isActive: true,
    },
  });

  console.log("✅ Employees created");

  // Create users with hashed passwords
  const hashedPassword = await bcrypt.hash("password123", 12);

  await prisma.user.upsert({
    where: { username: "admin@royalpalm.com" },
    update: {},
    create: {
      employeeId: adminEmployee.id,
      username: "admin@royalpalm.com",
      passwordHash: hashedPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { username: "supervisor@royalpalm.com" },
    update: {},
    create: {
      employeeId: supervisorEmployee.id,
      username: "supervisor@royalpalm.com",
      passwordHash: hashedPassword,
      role: "SUPERVISOR",
    },
  });

  await prisma.user.upsert({
    where: { username: "worker@royalpalm.com" },
    update: {},
    create: {
      employeeId: workerEmployee.id,
      username: "worker@royalpalm.com",
      passwordHash: hashedPassword,
      role: "WORKER",
    },
  });

  console.log("✅ Users created");
  console.log("🎉 Seeding completed!");
  console.log("\nTest credentials:");
  console.log("Admin: admin@royalpalm.com / password123");
  console.log("Supervisor: supervisor@royalpalm.com / password123");
  console.log("Worker: worker@royalpalm.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
