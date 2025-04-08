import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

const initializeTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_APP_SPECIFIC_PASSWORD,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }
};

/**
 * Defines the structure of email options.
 */
interface EmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

/**
 * Sends an email using the configured transporter.
 *
 * @param options - Email details including recipient, subject, and message.
 * @throws Error if email sending fails.
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  initializeTransporter();

  const mailOptions = {
    from: 'Mediadent <mediadentprod@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || undefined, // Use HTML if provided
  };

  try {
    const info = await transporter!.sendMail(mailOptions);
    console.log(`Email sent: ${info.response}`);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email. Please try again later.');
  }
};
