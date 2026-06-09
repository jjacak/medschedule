import { and, eq, isNull } from "drizzle-orm";
import { db } from "../lib/db.js";
import { AppError } from "../lib/app-error.js";
import { broadcast } from "../lib/sse-store.js";
import { clinicAccess, clinics, delayAlerts } from "db";
import { ErrorCode } from "shared";
import type { CreateAlertInput } from "shared";

export async function createAlert(
  doctorId: string,
  clinicId: string,
  data: CreateAlertInput
) {
  const [clinic] = await db
    .select({ ownerId: clinics.ownerId })
    .from(clinics)
    .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
    .limit(1);

  if (!clinic) throw new AppError(ErrorCode.CLINIC_NOT_FOUND, 404);
  if (clinic.ownerId !== doctorId) throw new AppError(ErrorCode.FORBIDDEN, 403);

  const alertDate = data.alertDate ?? new Date().toISOString().slice(0, 10);

  const [alert] = await db
    .insert(delayAlerts)
    .values({ doctorId, clinicId, alertDate, message: data.message ?? null })
    .returning();

  await broadcast(clinicId, "delay-alert", alert);

  return alert;
}

export async function assertClinicAccess(
  clinicId: string,
  userId: string,
  role: "doctor" | "receptionist"
) {
  if (role === "doctor") {
    const [clinic] = await db
      .select({ ownerId: clinics.ownerId })
      .from(clinics)
      .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
      .limit(1);

    if (!clinic || clinic.ownerId !== userId) throw new AppError(ErrorCode.FORBIDDEN, 403);
  } else {
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
}

export async function getAlerts(
  clinicId: string,
  userId: string,
  role: "doctor" | "receptionist",
  date?: string
) {
  await assertClinicAccess(clinicId, userId, role);

  const alertDate = date ?? new Date().toISOString().slice(0, 10);

  return db
    .select()
    .from(delayAlerts)
    .where(
      and(
        eq(delayAlerts.clinicId, clinicId),
        eq(delayAlerts.alertDate, alertDate),
        eq(delayAlerts.isActive, true)
      )
    );
}

export async function deactivateAlert(alertId: string, doctorId: string) {
  const [alert] = await db
    .select({ id: delayAlerts.id, doctorId: delayAlerts.doctorId })
    .from(delayAlerts)
    .where(eq(delayAlerts.id, alertId))
    .limit(1);

  if (!alert) throw new AppError(ErrorCode.ALERT_NOT_FOUND, 404);
  if (alert.doctorId !== doctorId) throw new AppError(ErrorCode.FORBIDDEN, 403);

  await db
    .update(delayAlerts)
    .set({ isActive: false })
    .where(eq(delayAlerts.id, alertId));
}
