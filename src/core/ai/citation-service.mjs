import { supportingPassage } from "./retrieval-service.mjs";

export function exactRecordCitations(records, query) {
  return records.map((record) => ({
    recordId: record.id,
    title: record.title,
    url: record.url,
    sourceType: record.sourceType,
    passage: supportingPassage(record.text, query),
    evidenceStatus: "authorised-source-requires-human-review"
  }));
}
