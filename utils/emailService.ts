// This file is disabled as the email notification feature requires a user database.
// All email sending logic has been removed.

interface ReminderEmailParams {
  to_name: string;
  to_email: string;
  subject: string;
  body: string;
}

/**
 * Sends an email using the EmailJS service.
 * @param params - The email parameters including recipient, subject, and body.
 */
export const sendReminderEmail = async (params: ReminderEmailParams): Promise<void> => {
    console.warn(
      `%cEmail sending is disabled. A real email will not be sent.`,
      'color: orange; font-weight: bold;'
    );
    console.log('Simulating email send with params:', params);
    return;
};
