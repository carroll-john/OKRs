import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_USER, isLocalDemoMode } from './demo-data';

export const authOptions: AuthOptions = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET ?? (process.env.NODE_ENV === 'production' ? undefined : 'local-demo-secret'),
  providers: [CredentialsProvider({
    name: 'Credentials',
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
      if (isLocalDemoMode()) {
        if (credentials.email === DEMO_EMAIL && credentials.password === DEMO_PASSWORD) {
          return DEMO_USER;
        }
        return null;
      }

      const user = await prisma.user.findUnique({ where: { email: credentials.email } });
      if (!user) return null;
      const ok = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!ok) return null;
      return { id: user.id, email: user.email, name: user.name };
    }
  })],
  callbacks: {
    async jwt({ token, user }) { if (user) token.sub = user.id; return token; }
  }
};
