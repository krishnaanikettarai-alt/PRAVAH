import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { Report } from "../models/report.js";
import { config } from "../config.js";

const client = new DynamoDBClient({
  region: config.region,
  ...(config.dynamodbEndpoint ? { endpoint: config.dynamodbEndpoint } : {})
});
const documentClient = DynamoDBDocumentClient.from(client);

const getTableName = (): string => {
  if (!config.reportsTableName) {
    throw new Error("REPORTS_TABLE_NAME is not configured");
  }

  return config.reportsTableName;
};

export const createReport = async (report: Report): Promise<void> => {
  await documentClient.send(new PutCommand({
    TableName: getTableName(),
    Item: report
  }));
};

export const listReports = async (): Promise<Report[]> => {
  const result = await documentClient.send(new ScanCommand({
    TableName: getTableName()
  }));

  return (result.Items ?? []) as Report[];
};
