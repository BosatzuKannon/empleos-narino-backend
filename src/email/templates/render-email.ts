export interface EmailTemplateOptions {
  title: string;
  greeting?: string;
  contentHtml: string;
  highlight?: string;
  highlightLabel?: string;
  footerNote?: string;
}

const PRIMARY_GREEN = '#558B2F';
const LIGHT_GREEN_BG = '#F1F8E9';
const BORDER_GREEN = '#C5E1A5';
const DARK_TEXT = '#333333';
const GREY_TEXT = '#666666';

export function renderEmailTemplate(options: EmailTemplateOptions): string {
  const {
    title,
    greeting,
    contentHtml,
    highlight,
    highlightLabel,
    footerNote,
  } = options;

  const highlightBlock = highlight
    ? `
    <tr>
      <td align="left" style="padding: 0 32px 24px 32px;">
        ${
          highlightLabel
            ? `<p style="margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${GREY_TEXT}; text-align: left;">${highlightLabel}</p>`
            : ''
        }
        <div style="display: inline-block; background-color: ${LIGHT_GREEN_BG}; border: 1px solid ${BORDER_GREEN}; border-radius: 10px; padding: 16px 32px; text-align: center;">
          <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: ${PRIMARY_GREEN};">${highlight}</span>
        </div>
      </td>
    </tr>`
    : '';

  const footer = footerNote
    ? `
    <tr>
      <td style="padding: 24px 32px 32px 32px;">
        <p style="margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: ${GREY_TEXT}; text-align: left;">${footerNote}</p>
      </td>
    </tr>`
    : '';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f0f0f0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f0f0; padding: 24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 15px; overflow: hidden;">
              <tr>
                <td align="left" style="background-color: ${PRIMARY_GREEN}; padding: 24px 32px;">
                  <span style="font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: bold; color: #ffffff;">Empleos Nariño</span>
                </td>
              </tr>
              <tr>
                <td align="left" style="padding: 32px 32px 16px 32px;">
                  <h1 style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: bold; color: ${DARK_TEXT}; text-align: left;">${title}</h1>
                </td>
              </tr>
              ${
                greeting
                  ? `<tr>
                      <td align="left" style="padding: 0 32px 12px 32px;">
                        <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: ${DARK_TEXT}; text-align: left;">${greeting}</p>
                      </td>
                    </tr>`
                  : ''
              }
              <tr>
                <td align="left" style="padding: 0 32px 24px 32px;">
                  <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: ${DARK_TEXT}; text-align: left;">${contentHtml}</div>
                </td>
              </tr>
              ${highlightBlock}
              ${footer}
              <tr>
                <td align="left" style="background-color: #f0f0f0; padding: 16px 32px; border-top: 1px solid #dddddd;">
                  <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: ${GREY_TEXT}; text-align: left;">Este es un correo automático enviado por Empleos Nariño. Por favor no respondas a este mensaje.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
