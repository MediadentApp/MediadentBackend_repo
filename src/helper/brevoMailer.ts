import Brevo from '@getbrevo/brevo';

const emailApi = new Brevo.TransactionalEmailsApi();
emailApi.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!);

export async function sendBrevoEmail({
  emailTo,
  subject,
  htmlContent,
}: {
  emailTo: string;
  subject: string;
  htmlContent: string;
}) {
  await emailApi.sendTransacEmail({
    sender: { email: process.env.GMAIL_USERNAME, name: 'StudentHub' },
    to: [{ email: emailTo }],
    subject: subject,
    htmlContent: htmlContent,
  });
}
