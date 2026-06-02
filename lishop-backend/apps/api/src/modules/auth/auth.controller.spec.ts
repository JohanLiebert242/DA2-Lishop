import { AuthController } from './auth.controller';

describe('AuthController OAuth initiate', () => {
  const authService = {} as never;
  const req = { headers: { host: 'localhost:4000' }, protocol: 'http' };
  const res = { redirect: jest.fn() };

  beforeEach(() => jest.resetAllMocks());

  it('redirects Google OAuth initiation to Google with API callback URI', () => {
    process.env['GOOGLE_CLIENT_ID'] = 'google-client';
    const controller = new AuthController(authService);

    controller.googleInitiate(req as never, res as never);

    expect(res.redirect).toHaveBeenCalledTimes(1);
    const redirectUrl = new URL(res.redirect.mock.calls[0][0]);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(redirectUrl.searchParams.get('client_id')).toBe('google-client');
    expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:4000/auth/oauth/google/callback');
    expect(redirectUrl.searchParams.get('response_type')).toBe('code');
    expect(redirectUrl.searchParams.get('scope')).toContain('email');
  });

  it('redirects Facebook OAuth initiation to Facebook with API callback URI', () => {
    process.env['FACEBOOK_CLIENT_ID'] = 'facebook-client';
    const controller = new AuthController(authService);

    controller.facebookInitiate(req as never, res as never);

    expect(res.redirect).toHaveBeenCalledTimes(1);
    const redirectUrl = new URL(res.redirect.mock.calls[0][0]);
    expect(redirectUrl.origin + redirectUrl.pathname).toBe('https://www.facebook.com/v19.0/dialog/oauth');
    expect(redirectUrl.searchParams.get('client_id')).toBe('facebook-client');
    expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:4000/auth/oauth/facebook/callback');
    expect(redirectUrl.searchParams.get('response_type')).toBe('code');
    expect(redirectUrl.searchParams.get('scope')).toContain('email');
  });
});
