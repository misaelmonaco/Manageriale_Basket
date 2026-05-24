import { Role } from "@prisma/client";

export type RequestUser = {
  sub: string;
  organizationId: string | null;
  email: string;
  role: Role;
};
