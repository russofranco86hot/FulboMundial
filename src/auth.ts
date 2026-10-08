import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/lib/auth-credentials";

/**
 * Auth.js (NextAuth v5) con Google y Email/Contraseña.
 * Estrategia JWT: el vínculo jugador se resuelve por google_id o por email
 * contra la tabla `players`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Email y Contraseña",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const player = await verifyCredentials(email, password);
        if (!player) return null;

        return {
          id: String(player.id),
          name: player.name,
          email: player.email,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, profile }) {
      if (profile) {
        token.googleId = profile.sub as string;
        token.email = profile.email as string;
        token.name = (profile.name as string) ?? token.name;
        token.picture = (profile.picture as string) ?? token.picture;
      }
      if (user) {
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { googleId?: string }).googleId = token.googleId as string;
      }
      return session;
    },
  },
});
