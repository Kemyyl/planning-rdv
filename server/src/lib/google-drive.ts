import { google } from 'googleapis';

function getOAuthClient(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const client = new google.auth.OAuth2(clientId, clientSecret, process.env.GOOGLE_REDIRECT_URI);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export async function findMeetNotes(refreshToken: string, finTime: string, rdvTitle?: string): Promise<string | null> {
  const auth = getOAuthClient(refreshToken);
  if (!auth) return null;

  try {
    const drive = google.drive({ version: 'v3', auth });
    const fin = new Date(finTime);
    const searchFrom = new Date(fin.getTime() - 10 * 60 * 1000);
    const searchTo = new Date(fin.getTime() + 3 * 60 * 60 * 1000);
    const timeFilter = `createdTime > '${searchFrom.toISOString()}' and createdTime < '${searchTo.toISOString()}'`;
    const docFilter = `mimeType='application/vnd.google-apps.document'`;

    // Mots-clés à chercher dans le nom du doc
    const keywords = ['Notes', 'notes', 'Gemini', 'Réunion', 'reunion'];
    if (rdvTitle) {
      // Ajouter chaque mot du titre (longueur > 3 pour éviter "de", "la", etc.)
      rdvTitle.split(/\s+/).filter(w => w.length > 3).forEach(w => keywords.push(w));
    }
    const nameFilter = keywords.map(k => `name contains '${k.replace(/'/g, "\\'")}'`).join(' or ');

    const res = await drive.files.list({
      q: `${docFilter} and ${timeFilter} and (${nameFilter})`,
      fields: 'files(id,name,createdTime,webViewLink)',
      orderBy: 'createdTime desc',
      pageSize: 10,
    });

    const files = res.data.files;
    if (!files || files.length === 0) return null;

    // Priorité : doc dont le nom contient le titre du RDV
    if (rdvTitle) {
      const titleWords = rdvTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const match = files.find(f => titleWords.some(w => f.name?.toLowerCase().includes(w)));
      if (match?.webViewLink) return match.webViewLink;
    }

    return files[0].webViewLink ?? null;
  } catch (e) {
    console.error('Drive search failed:', e);
    return null;
  }
}
