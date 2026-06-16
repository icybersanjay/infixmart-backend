import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { execute, query } from '../lib/server/db/mysql.js';

async function runTest() {
  const email = "webhook-test-subscriber@infixmart.com";

  try {
    console.log("1. Cleaning up any previous test record...");
    await execute("DELETE FROM NewsletterSubscribers WHERE email = :email", { email });

    console.log("2. Inserting test subscriber...");
    await execute(
      "INSERT INTO NewsletterSubscribers (email, source) VALUES (:email, 'webhook_test')",
      { email }
    );

    console.log("3. Verifying subscriber exists...");
    const rows = await query(
      "SELECT * FROM NewsletterSubscribers WHERE email = :email",
      { email }
    );
    
    if (rows.length === 1) {
      console.log("Subscriber successfully inserted! ID:", rows[0].id);
    } else {
      throw new Error("Subscriber insert verification failed");
    }

    console.log("4. Executing deletion (similar to webhook handler)...");
    await execute("DELETE FROM NewsletterSubscribers WHERE email = :email", { email });

    console.log("5. Verifying subscriber is deleted...");
    const verifyRows = await query(
      "SELECT * FROM NewsletterSubscribers WHERE email = :email",
      { email }
    );

    if (verifyRows.length === 0) {
      console.log("Subscriber successfully deleted! Webhook database query test: PASS");
    } else {
      throw new Error("Subscriber deletion verification failed");
    }

  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

runTest();
