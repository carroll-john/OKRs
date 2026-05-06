import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const authOptions: AuthOptions = {
  session: { strategy: 'jwt' },
  providers: [CredentialsProvider({
    name: 'Credentials',
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
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
