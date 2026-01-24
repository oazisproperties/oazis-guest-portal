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
  // Additional reservation details
  guestName?: string;
  propertyName?: string;
  checkInDate?: string;
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

  const stripePaymentUrl = `https://dashboard.stripe.com/test/payments/${data.paymentIntentId}`;

  const emailBody = `
New Upsell Authorization

Guest: ${data.guestName || 'N/A'}
Property: ${data.propertyName || 'N/A'}
Check-in: ${data.checkInDate || 'N/A'}
Customer Email: ${data.customerEmail || 'N/A'}

Items Selected:
${itemsList}

Total Authorized: ${data.currency.toUpperCase()} ${data.totalAmount.toFixed(2)}

Approve/Capture Payment:
${stripePaymentUrl}

Note: This is an authorization only. The card has NOT been charged.
Click the link above to capture the payment in Stripe.

---
Reservation ID: ${data.reservationId}
Payment Intent: ${data.paymentIntentId}
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

  const stripePaymentUrl = `https://dashboard.stripe.com/test/payments/${data.paymentIntentId}`;

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
            text: `*Guest:*\n${data.guestName || 'N/A'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Property:*\n${data.propertyName || 'N/A'}`,
          },
        ],
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Check-in:*\n${data.checkInDate || 'N/A'}`,
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
            text: `*Reservation ID:*\n\`${data.reservationId}\``,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '💳 Approve Payment in Stripe',
              emoji: true,
            },
            url: stripePaymentUrl,
            style: 'primary',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '⚠️ This is an authorization only. The card has NOT been charged. Click the button above to capture.',
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

// Send confirmation email to guest when upsell request is received
export async function sendGuestUpsellConfirmation(data: {
  guestEmail: string;
  guestName: string;
  propertyName: string;
  checkInDate: string;
  items: Array<{ name: string; price: number; currency: string }>;
  totalAmount: number;
}): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured, skipping guest confirmation email');
    return;
  }

  const itemsList = data.items
    .map(item => `• ${item.name} - $${item.price.toFixed(2)}`)
    .join('\n');

  const emailBody = `
Hi ${data.guestName},

Thank you for your add-on request for your upcoming stay at ${data.propertyName}!

We've received your request for the following:

${itemsList}

Total: $${data.totalAmount.toFixed(2)}

Your card has been authorized but NOT charged yet. We'll review your request and confirm availability. Once approved, you'll receive a confirmation email.

Stay Details:
• Property: ${data.propertyName}
• Check-in: ${data.checkInDate}

If you have any questions, please don't hesitate to reach out.

We look forward to hosting you!

Best regards,
The oAZis Properties Team

---
oAZis Properties
stay@oazisproperties.com
(520) 600-0434
`.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NOTIFICATION_EMAIL_FROM || 'oAZis Properties <notifications@oazisproperties.com>',
        to: data.guestEmail,
        subject: `Add-on Request Received - ${data.propertyName}`,
        text: emailBody,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send guest confirmation email:', error);
    } else {
      console.log('Guest confirmation email sent successfully to', data.guestEmail);
    }
  } catch (error) {
    console.error('Error sending guest confirmation email:', error);
  }
}

// Send confirmation email to guest when charge is approved/captured
export async function sendGuestChargeApprovedEmail(data: {
  guestEmail: string;
  guestName: string;
  propertyName: string;
  checkInDate: string;
  items: Array<{ name: string; price: number; currency: string }>;
  totalAmount: number;
}): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured, skipping charge approved email');
    return;
  }

  const itemsList = data.items
    .map(item => `• ${item.name} - $${item.price.toFixed(2)}`)
    .join('\n');

  const emailBody = `
Hi ${data.guestName},

Great news! Your add-on request has been approved and your card has been charged.

Confirmed Add-ons:
${itemsList}

Total Charged: $${data.totalAmount.toFixed(2)}

Stay Details:
• Property: ${data.propertyName}
• Check-in: ${data.checkInDate}

We're excited to make your stay even more special! If you have any questions or need to make changes, please contact us.

See you soon!

Best regards,
The oAZis Properties Team

---
oAZis Properties
stay@oazisproperties.com
(520) 600-0434
`.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NOTIFICATION_EMAIL_FROM || 'oAZis Properties <notifications@oazisproperties.com>',
        to: data.guestEmail,
        subject: `Add-ons Confirmed! - ${data.propertyName}`,
        text: emailBody,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send charge approved email:', error);
    } else {
      console.log('Charge approved email sent successfully to', data.guestEmail);
    }
  } catch (error) {
    console.error('Error sending charge approved email:', error);
  }
}

// Send Slack reminder for upcoming check-in with approved upsells
export async function sendUpsellReminderSlack(data: {
  guestName: string;
  propertyName: string;
  checkInDate: string;
  items: Array<{ name: string; price: number; currency: string }>;
  totalAmount: number;
  reservationId: string;
}): Promise<void> {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!slackWebhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not configured, skipping upsell reminder');
    return;
  }

  const itemsText = data.items
    .map(item => `• ${item.name}: $${item.price.toFixed(2)}`)
    .join('\n');

  const slackMessage = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⏰ Upsell Reminder - Check-in in 3 Days!',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Guest:*\n${data.guestName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Property:*\n${data.propertyName}`,
          },
        ],
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Check-in Date:*\n${data.checkInDate}`,
          },
          {
            type: 'mrkdwn',
            text: `*Reservation ID:*\n\`${data.reservationId}\``,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Approved Add-ons:*\n${itemsText}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Total:* $${data.totalAmount.toFixed(2)}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '📋 Please ensure these add-ons are prepared for the guest arrival.',
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
      console.error('Failed to send Slack reminder:', error);
    } else {
      console.log('Slack upsell reminder sent successfully');
    }
  } catch (error) {
    console.error('Error sending Slack reminder:', error);
  }
}
