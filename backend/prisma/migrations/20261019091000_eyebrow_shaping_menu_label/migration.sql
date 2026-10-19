-- The public menu also uses the seeded description as its category label.
UPDATE "Service"
SET "description" = 'Hair Services'
WHERE lower(trim("name")) = 'eyebrow shaping'
  AND "category" = 'Hair Services'
  AND lower(trim("description")) = 'nail services';
