import assert from "node:assert/strict";
import { formatFileSize, getStoragePathFromUrl } from "../lib/utils";
import { eventDocumentSchema } from "../lib/validations/event";

function runDocumentsSelfCheck() {
  console.log("== Running Event Documents Self-Check ==");

  // 1. Check formatFileSize utility
  assert.equal(formatFileSize(0), "0 B", "Zero bytes should format as '0 B'");
  assert.equal(formatFileSize(null), "0 B", "Null bytes should format as '0 B'");
  assert.equal(formatFileSize(500), "500 B", "500 bytes should format as '500 B'");
  assert.equal(formatFileSize(1024), "1.0 KB", "1024 bytes should format as '1.0 KB'");
  assert.equal(formatFileSize(2500000), "2.4 MB", "2.5MB should format as '2.4 MB'");
  assert.equal(formatFileSize(1073741824), "1.0 GB", "1GB should format as '1.0 GB'");
  console.log("✓ formatFileSize helper verified");

  // 2. Check getStoragePathFromUrl utility
  const relativePath = "evt-123/1700000000_rundown.pdf";
  assert.equal(getStoragePathFromUrl(relativePath), relativePath, "Relative path should remain unchanged");

  const bucketFilesUrl = "https://yblhtchviuslhfwiwyuo.supabase.co/storage/v1/object/public/bucket-files/evt-123/1700000000_rundown.pdf";
  assert.equal(getStoragePathFromUrl(bucketFilesUrl), relativePath, "bucket-files URL should extract relative path");

  const fullUrl = "https://yblhtchviuslhfwiwyuo.supabase.co/storage/v1/object/public/event-documents/evt-123/1700000000_rundown.pdf";
  assert.equal(getStoragePathFromUrl(fullUrl), relativePath, "Legacy event-documents URL should extract relative path");

  const signedUrl = "https://yblhtchviuslhfwiwyuo.supabase.co/storage/v1/object/sign/bucket-files/evt-123/1700000000_rundown.pdf?token=abc123xyz";
  assert.equal(getStoragePathFromUrl(signedUrl), relativePath, "Signed URL should strip query params");
  console.log("✓ getStoragePathFromUrl helper verified");

  // 3. Check eventDocumentSchema Zod validation (positive)
  const validPayload = {
    event_id: "evt-uuid-123",
    file_name: "Floorplan-Stage.png",
    file_url: "evt-uuid-123/floorplan.png",
    file_type: "image/png",
    file_size: 4500000,
  };
  const parsedValid = eventDocumentSchema.safeParse(validPayload);
  assert.equal(parsedValid.success, true, "Valid document payload should pass validation");
  if (parsedValid.success) {
    assert.equal(parsedValid.data.file_name, "Floorplan-Stage.png");
    assert.equal(parsedValid.data.file_size, 4500000);
  }
  console.log("✓ Zod schema positive validation verified");

  // 4. Check eventDocumentSchema Zod validation (negative)
  const emptyNamePayload = {
    event_id: "evt-uuid-123",
    file_name: "   ",
    file_url: "path.pdf",
    file_type: "application/pdf",
  };
  const parsedEmpty = eventDocumentSchema.safeParse(emptyNamePayload);
  assert.equal(parsedEmpty.success, false, "Empty file name should fail validation");

  const missingEventPayload = {
    event_id: "",
    file_name: "test.pdf",
    file_url: "path.pdf",
    file_type: "application/pdf",
  };
  const parsedMissingEvent = eventDocumentSchema.safeParse(missingEventPayload);
  assert.equal(parsedMissingEvent.success, false, "Empty event_id should fail validation");
  console.log("✓ Zod schema negative validation verified");

  console.log("== All Event Documents checks passed successfully! ==");
}

runDocumentsSelfCheck();
