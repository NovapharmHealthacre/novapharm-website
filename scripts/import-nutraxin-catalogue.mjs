import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { nutraxinCatalogueCode, stableRecordChecksum, validateNutraxinRegister } from "../src/core/nutraxin-catalogue.mjs";

const dryRun = process.argv.includes("--dry-run");
const actor = "local_validation_nutraxin_import";
const validated = validateNutraxinRegister();

function assertLocalExecution() {
  if (process.env.NODE_ENV === "production") throw new Error("Nutraxin catalogue import is disabled in production.");
  if (process.env.LOCAL_PORTAL_MODE !== "true" || process.env.DATABASE_PROVIDER !== "sqlite" || process.env.HOST !== "127.0.0.1") {
    throw new Error("Nutraxin catalogue import requires the protected localhost SQLite portal environment.");
  }
}

function familyId(code) {
  return `nutraxin-family-${String(code).toLowerCase().replace(/^nut-/, "").replace(/[^a-z0-9]+/g, "-")}`;
}

function deterministicId(prefix, value) {
  return `${prefix}-${stableRecordChecksum(value).slice(0, 32)}`;
}

function mediaPaths(product) {
  const base = `/assets/media/products/nutraxin/${product.imageBase}`;
  return {
    sourcePath: `${base}.png`,
    fallbackPath: `${base}.png`,
    responsive: {
      avif: [`${base}-480.avif 480w`, `${base}-800.avif 800w`],
      webp: [`${base}-480.webp 480w`, `${base}-800.webp 800w`],
      sizes: "(max-width: 720px) 46vw, (max-width: 1200px) 30vw, 260px"
    }
  };
}

