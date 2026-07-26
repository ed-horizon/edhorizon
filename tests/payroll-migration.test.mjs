import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const reconciliationPath = new URL(
  '../supabase/migrations/20260722120000_reconcile_payroll_ledger_and_atomic_mutations.sql',
  import.meta.url,
)
const compatibilityPath = new URL(
  '../supabase/migrations/20260723120000_keep_payroll_legacy_columns_in_sync.sql',
  import.meta.url,
)

test('payroll reconciliation keeps legacy writes compatible during rollout', async () => {
  const [reconciliation, compatibility] = await Promise.all([
    readFile(reconciliationPath, 'utf8'),
    readFile(compatibilityPath, 'utf8'),
  ])

  for (const migration of [reconciliation, compatibility]) {
    assert.match(migration, /ADD COLUMN IF NOT EXISTS payroll_run_id UUID/)
    assert.match(migration, /ADD COLUMN IF NOT EXISTS amount NUMERIC\(12, 2\)/)
    assert.match(migration, /CREATE OR REPLACE FUNCTION public\.sync_payroll_item_legacy_columns\(\)/)
    assert.match(migration, /BEFORE INSERT OR UPDATE ON public\.payroll_items/)
    assert.match(migration, /NEW\.run_id := COALESCE\(NEW\.run_id, NEW\.payroll_run_id\)/)
    assert.match(migration, /NEW\.basic_amount := COALESCE\(NEW\.amount, 0\)/)
  }
})

test('duplicate full-payout payslips select a canonical row without summing', async () => {
  const migration = await readFile(reconciliationPath, 'utf8')

  assert.match(migration, /WHEN 'paid' THEN 4/)
  assert.match(migration, /WHEN 'processing' THEN 3/)
  assert.doesNotMatch(migration, /sum\(COALESCE\(item\.basic_amount/)
  assert.doesNotMatch(migration, /sum\(COALESCE\(item\.bonus_amount/)
  assert.doesNotMatch(migration, /sum\(COALESCE\(item\.deductions_amount/)
})
