import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";

// Zentrale Auth.js-Konfiguration.
// Login per E-Mail + Passwort (Credentials). Die Session ist ein JWT und trägt
// zusätzlich tenantId und role — daraus speist sich die Mandantentrennung.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        // TODO (klären): E-Mail ist nur je Mandant eindeutig. Für echtes
        // Multi-Tenant-Login brauchen wir später Mandanten-Auswahl/Subdomain.
        const user = await prisma.user.findFirst({
          where: { email, deletedAt: null },
        });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          tenantId: user.tenantId,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.tenantId = String(token.tenantId ?? "");
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
});
