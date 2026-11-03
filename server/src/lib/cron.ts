import cron from 'node-cron';
import { supabase } from './supabase';
import { sendReminderEmail } from './email';

export function startCron() {
  // Every hour: send reminders for RDVs in the 24-25h window ahead
  cron.schedule('0 * * * *', async () => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const { data: rdvs } = await supabase
      .from('rendez_vous')
      .select('*,client:clients(email,prenom),prestation:prestations(nom)')
      .eq('statut', 'confirme')
      .eq('reminder_sent', false)
      .gte('debut', in24h.toISOString())
      .lte('debut', in25h.toISOString());

    if (!rdvs?.length) return;

    for (const rdv of rdvs) {
      const client = rdv.client as { email: string; prenom: string } | null;
      if (!client?.email) continue;
      try {
        await sendReminderEmail(client.email, client.prenom, rdv);
        await supabase.from('rendez_vous').update({ reminder_sent: true }).eq('id', rdv.id);
        console.log(`Reminder sent for rdv ${rdv.id}`);
      } catch (e) {
        console.error(`Reminder failed for rdv ${rdv.id}:`, e);
      }
    }
  });

  console.log('Cron scheduler started');
}
