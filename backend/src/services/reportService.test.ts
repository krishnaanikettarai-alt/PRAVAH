import assert from "node:assert/strict";
import test from "node:test";
import { createReport, MAX_DESCRIPTION_LENGTH, MAX_IMAGE_KEY_LENGTH, ReportValidationError } from "./reportService.js";

const validInput = {
  latitude: 20.2961,
  longitude: 85.8245,
  timestamp: "2026-10-11T10:00:00Z",
  severity: "HIGH"
};

test("rejects oversized optional report strings before persistence", async () => {
  await assert.rejects(
    () => createReport({ ...validInput, description: "x".repeat(MAX_DESCRIPTION_LENGTH + 1) }),
    (error: unknown) => error instanceof ReportValidationError &&
      error.message.includes(`${MAX_DESCRIPTION_LENGTH}`)
  );
  await assert.rejects(
    () => createReport({ ...validInput, imageKey: "x".repeat(MAX_IMAGE_KEY_LENGTH + 1) }),
    (error: unknown) => error instanceof ReportValidationError &&
      error.message.includes(`${MAX_IMAGE_KEY_LENGTH}`)
  );
});

test("rejects malformed optional report strings", async () => {
  await assert.rejects(
    () => createReport({ ...validInput, description: 42 }),
    /description must be a string/
  );
  await assert.rejects(
    () => createReport({ ...validInput, imageKey: false }),
    /imageKey must be a string/
  );
});
