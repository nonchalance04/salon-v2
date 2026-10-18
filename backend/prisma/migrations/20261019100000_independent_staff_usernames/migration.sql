BEGIN;

-- Preserve each existing login name. Ambiguous legacy names require operator resolution.
DO $$
DECLARE conflicts TEXT;
BEGIN
  SELECT string_agg(name, ', ' ORDER BY name) INTO conflicts
  FROM (SELECT lower(split_part(email, '@', 1)) AS name FROM "User"
        GROUP BY lower(split_part(email, '@', 1)) HAVING count(*) > 1) duplicates;
  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate legacy usernames: %. Resolve email local-part conflicts before applying this migration.', conflicts;
  END IF;
END $$;

ALTER TABLE "User" ADD COLUMN "username" TEXT;
UPDATE "User" SET "username" = lower(split_part(email, '@', 1));
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
ALTER TABLE "User" ADD CONSTRAINT "User_username_format_check"
  CHECK (length("username") BETWEEN 1 AND 254 AND "username" = lower("username")
         AND "username" !~ '[[:space:]@]');

COMMIT;
