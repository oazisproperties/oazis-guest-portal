interface UpsellNotificationData {
  reservationId: string;
  items: Array<{
    name: string;
    price: number;
    currency: string;
  }>;
  totalAmount: number;
  currency: string;
  customerEmail?: string;
  paymentIntentId: string;
}

export async function sendEmailNotification(data: UpsellNotificationData): Promise<void> {
  const emailTo = process.env.NOTIFICATION_EMAIL;

  if (!emailTo) {
    console.warn('NOTIFICATION_EMAIL not configured, skipping email notification');
    return;
  }

  // Using Resend API for email delivery
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured, skipping email notification');
    return;
  }

  const itemsList = data.items
    .map(item => `- ${item.name}: ${item.currency} ${item.price.toFixed(2)}`)
    .join('\n');

  const emailBody = `
New Upsell Authorization

Reservation ID: ${data.reservationId}
Customer Email: ${data.customerEmail || 'N/A'}
Payment Intent: ${data.paymentIntentId}

Items Selected:
${itemsList}

Total Authorized: ${data.currency.toUpperCase()} ${data.totalAmount.toFixed(2)}

Note: This is an authorization only. The card has NOT been charged.
To capture the payment, go to your Stripe Dashboard.
`.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NOTIFICATION_EMAIL_FROM || 'Oazis <notifications@oazis.com>',
        to: emailTo,
        subject: `Upsell Authorization - Reservation ${data.reservationId}`,
        text: emailBody,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send email notification:', error);
    } else {
      console.log('Email notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

export async function sendSlackNotification(data: UpsellNotificationData): Promise<void> {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!slackWebhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not configured, skipping Slack notification');
    return;
  }

  const itemsText = data.items
    .map(item => `• ${item.name}: ${item.currency} ${item.price.toFixed(2)}`)
    .join('\n');

  const slackMessage = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎉 New Upsell Authorization',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Reservation ID:*\n${data.reservationId}`,
          },
          {
            type: 'mrkdwn',
            text: `*Customer Email:*\n${data.customerEmail || 'N/A'}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Items Selected:*\n${itemsText}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Total Authorized:*\n${data.currency.toUpperCase()} ${data.totalAmount.toFixed(2)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Payment Intent:*\n\`${data.paymentIntentId}\``,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '⚠️ This is an authorization only. The card has NOT been charged.',
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send Slack notification:', error);
    } else {
      console.log('Slack notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
}

export async function sendUpsellNotifications(data: UpsellNotificationData): Promise<void> {
  await Promise.all([
    sendEmailNotification(data),
    sendSlackNotification(data),
  ]);
}
