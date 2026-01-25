// oAZis Properties Email Template
// Use this template for Resend, Guesty, and day-to-day emails

// Brand Colors
export const BRAND_COLORS = {
  teal: '#5FB8AD',
  tealDark: '#4A9E94',
  tealHeading: '#2B7A78',
  cream: '#F5F1EB',
  creamLight: '#FAF8F5',
  orange: '#D4874D',
  orangeDark: '#C17A42',
  text: '#1A1A1A',
  textLight: '#666666',
  white: '#ffffff',
};

// Logo URL (hosted on Squarespace)
export const LOGO_URL = 'https://images.squarespace-cdn.com/content/v1/67760b0e5138e2245499b765/ed2d6cfb-06f5-407c-9bcd-5635f51a24e5/oAZis+Properties+Logo.png';

export interface EmailTemplateOptions {
  preheader?: string; // Preview text shown in email clients
  heading?: string;
  content: string; // HTML content for the body
  showButton?: boolean;
  buttonText?: string;
  buttonUrl?: string;
  signature?: {
    names: string;
    tagline?: string;
  };
}

/**
 * Generate a branded HTML email using the oAZis Properties template
 */
export function generateEmailHtml(options: EmailTemplateOptions): string {
  const {
    preheader = '',
    heading,
    content,
    showButton = false,
    buttonText = 'Learn More',
    buttonUrl = 'https://www.oazisproperties.com',
    signature = { names: 'Richard and Danielle', tagline: 'Find your oAZis!' },
  } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>oAZis Properties</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }

    /* Link styles */
    a { color: ${BRAND_COLORS.teal}; text-decoration: none; }
    a:hover { color: ${BRAND_COLORS.tealDark}; }

    /* Button hover for supported clients */
    .button:hover { background-color: ${BRAND_COLORS.tealDark} !important; }

    /* Responsive styles */
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 0 !important; }
      .content { padding: 20px !important; }
      .logo { width: 180px !important; height: auto !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.creamLight}; font-family: Georgia, 'Times New Roman', serif;">

  <!-- Preheader text (hidden preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Email wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${BRAND_COLORS.creamLight};">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Main container -->
        <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="background-color: ${BRAND_COLORS.white}; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">

          <!-- Header with logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 30px 40px; border-bottom: 2px solid ${BRAND_COLORS.cream};">
              <a href="https://www.oazisproperties.com" target="_blank">
                <img class="logo" src="${LOGO_URL}" alt="oAZis Properties" width="220" style="display: block; max-width: 220px; height: auto;">
              </a>
            </td>
          </tr>

          <!-- Content area -->
          <tr>
            <td class="content" style="padding: 40px;">

              ${heading ? `
              <!-- Heading -->
              <h1 style="margin: 0 0 24px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: normal; color: ${BRAND_COLORS.tealHeading}; line-height: 1.3;">
                ${heading}
              </h1>
              ` : ''}

              <!-- Body content -->
              <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.7; color: ${BRAND_COLORS.text};">
                ${content}
              </div>

              ${showButton ? `
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: ${BRAND_COLORS.teal};">
                    <a class="button" href="${buttonUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: normal; color: ${BRAND_COLORS.white}; text-decoration: none; border-radius: 6px;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Signature -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid ${BRAND_COLORS.cream};">
                <p style="margin: 0 0 8px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: ${BRAND_COLORS.text};">
                  Take care,<br>
                  <strong style="color: ${BRAND_COLORS.tealHeading};">${signature.names}</strong>
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: ${BRAND_COLORS.cream}; border-radius: 0 0 8px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 4px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; font-weight: bold; color: ${BRAND_COLORS.tealHeading};">
                      oAZis Properties
                    </p>
                    ${signature.tagline ? `
                    <p style="margin: 0 0 16px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; font-style: italic; color: ${BRAND_COLORS.textLight};">
                      ${signature.tagline}
                    </p>
                    ` : ''}
                    <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: ${BRAND_COLORS.textLight};">
                      <a href="https://www.oazisproperties.com" style="color: ${BRAND_COLORS.teal};">www.oazisproperties.com</a>
                      &nbsp;&bull;&nbsp;
                      <a href="mailto:stay@oazisproperties.com" style="color: ${BRAND_COLORS.teal};">stay@oazisproperties.com</a>
                      &nbsp;&bull;&nbsp;
                      <a href="tel:+15206000434" style="color: ${BRAND_COLORS.teal};">(520) 600-0434</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End main container -->

        <!-- Unsubscribe / Legal footer -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="margin-top: 20px;">
          <tr>
            <td align="center">
              <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 12px; color: ${BRAND_COLORS.textLight};">
                Tucson, Arizona
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`.trim();
}

/**
 * Generate plain text version from HTML content
 */
export function generatePlainText(options: EmailTemplateOptions): string {
  const {
    heading,
    content,
    showButton,
    buttonText,
    buttonUrl,
    signature = { names: 'Richard and Danielle', tagline: 'Find your oAZis!' },
  } = options;

  // Strip HTML tags for plain text
  const plainContent = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&bull;/g, '•')
    .trim();

  let text = '';

  if (heading) {
    text += `${heading}\n${'='.repeat(heading.length)}\n\n`;
  }

  text += `${plainContent}\n\n`;

  if (showButton && buttonUrl) {
    text += `${buttonText}: ${buttonUrl}\n\n`;
  }

  text += `Take care,
${signature.names}

******************
oAZis Properties
${signature.tagline || ''}
www.oazisproperties.com
stay@oazisproperties.com
(520) 600-0434`;

  return text;
}

