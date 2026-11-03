import "server-only";

import { getDatabase } from "../db/client";
import {
  changeProjectMembershipForActor,
  LastOwnerError,
  type MembershipChange,
  ResourceNotFoundError,
} from "./membership-change";
import { requireVerifiedSession } from "./session";

export { LastOwnerError, ResourceNotFoundError };

export async function changeProjectMembership(
  projectId: string,
  targetUserId: string,
  change: MembershipChange,
) {
  const session = await requireVerifiedSession();
  return changeProjectMembershipForActor(
    getDatabase(),
    session.user.id,
    projectId,
    targetUserId,
    change,
  );
}
