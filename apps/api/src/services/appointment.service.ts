import { and, between, eq, isNull, or } from "drizzle-orm";
import { db } from "../lib/db.js";
import { AppError } from "../lib/app-error.js";
import { appointments, cancellationRequests, clinics, scheduleRules, users } from "db";
import { ErrorCode } from "shared";
import type { CreateAppointmentInput, CreateCancellationRequestInput } from "shared";

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function validateSlot(
  rule: { type: string; dayOfWeek: number | null; specificDate: string | null; slotFrom: string; slotTo: string; appointmentDurationMin: number },
  apptDate: string,
  apptTime: string
) {
  if (rule.type === "recurring") {
    const dayOfWeek = new Date(apptDate).getUTCDay();
    if (dayOfWeek !== rule.dayOfWeek) throw new AppError(ErrorCode.SLOT_INVALID, 422);
  } else {
    if (rule.specificDate !== apptDate) throw new AppError(ErrorCode.SLOT_INVALID, 422);
  }

  const from = timeToMinutes(rule.slotFrom);
  const to = timeToMinutes(rule.slotTo);
  const appt = timeToMinutes(apptTime);
  const duration = rule.appointmentDurationMin;

  const withinWindow = appt >= from && appt + duration <= to;
  const aligned = (appt - from) % duration === 0;

  if (!withinWindow || !aligned) throw new AppError(ErrorCode.SLOT_INVALID, 422);
}

export async function createAppointment(userId: string, data: CreateAppointmentInput) {
  const [rule] = await db
    .select()
    .from(scheduleRules)
    .where(and(eq(scheduleRules.id, data.scheduleRuleId), eq(scheduleRules.isActive, true)))
    .limit(1);

  if (!rule) throw new AppError(ErrorCode.SCHEDULE_RULE_NOT_FOUND, 404);

  validateSlot(rule, data.apptDate, data.apptTime);

  const [conflict] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, rule.doctorId),
        eq(appointments.apptDate, data.apptDate),
        eq(appointments.apptTime, data.apptTime),
        or(eq(appointments.status, "scheduled"), eq(appointments.status, "awaiting_approval"))
      )
    )
    .limit(1);

  if (conflict) throw new AppError(ErrorCode.SLOT_NOT_AVAILABLE, 409);

  const [appointment] = await db
    .insert(appointments)
    .values({
      clinicId: rule.clinicId,
      doctorId: rule.doctorId,
      scheduleRuleId: data.scheduleRuleId,
      apptDate: data.apptDate,
      apptTime: data.apptTime,
      patientName: data.patientName,
      note: data.note,
    })
    .returning();

  return appointment;
}

export async function getAppointmentsForClinic(
  clinicId: string,
  from?: string,
  to?: string
) {
  const conditions = [eq(appointments.clinicId, clinicId)];
  if (from && to) conditions.push(between(appointments.apptDate, from, to));

  return db
    .select()
    .from(appointments)
    .where(and(...conditions))
    .orderBy(appointments.apptDate, appointments.apptTime);
}

export async function getMyAppointments(doctorId: string, from?: string, to?: string) {
  const conditions = [eq(appointments.doctorId, doctorId)];
  if (from && to) conditions.push(between(appointments.apptDate, from, to));

  return db
    .select()
    .from(appointments)
    .where(and(...conditions))
    .orderBy(appointments.apptDate, appointments.apptTime);
}

export async function cancelAppointment(appointmentId: string, userId: string) {
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appointment) throw new AppError(ErrorCode.APPOINTMENT_NOT_FOUND, 404);
  if (appointment.status === "cancelled") throw new AppError(ErrorCode.APPOINTMENT_NOT_FOUND, 404);

  await db
    .update(appointments)
    .set({ status: "cancelled", cancelledBy: userId })
    .where(eq(appointments.id, appointmentId));
}

export async function createCancellationRequest(
  doctorId: string,
  clinicId: string,
  data: CreateCancellationRequestInput
) {
  const [clinic] = await db
    .select({ ownerId: clinics.ownerId })
    .from(clinics)
    .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
    .limit(1);

  if (!clinic) throw new AppError(ErrorCode.CLINIC_NOT_FOUND, 404);
  if (clinic.ownerId !== doctorId) throw new AppError(ErrorCode.FORBIDDEN, 403);

  await db.transaction(async (tx) => {
    await tx.insert(cancellationRequests).values({
      doctorId,
      clinicId,
      targetDate: data.targetDate,
      appointmentId: data.appointmentId ?? null,
      reason: data.reason ?? null,
    });


    const conditions = data.appointmentId
      ? [eq(appointments.id, data.appointmentId), eq(appointments.status, "scheduled")]
      : [
          eq(appointments.clinicId, clinicId),
          eq(appointments.doctorId, doctorId),
          eq(appointments.apptDate, data.targetDate),
          eq(appointments.status, "scheduled"),
        ];

    await tx
      .update(appointments)
      .set({ status: "awaiting_approval" })
      .where(and(...conditions));
  });
}

export async function getCancellationRequests(clinicId: string) {
  return db
    .select()
    .from(cancellationRequests)
    .where(eq(cancellationRequests.clinicId, clinicId))
    .orderBy(cancellationRequests.createdAt);
}

export async function confirmCancellationRequest(requestId: string, userId: string) {
  const [request] = await db
    .select()
    .from(cancellationRequests)
    .where(eq(cancellationRequests.id, requestId))
    .limit(1);

  if (!request || request.status === "confirmed") throw new AppError(ErrorCode.CANCELLATION_REQUEST_NOT_FOUND, 404);

  await db.transaction(async (tx) => {
    await tx
      .update(cancellationRequests)
      .set({ status: "confirmed" })
      .where(eq(cancellationRequests.id, requestId));

    const conditions = request.appointmentId
      ? [eq(appointments.id, request.appointmentId)]
      : [
          eq(appointments.clinicId, request.clinicId),
          eq(appointments.doctorId, request.doctorId),
          eq(appointments.apptDate, request.targetDate),
          eq(appointments.status, "awaiting_approval"),
        ];

    await tx
      .update(appointments)
      .set({ status: "cancelled", cancelledBy: userId })
      .where(and(...conditions));
  });
}
