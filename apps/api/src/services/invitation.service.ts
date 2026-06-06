import { and, eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { AppError } from "../lib/app-error.js";
import { clinicAccess, invitations, users } from "db";
import { ErrorCode } from "shared";
import type { InviteUserInput } from "shared";
import { assertOwner } from "./clinic.service.js";

export async function inviteUser(
  clinicId: string,
  ownerId: string,
  data: InviteUserInput
) {
  await assertOwner(clinicId, ownerId);

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [invitation] = await db
    .insert(invitations)
    .values({ clinicId, email: data.email, token, expiresAt })
    .returning();

  return invitation;
}

export async function acceptInvitation(token: string, userId: string) {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);

  if (!invitation) throw new AppError(ErrorCode.INVITATION_NOT_FOUND, 404);

  if (invitation.status !== "pending" || invitation.expiresAt < new Date()) {
    throw new AppError(ErrorCode.INVITATION_EXPIRED, 410);
  }

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.email !== invitation.email) {
    throw new AppError(ErrorCode.FORBIDDEN, 403);
  }

  const [existingAccess] = await db
    .select({ id: clinicAccess.id })
    .from(clinicAccess)
    .where(
      and(
        eq(clinicAccess.clinicId, invitation.clinicId),
        eq(clinicAccess.receptionistId, userId),
        eq(clinicAccess.status, "active")
      )
    )
    .limit(1);

  if (existingAccess) throw new AppError(ErrorCode.ALREADY_MEMBER, 409);

  await db.transaction(async (tx) => {
    await tx.insert(clinicAccess).values({
      clinicId: invitation.clinicId,
      receptionistId: userId,
    });

    await tx
      .update(invitations)
      .set({ status: "accepted" })
      .where(eq(invitations.id, invitation.id));
  });
}

export async function getStaff(clinicId: string, ownerId: string) {
  await assertOwner(clinicId, ownerId);

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      grantedAt: clinicAccess.grantedAt,
    })
    .from(clinicAccess)
    .innerJoin(users, eq(users.id, clinicAccess.receptionistId))
    .where(
      and(
        eq(clinicAccess.clinicId, clinicId),
        eq(clinicAccess.status, "active")
      )
    );
}

export async function revokeAccess(
  clinicId: string,
  memberId: string,
  ownerId: string
) {
  await assertOwner(clinicId, ownerId);

  if (memberId === ownerId) throw new AppError(ErrorCode.FORBIDDEN, 403);

  const [revoked] = await db
    .update(clinicAccess)
    .set({ status: "revoked" })
    .where(
      and(
        eq(clinicAccess.clinicId, clinicId),
        eq(clinicAccess.receptionistId, memberId),
        eq(clinicAccess.status, "active")
      )
    )
    .returning({ id: clinicAccess.id });

  if (!revoked) throw new AppError(ErrorCode.USER_NOT_FOUND, 404);
}