export async function importNutraxinCatalogue() {
  assertLocalExecution();
  const database = await import("../src/data/database.mjs");
  const { all, audit, closeDatabase, nowIso, one, run, transaction, upsert } = database;
  const importedAt = nowIso();
  const sourceChecksum = validated.register.source.sha256;
  const registerChecksum = validated.checksum;
  const version = validated.register.version;
  const existingImport = await one(`SELECT id, imported_at FROM catalogue_imports
    WHERE catalogue_code = ? AND catalogue_version = ? AND source_checksum_sha256 = ? AND register_checksum_sha256 = ? AND status = 'imported'`,
  nutraxinCatalogueCode, version, sourceChecksum, registerChecksum);
  if (existingImport) {
    await closeDatabase();
    return { status: "already_imported", importId: existingImport.id, importedAt: existingImport.imported_at, productCount: validated.productCount };
  }

  const importId = randomUUID();
  const outcomes = { created: 0, updated: 0, unchanged: 0 };
  await transaction(async () => {
    await run(`INSERT INTO catalogue_imports(id, catalogue_code, catalogue_version, source_checksum_sha256,
      register_checksum_sha256, product_count, status, validation_json, imported_by, imported_at)
      VALUES(?, ?, ?, ?, ?, ?, 'imported', ?, ?, ?)`, importId, nutraxinCatalogueCode, version, sourceChecksum,
    registerChecksum, validated.productCount, JSON.stringify({ rangeCounts: validated.rangeCounts, assetCount: validated.assetCount,
      discrepancyCount: validated.discrepancyCount, publicClaimsBlocked: true, pricingImported: false, stockImported: false }), actor, importedAt);

    const families = new Map();
    for (const product of validated.register.products) {
      if (!families.has(product.familyCode)) families.set(product.familyCode, product.range);
    }
    for (const [code, name] of families) {
      await upsert("product_families", {
        id: familyId(code), family_code: code, brand_name: "Nutraxin", family_name: name,
        category: "food_supplement", public_summary: `${name} catalogue range supplied for controlled B2B reference.`,
        lifecycle_status: "catalogue_only", source_document_checksum: sourceChecksum,
        created_at: importedAt, created_by: actor, updated_at: importedAt, updated_by: actor
      }, ["family_code"], ["brand_name", "family_name", "category", "public_summary", "source_document_checksum", "updated_at", "updated_by"]);
    }

    for (const product of validated.register.products) {
      const recordChecksum = stableRecordChecksum(product);
      const existingProduct = await one("SELECT id, sku, version FROM products WHERE id = ? OR sku = ?", product.id, product.sku);
      if (existingProduct && (existingProduct.id !== product.id || existingProduct.sku !== product.sku)) {
        throw new Error(`Nutraxin identity collision for ${product.sku}.`);
      }
      const previous = await one(`SELECT cii.source_record_checksum_sha256
        FROM catalogue_import_items cii JOIN catalogue_imports ci ON ci.id = cii.catalogue_import_id
        WHERE cii.source_record_id = ? AND ci.status = 'imported' ORDER BY ci.imported_at DESC LIMIT 1`, product.id);
      const outcome = !existingProduct ? "created" : previous?.source_record_checksum_sha256 === recordChecksum ? "unchanged" : "updated";
      outcomes[outcome] += 1;
      const productVersion = Number(existingProduct?.version || 0) + (outcome === "unchanged" ? 0 : 1);
      await upsert("products", {
        id: product.id, sku: product.sku, ean: null, gtin: null, product_name: product.name,
        strength: null, dosage_form: product.dosageForm, pack_size: product.packSize, manufacturer: null,
        country_of_origin: null, list_price_minor: 0, currency: "GBP",
        regulatory_status: "food_supplement_classification_pending", marketing_status: "not_marketed",
        mhra_status: "not_applicable_food_supplement", lifecycle_status: "draft", version: productVersion,
        source_system: "owner_supplied_nutraxin_catalogue", created_at: importedAt, created_by: actor,
        updated_at: importedAt, updated_by: actor
      }, ["id"], ["product_name", "dosage_form", "pack_size", "regulatory_status", "marketing_status", "mhra_status", "version", "source_system", "updated_at", "updated_by"]);

      await upsert("product_variants", {
        id: `${product.id}-variant`, product_id: product.id, family_id: familyId(product.familyCode),
        variant_code: product.sku, public_slug: product.slug, display_name: product.name,
        short_name: product.name.replace(/^Nutraxin\s+/i, ""), serving_text: product.servingText,
        formulation_json: JSON.stringify(product.formulation), catalogue_page: product.cataloguePage,
        catalogue_order: product.catalogueOrder, public_status: "catalogue_reference",
        claims_review_status: "blocked_pending_evidence", sale_status: "not_offered",
        created_at: importedAt, updated_at: importedAt
      }, ["product_id"], ["family_id", "variant_code", "public_slug", "display_name", "short_name", "serving_text", "formulation_json", "catalogue_page", "catalogue_order", "updated_at"]);

      const media = mediaPaths(product);
      await upsert("product_media", {
        id: `${product.id}-pack-media`, product_id: product.id, media_role: "pack_front",
        source_path: media.sourcePath, fallback_path: media.fallbackPath,
        responsive_json: JSON.stringify(media.responsive), alt_text: product.altText,
        source_checksum: product.imageSha256, source_document_checksum: sourceChecksum,
        licence_status: "owner_supplied_authorised_for_novapharm", review_status: "verified_extract",
        created_at: importedAt, updated_at: importedAt
      }, ["product_id", "media_role"], ["source_path", "fallback_path", "responsive_json", "alt_text", "source_checksum", "source_document_checksum", "licence_status", "review_status", "updated_at"]);

      for (let index = 0; index < product.formulation.length; index += 1) {
        const item = product.formulation[index];
        await upsert("product_composition_items", {
          id: `${product.id}-composition-${index + 1}`, product_id: product.id, sequence_number: index + 1,
          ingredient_name: item.name, amount_text: item.amount,
          source_reference: `Owner-supplied Nutraxin UK catalogue, page ${product.cataloguePage}`,
          verification_status: product.notes?.length ? "blocked_discrepancy" : "catalogue_transcription",
          created_at: importedAt, updated_at: importedAt
        }, ["product_id", "sequence_number"], ["ingredient_name", "amount_text", "source_reference", "verification_status", "updated_at"]);
      }

      await run(`INSERT INTO catalogue_import_items(id, catalogue_import_id, product_id, source_record_id,
        source_record_checksum_sha256, outcome, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(), importId, product.id, product.id, recordChecksum, outcome, importedAt);

      if (outcome !== "unchanged") {
        const eventId = deterministicId("event", { importId, productId: product.id, outcome });
        const eventType = outcome === "created" ? "product.created" : "product.updated";
        const payload = { productId: product.id, sku: product.sku, source: nutraxinCatalogueCode, catalogueVersion: version,
          publicClaimsBlocked: true, saleStatus: "not_offered", syntheticTransactionData: false };
        await run(`INSERT INTO domain_events(id, event_type, aggregate_type, aggregate_id, aggregate_version,
          correlation_id, actor, payload_json, occurred_at) VALUES(?, ?, 'product', ?, ?, ?, ?, ?, ?)`,
        eventId, eventType, product.id, productVersion, importId, actor, JSON.stringify(payload), importedAt);
        await run(`INSERT INTO outbox_messages(id, domain_event_id, destination, message_type, idempotency_key,
          payload_json, status, attempt_count, next_attempt_at, created_at) VALUES(?, ?, 'internal_content_review', ?, ?, ?, 'pending', 0, ?, ?)`,
        deterministicId("outbox", eventId), eventId, eventType, `${nutraxinCatalogueCode}:${product.id}:${productVersion}`,
        JSON.stringify(payload), importedAt, importedAt);
      }
    }
    await audit({ actor, action: "catalogue.nutraxin_imported", entityType: "catalogue_import", entityId: importId,
      correlationId: importId, after: { catalogueCode: nutraxinCatalogueCode, version, productCount: validated.productCount, outcomes },
      details: { sourceChecksum, registerChecksum, publicClaimsBlocked: true, pricingImported: false, stockImported: false } });
  });
  const compositionCount = Number((await one(`SELECT COUNT(*) AS value FROM product_composition_items pci
    JOIN products p ON p.id = pci.product_id WHERE p.source_system = 'owner_supplied_nutraxin_catalogue'`))?.value || 0);
  const claimCount = Number((await one(`SELECT COUNT(*) AS value FROM product_claims pc
    JOIN products p ON p.id = pc.product_id WHERE p.source_system = 'owner_supplied_nutraxin_catalogue' AND pc.public_use_status <> 'blocked'`))?.value || 0);
  const productCount = Number((await one("SELECT COUNT(*) AS value FROM products WHERE source_system = 'owner_supplied_nutraxin_catalogue'"))?.value || 0);
  const foreignKeyIssues = await all("PRAGMA foreign_key_check");
  if (productCount !== 19 || claimCount !== 0 || foreignKeyIssues.length) throw new Error("Nutraxin post-import reconciliation failed.");
  await closeDatabase();
  return { status: "imported", importId, productCount, compositionCount, publicClaimsEnabled: claimCount, outcomes, foreignKeyIssues: 0 };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  if (dryRun) {
    console.log(JSON.stringify({ status: "validated_dry_run", productCount: validated.productCount, rangeCounts: validated.rangeCounts,
      assetCount: validated.assetCount, discrepancyCount: validated.discrepancyCount, sourceChecksum: validated.register.source.sha256,
      registerChecksum: validated.checksum, publicClaimsBlocked: true, pricingImported: false, stockImported: false }));
  } else {
    console.log(JSON.stringify(await importNutraxinCatalogue()));
  }
}
