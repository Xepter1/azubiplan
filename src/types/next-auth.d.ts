// Erweitert die Auth.js-Typen um unsere Felder (tenantId, role),
// damit Session und JWT projektweit typsicher sind.
import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    tenantId: string;
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId: string;
    role: UserRole;
  }
}