// Export a standalone HTML template string for use in Guesty or other platforms
export const STANDALONE_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>oAZis Properties</title>
  <style>
    body { margin: 0; padding: 0; background-color: #FAF8F5; font-family: Georgia, 'Times New Roman', serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { padding: 40px; text-align: center; border-bottom: 2px solid #F5F1EB; }
    .logo { max-width: 220px; height: auto; }
    .content { padding: 40px; }
    .heading { margin: 0 0 24px; font-size: 28px; font-weight: normal; color: #2B7A78; line-height: 1.3; }
    .body-text { font-size: 16px; line-height: 1.7; color: #1A1A1A; }
    .button { display: inline-block; padding: 14px 32px; background: #5FB8AD; color: #ffffff; text-decoration: none; border-radius: 6px; margin: 24px 0; }
    .button:hover { background: #4A9E94; }
    .signature { margin-top: 32px; padding-top: 24px; border-top: 1px solid #F5F1EB; }
    .footer { padding: 30px 40px; background: #F5F1EB; border-radius: 0 0 8px 8px; text-align: center; }
    .footer-brand { font-weight: bold; color: #2B7A78; margin: 0 0 4px; }
    .footer-tagline { font-style: italic; color: #666; margin: 0 0 16px; font-size: 14px; }
    .footer-links { font-size: 13px; color: #666; }
    .footer-links a { color: #5FB8AD; text-decoration: none; }
    a { color: #5FB8AD; text-decoration: none; }
  </style>
</head>
<body>
  <div style="padding: 40px 20px;">
    <div class="container">

      <div class="header">
        <a href="https://www.oazisproperties.com">
          <img class="logo" src="https://images.squarespace-cdn.com/content/v1/67760b0e5138e2245499b765/ed2d6cfb-06f5-407c-9bcd-5635f51a24e5/oAZis+Properties+Logo.png" alt="oAZis Properties">
        </a>
      </div>

      <div class="content">
        <h1 class="heading">{{HEADING}}</h1>

        <div class="body-text">
          {{CONTENT}}
        </div>

        <!-- Optional button - remove if not needed -->
        <p style="text-align: center;">
          <a href="{{BUTTON_URL}}" class="button">{{BUTTON_TEXT}}</a>
        </p>

        <div class="signature">
          <p style="margin: 0;">
            Take care,<br>
            <strong style="color: #2B7A78;">Richard and Danielle</strong>
          </p>
        </div>
      </div>

      <div class="footer">
        <p class="footer-brand">oAZis Properties</p>
        <p class="footer-tagline">Find your oAZis!</p>
        <p class="footer-links">
          <a href="https://www.oazisproperties.com">www.oazisproperties.com</a> &bull;
          <a href="mailto:stay@oazisproperties.com">stay@oazisproperties.com</a> &bull;
          <a href="tel:+15206000434">(520) 600-0434</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>
`.trim();
