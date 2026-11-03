import { google } from 'googleapis';

function getOAuthClient(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const client = new google.auth.OAuth2(clientId, clientSecret, process.env.GOOGLE_REDIRECT_URI);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export async function findMeetNotes(refreshToken: string, finTime: string): Promise<string | null> {
  const auth = getOAuthClient(refreshToken);
  if (!auth) return null;

  try {
    const drive = google.drive({ version: 'v3', auth });
    const fin = new Date(finTime);
    const searchFrom = new Date(fin.getTime() - 10 * 60 * 1000); // 10 min avant la fin
    const searchTo = new Date(fin.getTime() + 3 * 60 * 60 * 1000); // 3h après la fin

    const res = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.document' and createdTime > '${searchFrom.toISOString()}' and createdTime < '${searchTo.toISOString()}' and (name contains 'Notes' or name contains 'notes' or name contains 'Gemini')`,
      fields: 'files(id,name,createdTime,webViewLink)',
      orderBy: 'createdTime desc',
      pageSize: 5,
    });

    const files = res.data.files;
    if (!files || files.length === 0) return null;

    // Prendre le doc le plus récent dans la fenêtre
    return files[0].webViewLink ?? null;
  } catch (e) {
    console.error('Drive search failed:', e);
    return null;
  }
}
