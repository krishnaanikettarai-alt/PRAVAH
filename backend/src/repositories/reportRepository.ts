import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { Report } from "../models/report.js";
import { config } from "../config.js";

const client = new DynamoDBClient({
  region: config.region,
  ...(config.dynamodbEndpoint ? { endpoint: config.dynamodbEndpoint } : {})
});
const documentClient = DynamoDBDocumentClient.from(client);

type ScanKey = NonNullable<ScanCommand["input"]["ExclusiveStartKey"]>;

export interface ReportScanResult {
  Items?: unknown[];
  LastEvaluatedKey?: ScanKey;
}

export type ReportScanSender = (command: ScanCommand) => Promise<ReportScanResult>;

export class ReportRepositoryError extends Error {
  public constructor(message = "Failed to retrieve reports") {
    super(message);
    this.name = "ReportRepositoryError";
  }
}

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

export const createReportRepository = (
  send: ReportScanSender,
  tableName: string
) => ({
  listReports: async (): Promise<Report[]> => {
    const reports: unknown[] = [];
    let exclusiveStartKey: ScanKey | undefined;

    try {
      do {
        const result = await send(new ScanCommand({
          TableName: tableName,
          ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {})
        }));
        reports.push(...(result.Items ?? []));
        exclusiveStartKey = result.LastEvaluatedKey;
      } while (exclusiveStartKey);
    } catch {
      throw new ReportRepositoryError();
    }

    return reports as Report[];
  }
});

export const listReports = async (): Promise<Report[]> =>
  createReportRepository(
    (command) => documentClient.send(command),
    getTableName()
  ).listReports();
