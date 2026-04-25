"""
Idempotent runner for the eBay Consignments SQL migration.

Called from the FastAPI lifespan so deployments don't have to remember to
manually `psql -f` the migration file.  The migration itself uses
`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, and
`DROP TRIGGER IF EXISTS / CREATE TRIGGER` patterns, so it is safe to execute
on every cold start.

To opt out, set environment variable EBAY_CONSIGNMENTS_AUTO_MIGRATE=false.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from sqlalchemy import inspect, text

from app.database import sync_engine

logger = logging.getLogger(__name__)

MIGRATION_PATH = (
    Path(__file__).resolve().parents[2] / "migrations" / "add_ebay_consignments.sql"
)

REQUIRED_TABLES = {
    "ebay_consigners",
    "ebay_consignment_agreements",
    "ebay_consignment_items",
    "ebay_consignment_payouts",
}


def _all_tables_present() -> bool:
    try:
        existing = set(inspect(sync_engine).get_table_names())
    except Exception as exc:  # pragma: no cover - DB unreachable
        logger.warning("ebay-consignments: cannot list tables (%s)", exc)
        return False
    return REQUIRED_TABLES.issubset(existing)


def ensure_ebay_consignment_schema() -> bool:
    """Apply the eBay consignments migration on every cold start.

    The migration is fully idempotent (`CREATE TABLE IF NOT EXISTS`,
    `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS / CREATE TRIGGER`,
    and `DO $$ ... $$` blocks that check column existence before ALTERing).
    Running it on every boot is therefore cheap and safe, and ensures any
    new ALTER statements added after the first deploy actually take effect.

    Returns True on success, False if we couldn't apply it.
    """
    if os.environ.get("EBAY_CONSIGNMENTS_AUTO_MIGRATE", "true").lower() == "false":
        logger.warning("ebay-consignments: auto-migrate disabled via env")
        return _all_tables_present()

    if not MIGRATION_PATH.exists():
        logger.error("ebay-consignments: migration file not found at %s", MIGRATION_PATH)
        return False

    # Log starting state so we can diagnose deploy issues
    starting_missing = _missing_required_columns()
    print(
        f"[ebay-consignments] starting migration; missing columns before: "
        f"{starting_missing or 'none'}",
        flush=True,
    )

    sql = MIGRATION_PATH.read_text(encoding="utf-8")
    print(f"[ebay-consignments] applying migration from {MIGRATION_PATH}", flush=True)
    try:
        # Raw DBAPI exec so the multi-statement script (with $$ plpgsql function
        # bodies) executes verbatim instead of being split on `;` by SQLAlchemy.
        with sync_engine.begin() as conn:
            conn.exec_driver_sql(sql)
    except Exception as exc:
        print(f"[ebay-consignments] ERROR migration failed: {exc}", flush=True)
        logger.exception("ebay-consignments: migration failed: %s", exc)
        return False

    # Verify the columns we depend on actually exist now.  If any DO block
    # silently skipped, surface it loudly in the logs.
    missing = _missing_required_columns()
    if missing:
        print(
            f"[ebay-consignments] WARN migration ran but columns still missing: {missing}",
            flush=True,
        )
        return False
    print("[ebay-consignments] migration applied successfully", flush=True)
    return True


def _missing_required_columns() -> list[str]:
    """Return any required columns that are absent from the live schema."""
    required = {
        "ebay_consigners":             {"default_payout_percent"},
        "ebay_consignment_agreements": {"payout_percent"},
    }
    missing: list[str] = []
    insp = inspect(sync_engine)
    for table, cols in required.items():
        try:
            present = {c["name"] for c in insp.get_columns(table)}
        except Exception:
            missing.extend(f"{table}.{c}" for c in cols)
            continue
        for c in cols:
            if c not in present:
                missing.append(f"{table}.{c}")
    return missing
