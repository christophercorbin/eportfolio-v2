import { randomUUID } from "node:crypto";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ddb = new DynamoDBClient({});
const ses = new SESClient({});

const TABLE_NAME = process.env.CONTACT_TABLE_NAME;
const CONTACT_EMAIL = process.env.CONTACT_EMAIL;

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FunctionUrlEvent {
  body?: string;
  isBase64Encoded?: boolean;
  requestContext?: { http?: { method?: string } };
}

interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

const response = (statusCode: number, body: Record<string, string>) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const parsePayload = (event: FunctionUrlEvent): ContactPayload | null => {
  if (!event.body) return null;
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf-8")
    : event.body;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const { name, email, message } = parsed as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string"
  ) {
    return null;
  }

  return { name: name.trim(), email: email.trim(), message: message.trim() };
};

export const handler = async (event: FunctionUrlEvent) => {
  if (event.requestContext?.http?.method !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  if (!TABLE_NAME || !CONTACT_EMAIL) {
    console.error("Missing CONTACT_TABLE_NAME or CONTACT_EMAIL env vars");
    return response(500, { error: "Server misconfigured" });
  }

  const payload = parsePayload(event);
  if (!payload) {
    return response(400, { error: "Invalid request body" });
  }

  const { name, email, message } = payload;
  if (!name || name.length > MAX_NAME) {
    return response(400, { error: "Name is required (max 100 chars)" });
  }
  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL) {
    return response(400, { error: "A valid email is required" });
  }
  if (!message || message.length > MAX_MESSAGE) {
    return response(400, { error: "Message is required (max 5000 chars)" });
  }

  const id = randomUUID();
  const receivedAt = new Date().toISOString();

  await ddb.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        id: { S: id },
        receivedAt: { S: receivedAt },
        name: { S: name },
        email: { S: email },
        message: { S: message },
      },
    })
  );

  try {
    await ses.send(
      new SendEmailCommand({
        Source: CONTACT_EMAIL,
        Destination: { ToAddresses: [CONTACT_EMAIL] },
        ReplyToAddresses: [email],
        Message: {
          Subject: { Data: `Portfolio contact from ${name}` },
          Body: {
            Text: {
              Data: `Name: ${name}\nEmail: ${email}\nReceived: ${receivedAt}\nID: ${id}\n\n${message}`,
            },
          },
        },
      })
    );
  } catch (err) {
    // Message is already persisted in DynamoDB; log and still succeed.
    console.error("SES send failed (message stored in DynamoDB)", err);
  }

  return response(200, { id });
};
