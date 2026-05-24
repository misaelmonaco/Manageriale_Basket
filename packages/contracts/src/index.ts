export const roles = ["SUPER_ADMIN", "DIRECTOR", "COACH", "PLAYER", "PARENT"] as const;

export type Role = (typeof roles)[number];

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    organizationId: string | null;
    email: string;
    role: Role;
    firstName: string;
    lastName: string;
  };
  profileAssignment?: {
    assignedToOrganization: boolean;
    assignmentStatus: "ASSIGNED" | "UNASSIGNED";
    organizationSlug: string | null;
  };
};

export type ApiPage<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  fiscalCode: string | null;
  email: string | null;
  phone: string | null;
  settings: Record<string, unknown>;
  subscription: string;
  createdAt: string;
  updatedAt: string;
};
