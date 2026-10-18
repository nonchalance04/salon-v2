-- Allocate readable staff IDs atomically, including concurrent inserts.
CREATE SEQUENCE "Staff_code_seq";
SELECT setval('"Staff_code_seq"', GREATEST(COALESCE((
  SELECT MAX(substring("staffCode" FROM '^STF-([0-9]+)$')::bigint)
  FROM "Staff"
), 0) + 1, 1), false);

ALTER SEQUENCE "Staff_code_seq" OWNED BY "Staff"."staffCode";
ALTER TABLE "Staff" ALTER COLUMN "staffCode"
  SET DEFAULT ('STF-' || nextval('"Staff_code_seq"')::text);

-- Preserve existing codes and give older staff their own permanent code.
UPDATE "Staff" SET "staffCode" = DEFAULT
WHERE "staffCode" IS NULL OR btrim("staffCode") = '';
ALTER TABLE "Staff" ALTER COLUMN "staffCode" SET NOT NULL;
