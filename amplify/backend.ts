import { defineBackend } from "@aws-amplify/backend";
import { Duration } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { FunctionUrlAuthType, HttpMethod } from "aws-cdk-lib/aws-lambda";
import { contactForm } from "./functions/contact-form/resource";

const CONTACT_EMAIL = "christophercorbin24@gmail.com";

const backend = defineBackend({ contactForm });

const stack = backend.createStack("contact-resources");

// Store every submission (SES delivery is best-effort on top of this)
const table = new Table(stack, "ContactMessages", {
  partitionKey: { name: "id", type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  pointInTimeRecovery: true,
});

const lambda = backend.contactForm.resources.lambda;
table.grantWriteData(lambda);

lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["ses:SendEmail"],
    resources: ["*"],
  })
);

const cfnFunction = backend.contactForm.resources.cfnResources.cfnFunction;
cfnFunction.addPropertyOverride(
  "Environment.Variables.CONTACT_TABLE_NAME",
  table.tableName
);
cfnFunction.addPropertyOverride(
  "Environment.Variables.CONTACT_EMAIL",
  CONTACT_EMAIL
);

const functionUrl = lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: [
      "https://christophercorbin.cloud",
      "https://www.christophercorbin.cloud",
      "http://localhost:4321",
    ],
    allowedMethods: [HttpMethod.POST],
    allowedHeaders: ["content-type"],
    maxAge: Duration.hours(1),
  },
});

backend.addOutput({
  custom: {
    contactApiUrl: functionUrl.url,
  },
});
