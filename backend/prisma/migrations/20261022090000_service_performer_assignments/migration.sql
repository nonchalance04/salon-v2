BEGIN;

CREATE TABLE "ServicePerformerAssignment" (
  "id" UUID NOT NULL,
  "sequence" SERIAL NOT NULL,
  "appointmentServiceId" UUID NOT NULL,
  "staffId" UUID NOT NULL,
  "staffRecordId" UUID,
  "staffFirstNameSnapshot" TEXT NOT NULL,
  "staffLastNameSnapshot" TEXT NOT NULL,
  "commissionRateSnapshot" DECIMAL(5,4) NOT NULL,
  "reason" TEXT NOT NULL,
  "customerAgreed" BOOLEAN NOT NULL,
  "recordedByUserId" UUID NOT NULL,
  "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServicePerformerAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServicePerformerAssignment_rate_check" CHECK ("commissionRateSnapshot" BETWEEN 0 AND 1),
  CONSTRAINT "ServicePerformerAssignment_reason_check" CHECK (length(btrim("reason")) BETWEEN 1 AND 500),
  CONSTRAINT "ServicePerformerAssignment_agreement_check" CHECK ("customerAgreed" = TRUE),
  CONSTRAINT "ServicePerformerAssignment_service_fkey" FOREIGN KEY ("appointmentServiceId") REFERENCES "AppointmentService"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ServicePerformerAssignment_staff_fkey" FOREIGN KEY ("staffRecordId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ServicePerformerAssignment_actor_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServicePerformerAssignment_sequence_key" ON "ServicePerformerAssignment"("sequence");
CREATE INDEX "ServicePerformerAssignment_appointmentServiceId_sequence_idx" ON "ServicePerformerAssignment"("appointmentServiceId", "sequence");

-- New commissions follow the latest recorded performer. Existing commissions are untouched.
CREATE OR REPLACE FUNCTION snapshot_commission_staff() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE performer RECORD;
BEGIN
  SELECT * INTO performer FROM "ServicePerformerAssignment"
    WHERE "appointmentServiceId" = NEW."appointmentServiceId" ORDER BY "sequence" DESC LIMIT 1;
  IF FOUND THEN
    IF NEW."staffId" IS DISTINCT FROM performer."staffId" THEN
      RAISE EXCEPTION 'Commission staff must match the recorded performer' USING ERRCODE = '23503';
    END IF;
    NEW."staffRecordId" := performer."staffRecordId";
    NEW."staffFirstNameSnapshot" := performer."staffFirstNameSnapshot";
    NEW."staffLastNameSnapshot" := performer."staffLastNameSnapshot";
  ELSE
    SELECT "staffRecordId", "staffFirstNameSnapshot", "staffLastNameSnapshot" INTO
      NEW."staffRecordId", NEW."staffFirstNameSnapshot", NEW."staffLastNameSnapshot"
    FROM "AppointmentService" WHERE id = NEW."appointmentServiceId" AND "staffId" = NEW."staffId";
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Commission staff must match the appointment service' USING ERRCODE = '23503';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
