-- Reclassify the service without changing historical appointment snapshots.
UPDATE "Service"
SET "category" = 'Hair Services'
WHERE lower(trim("name")) = 'eyebrow shaping';
