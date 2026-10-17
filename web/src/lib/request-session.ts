import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import { authOptions, portalAuthOptions } from './auth';

// A header selects the session, never a role or identity. Both sessions still
// require their own signed HttpOnly cookie and the endpoint's existing RBAC.
export async function getRequestSession() {
  const scope = (await headers()).get('x-auth-scope');
  return getServerSession(scope === 'portal' ? portalAuthOptions : authOptions);
}
