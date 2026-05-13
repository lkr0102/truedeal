-- Extend deal_status enum with settlement lifecycle values used by the
-- settlement protocol (settlement.ts) and the withdraw flow (deals.ts).
--
-- PostgreSQL requires ADD VALUE to run outside a transaction block.
-- Each statement is idempotent via the existence check below.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'liquidando'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'deal_status')
  ) THEN
    ALTER TYPE deal_status ADD VALUE 'liquidando';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'encerrado'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'deal_status')
  ) THEN
    ALTER TYPE deal_status ADD VALUE 'encerrado';
  END IF;
END$$;
