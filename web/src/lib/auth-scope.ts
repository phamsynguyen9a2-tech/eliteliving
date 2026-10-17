import type { NextAuthOptions } from 'next-auth';
import { decode, type JWTDecodeParams } from 'next-auth/jwt';

export type AuthScope = 'tenant' | 'portal';

export function authCookies(scope: AuthScope): NonNullable<NextAuthOptions['cookies']> {
  const secure = process.env.NEXTAUTH_URL?.startsWith('https://') ?? process.env.NODE_ENV === 'production';
  const prefix = secure ? '__Secure-' : '';
  const namespace = scope === 'portal' ? 'next-auth.portal' : 'next-auth';
  const options = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure };
  return {
    sessionToken: { name: `${prefix}${namespace}.session-token`, options },
    callbackUrl: { name: `${prefix}${namespace}.callback-url`, options },
    csrfToken: { name: `${secure ? '__Host-' : ''}${namespace}.csrf-token`, options },
    pkceCodeVerifier: { name: `${prefix}${namespace}.pkce.code_verifier`, options: { ...options, maxAge: 900 } },
    state: { name: `${prefix}${namespace}.state`, options: { ...options, maxAge: 900 } },
    nonce: { name: `${prefix}${namespace}.nonce`, options },
  };
}

export function scopedDecode(scope: AuthScope) {
  return async (params: JWTDecodeParams) => {
    const token = await decode(params);
    if (!token) return null;
    if (scope === 'portal') {
      return token.authScope === 'portal' && ['LANDLORD', 'ADMIN'].includes(token.role)
        ? token : null;
    }
    // Preserve existing tenant sessions, but never reuse legacy operator sessions.
    return token.role === 'TENANT' && (!token.authScope || token.authScope === 'tenant')
      ? token : null;
  };
}

/** Wrap the existing authentication flows without duplicating their business logic. */
export function scopedAuthOptions(base: NextAuthOptions, scope: AuthScope): NextAuthOptions {
  return {
    ...base,
    cookies: authCookies(scope),
    jwt: { ...base.jwt, decode: scopedDecode(scope) },
    pages: scope === 'portal' ? { signIn: '/portal/login', error: '/portal/login' } : base.pages,
    providers: base.providers
      .filter((provider) => scope === 'tenant' || provider.type === 'credentials')
      .map((provider) => {
        if (provider.type !== 'credentials') return provider;
        const config = { ...provider, ...provider.options };
        const authorize = config.authorize as typeof provider.authorize;
        return {
          ...provider,
          options: {
            ...config,
            async authorize(credentials: Parameters<typeof authorize>[0], request: Parameters<typeof authorize>[1]) {
              const internal = credentials?.role === 'LANDLORD' || credentials?.role === 'ADMIN';
              if ((scope === 'portal') !== internal) return null;
              if (scope === 'portal' && credentials?.loginType && credentials.loginType !== 'INTERNAL') return null;
              return authorize(credentials, request);
            },
          },
        };
      }),
    callbacks: {
      ...base.callbacks,
      async signIn(args) {
        const role = args.user.role || 'TENANT';
        if (scope === 'tenant' ? role !== 'TENANT' : !['LANDLORD', 'ADMIN'].includes(role)) return false;
        return base.callbacks?.signIn ? base.callbacks.signIn(args) : true;
      },
      async jwt(args) {
        const token = base.callbacks?.jwt ? await base.callbacks.jwt(args) : args.token;
        if (args.user) token.authScope = scope;
        return token;
      },
    },
  };
}
