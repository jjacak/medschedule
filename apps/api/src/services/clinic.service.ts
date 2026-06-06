import { and, eq, isNull } from "drizzle-orm";
import { db } from "../lib/db.js";
import { CLINIC_COLORS } from "../lib/consts.js";
import { AppError } from "../lib/app-error.js";
import { clinics, clinicAccess } from "db";
import { ErrorCode } from "shared";
import type { CreateClinicInput, UpdateClinicInput } from "shared";

function randomColor() {
  return CLINIC_COLORS[Math.floor(Math.random() * CLINIC_COLORS.length)];
}

export async function assertOwner(clinicId: string, ownerId: string) {
  const [clinic] = await db
    .select({ id: clinics.id, ownerId: clinics.ownerId })
    .from(clinics)
    .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
    .limit(1);

  if (!clinic) throw new AppError(ErrorCode.CLINIC_NOT_FOUND, 404);
  if (clinic.ownerId !== ownerId) throw new AppError(ErrorCode.FORBIDDEN, 403);
}

export async function createClinic(ownerId: string, data: CreateClinicInput) {
  const color = data.color ?? randomColor();

  const [clinic] = await db
    .insert(clinics)
    .values({ ownerId, name: data.name, address: data.address, color })
    .returning();

  return clinic;
}

export async function getClinicsForUser(
  userId: string,
  role: "doctor" | "receptionist"
) {
  if (role === "doctor") {
    return db
      .select()
      .from(clinics)
      .where(and(eq(clinics.ownerId, userId), isNull(clinics.deletedAt)));
  }

  return db
    .select({
      id: clinics.id,
      ownerId: clinics.ownerId,
      name: clinics.name,
      address: clinics.address,
      color: clinics.color,
      createdAt: clinics.createdAt,
      deletedAt: clinics.deletedAt,
    })
    .from(clinics)
    .innerJoin(clinicAccess, eq(clinicAccess.clinicId, clinics.id))
    .where(
      and(
        eq(clinicAccess.receptionistId, userId),
        eq(clinicAccess.status, "active"),
        isNull(clinics.deletedAt)
      )
    );
}

export async function getClinicById(
  clinicId: string,
  userId: string,
  role: "doctor" | "receptionist"
) {
  const [clinic] = await db
    .select()
    .from(clinics)
    .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
    .limit(1);

  if (!clinic) throw new AppError(ErrorCode.CLINIC_NOT_FOUND, 404);

  if (role === "doctor" && clinic.ownerId !== userId) {
    throw new AppError(ErrorCode.FORBIDDEN, 403);
  }

  if (role === "receptionist") {
    const [access] = await db
      .select({ id: clinicAccess.id })
      .from(clinicAccess)
      .where(
        and(
          eq(clinicAccess.clinicId, clinicId),
          eq(clinicAccess.receptionistId, userId),
          eq(clinicAccess.status, "active")
        )
      )
      .limit(1);

    if (!access) throw new AppError(ErrorCode.FORBIDDEN, 403);
  }

  return clinic;
}

export async function updateClinic(
  clinicId: string,
  ownerId: string,
  data: UpdateClinicInput
) {
  await assertOwner(clinicId, ownerId);

  const [updated] = await db
    .update(clinics)
    .set(data)
    .where(eq(clinics.id, clinicId))
    .returning();

  return updated;
}

export async function deleteClinic(clinicId: string, ownerId: string) {
  await assertOwner(clinicId, ownerId);

  await db
    .update(clinics)
    .set({ deletedAt: new Date() })
    .where(eq(clinics.id, clinicId));
}
