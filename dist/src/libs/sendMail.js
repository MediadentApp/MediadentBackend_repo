const { sendBrevoEmail } = await import('../helper/brevoMailer.js');
const { sendNodeMailerEmail } = await import('../helper/nodeMailer.js');
export const sendMail = async ({ to, subject, content, htmlContent, }) => {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
        await sendBrevoEmail({ emailTo: to, subject, htmlContent: htmlContent || content });
    }
    else {
        await sendNodeMailerEmail({ email: to, subject, message: content, html: htmlContent });
    }
};
