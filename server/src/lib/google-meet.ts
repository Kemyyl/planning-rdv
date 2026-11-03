import { google } from 'googleapis';

function getServiceAccountAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyJson) return null;
  try {
    const key = JSON.parse(keyJson);
    return new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/meetings.space.created',
      ],
    });
  } catch {
    return null;
  }
}

function getOAuthClient(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const client = new google.auth.OAuth2(clientId, clientSecret, process.env.GOOGLE_REDIRECT_URI);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export function getGoogleOAuthUrl(adminId: number): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/meetings.space.created',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
    state: String(adminId),
    prompt: 'consent',
  });
}

export async function exchangeGoogleCode(code: string): Promise<{ refreshToken: string; calendarId: string } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  try {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) return null;
    oauth2.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2 });
    const cal = await calendar.calendars.get({ calendarId: 'primary' });
    return {
      refreshToken: tokens.refresh_token,
      calendarId: cal.data.id || 'primary',
    };
  } catch (e) {
    console.error('Google OAuth exchange failed:', e);
    return null;
  }
}

export async function createMeetEvent(params: {
  title: string;
  debut: string;
  fin: string;
  clientEmail?: string;
  calendarId?: string;
  refreshToken?: string;
}): Promise<{ meetLink: string; googleEventId: string } | null> {
  const auth = params.refreshToken
    ? getOAuthClient(params.refreshToken)
    : getServiceAccountAuth();
  if (!auth) return null;

  let meetLink: string | null = null;
  let spaceId: string | null = null;
  try {
    const meetApi = google.meet({ version: 'v2', auth });
    const space = await meetApi.spaces.create({ requestBody: {} });
    meetLink = space.data.meetingUri ?? null;
    spaceId = space.data.name ?? null;
  } catch (e) {
    console.error('Meet API space creation failed:', e);
  }

  const calendarId = params.calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary';
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const eventBody: Record<string, unknown> = {
      summary: params.title,
      start: { dateTime: params.debut, timeZone: 'Europe/Paris' },
      end: { dateTime: params.fin, timeZone: 'Europe/Paris' },
      attendees: params.clientEmail ? [{ email: params.clientEmail }] : [],
    };

    if (meetLink && spaceId) {
      eventBody.conferenceData = {
        conferenceId: spaceId.replace('spaces/', ''),
        conferenceSolution: { key: { type: 'hangoutsMeet' }, name: 'Google Meet' },
        entryPoints: [{ entryPointType: 'video', uri: meetLink, label: meetLink.replace('https://', '') }],
      };
    } else {
      eventBody.conferenceData = {
        createRequest: {
          requestId: `synego-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const event = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      sendUpdates: params.clientEmail ? 'all' : 'none',
      requestBody: eventBody,
    });

    if (!meetLink) {
      meetLink = event.data.conferenceData?.entryPoints?.find(
        e => e.entryPointType === 'video'
      )?.uri ?? null;
    }

    const googleEventId = event.data.id ?? null;
    if (!meetLink || !googleEventId) return null;
    return { meetLink, googleEventId };
  } catch (e) {
    console.error('Google Calendar event creation failed:', e);
    if (meetLink) return { meetLink, googleEventId: spaceId ?? 'meet-only' };
    return null;
  }
}
