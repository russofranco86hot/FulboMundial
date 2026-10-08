import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth.js (NextAuth v5) con Google.
 * Estrategia JWT (sin adapter de DB): el vínculo jugador↔Google se resuelve
 * por separado contra la tabla `players` (ver src/lib/session.ts), y el admin
 * tiene la última palabra sobre los vínculos.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.googleId = profile.sub as string;
        token.email = profile.email as string;
        token.name = (profile.name as string) ?? token.name;
        token.picture = (profile.picture as string) ?? token.picture;
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
