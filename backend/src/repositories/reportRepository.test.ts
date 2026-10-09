import assert from "node:assert/strict";
import test from "node:test";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import {
  createReportRepository,
  ReportRepositoryError,
  type ReportScanResult
} from "./reportRepository.js";

const page = (
  items: unknown[] | undefined,
  lastEvaluatedKey?: ReportScanResult["LastEvaluatedKey"]
): ReportScanResult => ({
  ...(items === undefined ? {} : { Items: items }),
  ...(lastEvaluatedKey ? { LastEvaluatedKey: lastEvaluatedKey } : {})
});

test("retrieves a single scan page", async () => {
  const commands: ScanCommand[] = [];
  const repository = createReportRepository(async (command) => {
    commands.push(command);
    return page([{ reportId: "one", malformed: true }]);
  }, "reports");

  const result = await repository.listReports();

  assert.deepEqual(result, [{ reportId: "one", malformed: true }]);
  assert.equal(commands.length, 1);
  assert.equal(commands[0].input.TableName, "reports");
});

test("follows LastEvaluatedKey through all scan pages", async () => {
  const commands: ScanCommand[] = [];
  const firstKey = { reportId: { S: "one" } };
  const repository = createReportRepository(async (command) => {
    commands.push(command);
    return commands.length === 1
      ? page([{ reportId: "one" }], firstKey)
      : page([{ reportId: "two" }]);
  }, "reports");

  const result = await repository.listReports();

  assert.deepEqual(result, [{ reportId: "one" }, { reportId: "two" }]);
  assert.equal(commands.length, 2);
  assert.deepEqual(commands[1].input.ExclusiveStartKey, firstKey);
});

test("returns an empty list for an empty table or missing Items", async () => {
  const emptyRepository = createReportRepository(async () => page([]), "reports");
  const missingItemsRepository = createReportRepository(async () => page(undefined), "reports");

  assert.deepEqual(await emptyRepository.listReports(), []);
  assert.deepEqual(await missingItemsRepository.listReports(), []);
});

test("throws ReportRepositoryError when the initial scan fails", async () => {
  const repository = createReportRepository(async () => {
    throw new Error("DynamoDB unavailable");
  }, "reports");

  await assert.rejects(() => repository.listReports(), ReportRepositoryError);
});

test("throws and discards earlier pages when a later scan fails", async () => {
  let calls = 0;
  const repository = createReportRepository(async () => {
    calls += 1;
    if (calls === 1) {
      return page([{ reportId: "partial" }], { reportId: { S: "partial" } });
    }
    throw new Error("DynamoDB unavailable");
  }, "reports");

  await assert.rejects(
    () => repository.listReports(),
    (error: unknown) => error instanceof ReportRepositoryError &&
      error.message === "Failed to retrieve reports"
  );
  assert.equal(calls, 2);
});
