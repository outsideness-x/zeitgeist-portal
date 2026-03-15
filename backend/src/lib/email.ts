import { getEnv } from '../config/env.js';

type VerificationEmailArgs = {
  to: string;
  code: string;
  expiresInMinutes: number;
};

const renderTextBody = (args: VerificationEmailArgs): string => {
  return [
    `Your verification code is: ${args.code}`,
    '',
    `This code expires in ${args.expiresInMinutes} minutes.`,
    'If you did not request this code, you can ignore this message.',
  ].join('\n');
};

export const sendVerificationCodeEmail = async (args: VerificationEmailArgs): Promise<void> => {
  const env = getEnv();
  const text = renderTextBody(args);

  if (env.EMAIL_PROVIDER === 'noop') {
    if (env.NODE_ENV === 'production') {
      throw new Error('email provider is not configured');
    }
    return;
  }

  if (env.EMAIL_PROVIDER === 'resend') {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      throw new Error('resend email provider is not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [args.to],
        subject: 'Your verification code',
        text,
      }),
    });

    if (!response.ok) {
      throw new Error(`failed to send email: ${response.status}`);
    }

    return;
  }

  throw new Error('unsupported email provider');
};
