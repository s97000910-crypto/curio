import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  authenticateUser,
  createAuthSession,
  deleteAuthSession,
  getCurrentUser,
  registerUser,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  updateUserProfile,
} from '@/lib/services/auth';

type ProfileUpdate = Parameters<typeof updateUserProfile>[1];

function getString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function getProfileUpdate(value: unknown): ProfileUpdate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const input = value as Record<string, unknown>;
  const update: ProfileUpdate = {};
  const stringFields = ['display_name', 'bio', 'avatar_url'] as const;
  const arrayFields = ['interests', 'subjects', 'languages'] as const;

  for (const field of stringFields) {
    if (field in input) {
      if (typeof input[field] !== 'string') return null;
      update[field] = input[field];
    }
  }
  for (const field of arrayFields) {
    if (field in input) {
      if (!Array.isArray(input[field]) || !input[field].every((item) => typeof item === 'string')) {
        return null;
      }
      update[field] = input[field];
    }
  }

  return update;
}

function setSessionCookie(response: NextResponse, token: string, expires: Date): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
    maxAge: SESSION_DURATION_SECONDS,
  });
  return response;
}

export async function GET() {
  try {
    return NextResponse.json({ currentUser: await getCurrentUser() });
  } catch (error) {
    console.error('Could not load the current session.', error);
    return NextResponse.json({ error: 'Could not load the current session.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Cross-origin authentication requests are not allowed.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'A valid request body is required.' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const action = getString(input.action);

  try {
    if (action === 'login') {
      const email = getString(input.email);
      const password = getString(input.password);
      if (email === null || password === null) {
        return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
      }
      const user = await authenticateUser(email, password);
      const session = createAuthSession(user.id);
      return setSessionCookie(
        NextResponse.json({ success: true, user }),
        session.token,
        session.expiresAt
      );
    }

    if (action === 'register') {
      const username = getString(input.username);
      const displayName = getString(input.display_name);
      const email = getString(input.email);
      const password = getString(input.password);
      const bio = getString(input.bio);
      if (username === null || displayName === null || email === null || password === null) {
        return NextResponse.json(
          { error: 'Username, display name, email, and password are required.' },
          { status: 400 }
        );
      }
      const user = await registerUser({ username, display_name: displayName, email, password, bio: bio ?? undefined });
      const session = createAuthSession(user.id);
      return setSessionCookie(
        NextResponse.json({ success: true, user }),
        session.token,
        session.expiresAt
      );
    }

    if (action === 'logout') {
      deleteAuthSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
      const response = NextResponse.json({ success: true });
      response.cookies.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(0),
        maxAge: 0,
      });
      return response;
    }

    if (action === 'update_profile') {
      const currentUser = await getCurrentUser();
      if (!currentUser) throw new AuthError('Please sign in to continue.', 401);
      const profileUpdate = getProfileUpdate(input.data);
      if (!profileUpdate) {
        return NextResponse.json({ error: 'Profile changes are invalid.' }, { status: 400 });
      }
      const updated = updateUserProfile(currentUser.id, profileUpdate);
      return NextResponse.json({ success: true, user: updated });
    }

    return NextResponse.json({ error: 'Unknown authentication action.' }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Authentication request failed.', error);
    return NextResponse.json({ error: 'Could not complete the authentication request.' }, { status: 500 });
  }
}
