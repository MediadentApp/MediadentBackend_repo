const { sendBrevoEmail } = await import('../helper/brevoMailer.js');
const { sendNodeMailerEmail } = await import('../helper/nodeMailer.js');

export const sendMail = async (to: string, subject: string, body: string): Promise<void> => {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    await sendBrevoEmail({ emailTo: to, subject, body });
  } else {
    await sendNodeMailerEmail({ email: to, subject, message: body, html: body });
  }
};
