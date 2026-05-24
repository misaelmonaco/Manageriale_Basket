import type { Role } from "@basket/contracts";
import { CalendarDays, CreditCard, FileText, Home, Palette, ReceiptText, Shield, Trophy, UserPlus, Users } from "lucide-react";

export const navigation = [
  { href: "/dashboard", label: "Overview", icon: Home, roles: ["SUPER_ADMIN", "DIRECTOR", "COACH", "PLAYER", "PARENT"] },
  { href: "/dashboard/organizations", label: "Organizations", icon: Shield, roles: ["SUPER_ADMIN"] },
  { href: "/dashboard/branding", label: "Branding", icon: Palette, roles: ["SUPER_ADMIN", "DIRECTOR"] },
  { href: "/dashboard/teams", label: "Teams", icon: Users, roles: ["SUPER_ADMIN", "DIRECTOR", "COACH", "PLAYER", "PARENT"] },
  { href: "/dashboard/players", label: "Players", icon: Users, roles: ["SUPER_ADMIN", "DIRECTOR", "COACH", "PLAYER", "PARENT"] },
  { href: "/dashboard/coaches", label: "Coaches", icon: Shield, roles: ["SUPER_ADMIN", "DIRECTOR"] },
  { href: "/dashboard/unassigned", label: "Svincolati", icon: UserPlus, roles: ["SUPER_ADMIN", "DIRECTOR"] },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays, roles: ["SUPER_ADMIN", "DIRECTOR", "COACH", "PLAYER", "PARENT"] },
  { href: "/dashboard/matches", label: "Matches", icon: Trophy, roles: ["SUPER_ADMIN", "DIRECTOR", "COACH", "PLAYER", "PARENT"] },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard, roles: ["SUPER_ADMIN", "DIRECTOR", "PLAYER", "PARENT"] },
  { href: "/dashboard/expenses", label: "Expenses", icon: ReceiptText, roles: ["SUPER_ADMIN", "DIRECTOR"] },
  { href: "/dashboard/documents", label: "Documents", icon: FileText, roles: ["SUPER_ADMIN", "DIRECTOR", "COACH", "PLAYER", "PARENT"] }
] satisfies { href: string; label: string; icon: typeof Home; roles: Role[] }[];

export function navForRole(role: Role) {
  return navigation.filter((item) => item.roles.includes(role));
}
