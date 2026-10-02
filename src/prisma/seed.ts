import "dotenv/config";

import {
  DrawMethod,
  PrismaClient,
  RaffleStatus,
  TicketStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_PASSWORD = "DevAdmin@1234";
const CREATOR_PASSWORD = "DevCreator@1234";
const BUYER_PASSWORD = "DevBuyer@1234";

const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS ?? "10", 10);

const DEV_RAFFLE_ID = "11111111-1111-4111-8111-111111111111";
const DEV_RAFFLE_TITLE = "[DEV] Rifa de Desenvolvimento Corefy";
const DEV_TICKET_NUMBERS = [7, 22, 41] as const;
const DEV_DRAW_DATE = new Date("2027-03-15T20:00:00.000Z");

interface SeedUserInput {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  isVerifiedCreator: boolean;
}

async function upsertDevUser(input: SeedUserInput) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  const data = {
    name: input.name,
    email: input.email,
    cpf: input.cpf,
    phone: input.phone,
    passwordHash,
    role: input.role,
    status: input.status,
    isVerifiedCreator: input.isVerifiedCreator,
  };

  if (existing) {
    const user = await prisma.user.update({
      where: { id: existing.id },
      data,
    });
    console.log(`Usuário atualizado: ${user.email} (${user.role})`);
    return user;
  }

  const user = await prisma.user.create({ data });
  console.log(`Usuário criado: ${user.email} (${user.role})`);
  return user;
}

async function upsertDevRaffle(creatorId: string) {
  const data = {
    creatorId,
    title: DEV_RAFFLE_TITLE,
    description:
      "Rifa fictícia exclusiva para o ambiente de desenvolvimento. Não representa um sorteio real.",
    totalTickets: 50,
    ticketPriceCents: 2500,
    drawMethod: DrawMethod.PLATFORM_RANDOM,
    drawDate: DEV_DRAW_DATE,
    status: RaffleStatus.OPEN,
  };

  const existing = await prisma.raffle.findUnique({
    where: { id: DEV_RAFFLE_ID },
  });

  if (existing) {
    const raffle = await prisma.raffle.update({
      where: { id: DEV_RAFFLE_ID },
      data,
    });
    console.log(`Rifa atualizada: ${raffle.title} (${raffle.id})`);
    return raffle;
  }

  const raffle = await prisma.raffle.create({
    data: { id: DEV_RAFFLE_ID, ...data },
  });
  console.log(`Rifa criada: ${raffle.title} (${raffle.id})`);
  return raffle;
}

async function upsertDevTickets(raffleId: string, buyerId: string) {
  for (const number of DEV_TICKET_NUMBERS) {
    const existing = await prisma.ticket.findUnique({
      where: { raffleId_number: { raffleId, number } },
    });

    const data = {
      raffleId,
      buyerId,
      number,
      status: TicketStatus.RESERVED,
      reservedUntil: null,
    };

    if (existing) {
      const ticket = await prisma.ticket.update({
        where: { id: existing.id },
        data,
      });
      console.log(
        `Ticket atualizado: número ${ticket.number} da rifa ${raffleId}`,
      );
      continue;
    }

    const ticket = await prisma.ticket.create({ data });
    console.log(`Ticket criado: número ${ticket.number} da rifa ${raffleId}`);
  }
}

async function seed() {
  const admin = await upsertDevUser({
    name: "Admin Desenvolvimento",
    email: "admin.dev@rifas-corefy.local",
    cpf: "39053344705",
    phone: "11900000001",
    password: ADMIN_PASSWORD,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    isVerifiedCreator: false,
  });

  const creator = await upsertDevUser({
    name: "Criador Desenvolvimento",
    email: "creator.dev@rifas-corefy.local",
    cpf: "52998224725",
    phone: "11900000002",
    password: CREATOR_PASSWORD,
    role: UserRole.CREATOR,
    status: UserStatus.ACTIVE,
    isVerifiedCreator: true,
  });

  const buyer = await upsertDevUser({
    name: "Comprador Desenvolvimento",
    email: "buyer.dev@rifas-corefy.local",
    cpf: "15350946056",
    phone: "11900000003",
    password: BUYER_PASSWORD,
    role: UserRole.BUYER,
    status: UserStatus.ACTIVE,
    isVerifiedCreator: false,
  });

  const raffle = await upsertDevRaffle(creator.id);
  await upsertDevTickets(raffle.id, buyer.id);

  console.log("Seed de desenvolvimento concluído.");
  console.log(
    `Contas: admin=${admin.email} | criador=${creator.email} | comprador=${buyer.email}`,
  );
}

async function main() {
  try {
    await seed();
  } catch (error) {
    console.error("Falha ao executar o seed de desenvolvimento:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
