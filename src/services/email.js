const nodemailer = require('nodemailer');

let transporter;

const initializeTransporter = () => {
  if (!transporter) {
    // transporter = nodemailer.createTransport({
    //   host: process.env.MAILTRAP_HOST,
    //   port: process.env.MAILTRAP_PORT,
    //   auth: {
    //     user: process.env.MAILTRAP_USERNAME,
    //     pass: process.env.MAILTRAP_PASSWORD
    //   }
    // });
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_APP_SPECIFIC_PASSWORD
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });
  }
};

const sendEmail = async options => {
  initializeTransporter();

  const mailOptions = {
    from: 'Mediadent <mediadentprod@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || undefined // Use HTML if provided
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.response}`);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new AppError('Failed to send email. Please try again later.', 500);
  }
};

module.exports = sendEmail;
