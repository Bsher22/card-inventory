#!/usr/bin/env python3
"""
Direct database import script for bulk inventory.
Connects directly to Railway PostgreSQL using psycopg2.
"""

import os
import re
import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# Railway Database URL (parsed for psycopg2)
DB_CONFIG = {
    "host": "switchback.proxy.rlwy.net",
    "port": 12775,
    "database": "railway",
    "user": "postgres",
    "password": "oktBbEQIwszLZbDMwdaqwSxgyzQzolfD"
}

# Type mapping
TYPE_MAPPING = {
    "Base": ("Paper", None, False),
    "base": ("Paper", None, False),
    "Paper": ("Paper", None, False),
    "Draft Paper": ("Paper", None, False),
    "Chrome": ("Chrome", None, False),
    "Mega": ("Mega", None, False),
    "Sapphire": ("Sapphire", None, False),
    "sapphire": ("Sapphire", None, False),
    "Refractor": ("Chrome", "Refractor", False),
    "Purple Refractor": ("Chrome", "Purple Refractor", False),
    "Aqua Ref": ("Chrome", "Aqua Refractor", False),
    "Aqua Refractor": ("Chrome", "Aqua Refractor", False),
    "Shimmer": ("Chrome", "Shimmer", False),
    "Green Shimmer": ("Chrome", "Green Shimmer", False),
    "Diamond": ("Chrome", "Mini Diamond", False),
    "Mini Diamond": ("Chrome", "Mini Diamond", False),
    "Raywave": ("Chrome", "Raywave", False),
    "Raywave/Chrome": ("Chrome", "Raywave", False),
    "Atomic": ("Chrome", "Atomic", False),
    "Speckle": ("Chrome", "Speckle", False),
    "Sparkle": ("Chrome", "Sparkle", False),
    "Lunar": ("Chrome", "Lunar", False),
    "Lunar Glow": ("Chrome", "Lunar Glow", False),
    "Sky Blue": ("Chrome", "Sky Blue", False),
    "SkyBlue": ("Chrome", "Sky Blue", False),
    "Lava": ("Chrome", "Lava", False),
    "Asia Mojo": ("Chrome", "Asia Mojo", False),
    "Camo Paper": ("Chrome", "Camo", False),
    "Aqua Sapphire": ("Sapphire", "Aqua Sapphire", False),
    "Orange Sapphire": ("Sapphire", "Orange Sapphire", False),
    "Purple Sapphire": ("Sapphire", "Purple Sapphire", False),
    "Green Sapphire": ("Sapphire", "Green Sapphire", False),
    "Yellow Sapphire": ("Sapphire", "Yellow Sapphire", False),
    "Gold Sapphire": ("Sapphire", "Gold Sapphire", False),
    "Sapphire Image": ("Sapphire", "Image Variation", False),
    "Image-Sapphire": ("Sapphire", "Image Variation", False),
    "Blue Mega": ("Mega", "Blue Mega", False),
    "Green Mega": ("Mega", "Green Mega", False),
    "Pink Mega": ("Mega", "Pink Mega", False),
    "Purple Mega": ("Mega", "Purple Mega", False),
    "Mega Image": ("Mega", "Image Variation", False),
    "Image Variation": ("Paper", "Image Variation", False),
    "Variation": ("Paper", "Variation", False),
    "Auto": ("Chrome", None, True),
}


def map_card_type(type_str):
    type_str = str(type_str).strip()
    if type_str in TYPE_MAPPING:
        return TYPE_MAPPING[type_str]
    for key, value in TYPE_MAPPING.items():
        if key.lower() == type_str.lower():
            return value
    type_lower = type_str.lower()
    if "sapphire" in type_lower:
        return ("Sapphire", None, False)
    if "chrome" in type_lower:
        return ("Chrome", None, False)
    if "mega" in type_lower:
        return ("Mega", None, False)
    if "refractor" in type_lower:
        return ("Chrome", "Refractor", False)
    if "auto" in type_lower:
        return ("Chrome", None, True)
    return ("Paper", None, False)


def normalize_player_name(name: str) -> str:
    name = name.strip()
    if "," in name:
        parts = name.split(",")
        if len(parts) == 2:
            name = f"{parts[1].strip()} {parts[0].strip()}"
    name = " ".join(name.split()).lower()
    name = re.sub(r'\s+(jr\.?|sr\.?|ii|iii|iv)$', '', name, flags=re.IGNORECASE)
    return name


def generate_card_number(player_name: str, year: int) -> str:
    name_hash = abs(hash(normalize_player_name(player_name))) % 100000
    return f"IMP-{year}-{name_hash:05d}"


def get_product_line_name(year: int, base_type: str) -> str:
    if base_type == "Sapphire":
        return "Bowman Sapphire"
    elif base_type == "Mega":
        return "Bowman Mega Box"
    elif base_type == "Paper":
        return "Bowman"
    else:
        return "Bowman Chrome"


@dataclass
class ImportRow:
    purchase_date: date
    player_name: str
    year: int
    company: str
    card_type: str
    quantity: int
    price_total: Decimal
    notes: Optional[str] = None
    base_type_name: Optional[str] = None
    parallel_name: Optional[str] = None
    is_autograph: bool = False


@dataclass
class ImportResult:
    total_rows: int = 0
    successful: int = 0
    failed: int = 0
    errors: List[str] = field(default_factory=list)
    brands_created: int = 0
    product_lines_created: int = 0
    players_created: int = 0
    checklists_created: int = 0
    inventory_created: int = 0
    purchases_created: int = 0


def parse_excel(file_path: str) -> List[ImportRow]:
    df = pd.read_excel(file_path)
    expected_cols = {'purchase_date', 'player_name', 'year', 'brand', 'card_type', 'quantity', 'price_total'}
    has_headers = expected_cols.issubset(set(df.columns.str.lower()))

    rows = []
    if has_headers:
        df.columns = df.columns.str.lower()
        for _, row in df.iterrows():
            if pd.isna(row.get('player_name')) or pd.isna(row.get('purchase_date')):
                continue
            year = int(row['year']) if pd.notna(row.get('year')) else None
            if not year or year < 2015 or year > 2030:
                continue
            card_type = str(row.get('card_type', 'Paper')).strip()
            base_type, parallel, is_auto = map_card_type(card_type)
            date_val = row['purchase_date']
            if isinstance(date_val, (datetime, pd.Timestamp)):
                purchase_date = date_val.date()
            elif isinstance(date_val, date):
                purchase_date = date_val
            else:
                continue

            import_row = ImportRow(
                purchase_date=purchase_date,
                player_name=str(row['player_name']).strip(),
                year=year,
                company=str(row.get('brand', 'Bowman')).strip(),
                card_type=card_type,
                quantity=int(row.get('quantity', 1)),
                price_total=Decimal(str(row.get('price_total', 0))),
                notes=str(row.get('notes', '')).strip() if pd.notna(row.get('notes')) else None,
                base_type_name=base_type,
                parallel_name=parallel,
                is_autograph=is_auto
            )
            rows.append(import_row)
    return rows


class DirectImporter:
    def __init__(self, conn):
        self.conn = conn
        self.cursor = conn.cursor()
        self.result = ImportResult()
        self.brand_cache = {}
        self.product_line_cache = {}
        self.player_cache = {}
        self.base_type_cache = {}
        self.parallel_cache = {}
        self.checklist_cache = {}

    def get_or_create_brand(self, name: str) -> str:
        cache_key = name.lower()
        if cache_key in self.brand_cache:
            return self.brand_cache[cache_key]

        self.cursor.execute("SELECT id FROM brands WHERE LOWER(name) = %s", (cache_key,))
        row = self.cursor.fetchone()
        if row:
            self.brand_cache[cache_key] = str(row[0])
            return str(row[0])

        new_id = str(uuid.uuid4())
        self.cursor.execute(
            "INSERT INTO brands (id, name, slug) VALUES (%s, %s, %s)",
            (new_id, name, name.lower().replace(" ", "-"))
        )
        self.brand_cache[cache_key] = new_id
        self.result.brands_created += 1
        return new_id

    def get_or_create_product_line(self, brand_id, name: str, year: int) -> str:
        cache_key = f"{brand_id}:{name}:{year}"
        if cache_key in self.product_line_cache:
            return self.product_line_cache[cache_key]

        self.cursor.execute(
            "SELECT id FROM product_lines WHERE brand_id = %s AND name = %s AND year = %s",
            (brand_id, name, year)
        )
        row = self.cursor.fetchone()
        if row:
            self.product_line_cache[cache_key] = str(row[0])
            return str(row[0])

        new_id = str(uuid.uuid4())
        self.cursor.execute(
            "INSERT INTO product_lines (id, brand_id, name, year, sport) VALUES (%s, %s, %s, %s, %s)",
            (new_id, brand_id, name, year, "Baseball")
        )
        self.product_line_cache[cache_key] = new_id
        self.result.product_lines_created += 1
        return new_id

    def get_or_create_player(self, name: str) -> str:
        normalized = normalize_player_name(name)
        if normalized in self.player_cache:
            return self.player_cache[normalized]

        self.cursor.execute("SELECT id FROM players WHERE name_normalized = %s", (normalized,))
        row = self.cursor.fetchone()
        if row:
            self.player_cache[normalized] = str(row[0])
            return str(row[0])

        display_name = name.strip()
        if "," in display_name:
            parts = display_name.split(",")
            if len(parts) == 2:
                display_name = f"{parts[1].strip()} {parts[0].strip()}"

        new_id = str(uuid.uuid4())
        self.cursor.execute(
            "INSERT INTO players (id, name, name_normalized, is_prospect) VALUES (%s, %s, %s, %s)",
            (new_id, display_name, normalized, True)
        )
        self.player_cache[normalized] = new_id
        self.result.players_created += 1
        return new_id

    def get_or_create_base_type(self, name: Optional[str]) -> Optional[str]:
        if not name:
            return None
        cache_key = name.lower()
        if cache_key in self.base_type_cache:
            return self.base_type_cache[cache_key]

        self.cursor.execute("SELECT id FROM card_base_types WHERE LOWER(name) = %s", (cache_key,))
        row = self.cursor.fetchone()
        if row:
            self.base_type_cache[cache_key] = str(row[0])
            return str(row[0])

        new_id = str(uuid.uuid4())
        self.cursor.execute("INSERT INTO card_base_types (id, name) VALUES (%s, %s)", (new_id, name))
        self.base_type_cache[cache_key] = new_id
        return new_id

    def get_or_create_parallel(self, name: Optional[str]) -> Optional[str]:
        if not name:
            return None
        cache_key = name.lower()
        if cache_key in self.parallel_cache:
            return self.parallel_cache[cache_key]

        self.cursor.execute("SELECT id FROM parallels WHERE LOWER(name) = %s", (cache_key,))
        row = self.cursor.fetchone()
        if row:
            self.parallel_cache[cache_key] = str(row[0])
            return str(row[0])

        new_id = str(uuid.uuid4())
        self.cursor.execute(
            "INSERT INTO parallels (id, name, short_name, is_numbered) VALUES (%s, %s, %s, %s)",
            (new_id, name, name, False)
        )
        self.parallel_cache[cache_key] = new_id
        return new_id

    def get_or_create_checklist(self, product_line_id, player_name: str, player_id, year: int, card_type: str, is_auto: bool, base_type_id) -> str:
        card_number = generate_card_number(player_name, year)
        set_name = "Import" if not is_auto else "Import - Autographs"
        cache_key = f"{product_line_id}:{card_number}:{set_name}"

        if cache_key in self.checklist_cache:
            return self.checklist_cache[cache_key]

        self.cursor.execute(
            "SELECT id FROM checklists WHERE product_line_id = %s AND card_number = %s AND set_name = %s",
            (product_line_id, card_number, set_name)
        )
        row = self.cursor.fetchone()
        if row:
            self.checklist_cache[cache_key] = str(row[0])
            return str(row[0])

        display_name = player_name.strip()
        if "," in display_name:
            parts = display_name.split(",")
            if len(parts) == 2:
                display_name = f"{parts[1].strip()} {parts[0].strip()}"

        new_id = str(uuid.uuid4())
        self.cursor.execute(
            """INSERT INTO checklists (id, product_line_id, card_number, player_name_raw, player_id,
               base_type_id, set_name, is_autograph, is_first_bowman, raw_checklist_line)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (new_id, product_line_id, card_number, display_name, player_id, base_type_id,
             set_name, is_auto, True, f"IMPORT: {player_name} | {card_type}")
        )
        self.checklist_cache[cache_key] = new_id
        self.result.checklists_created += 1
        return new_id

    def create_inventory(self, checklist_id, base_type_id, parallel_id, quantity: int, is_signed: bool, total_cost: Decimal) -> str:
        # Check for existing
        if parallel_id:
            self.cursor.execute(
                """SELECT id, quantity, total_cost FROM inventory
                   WHERE checklist_id = %s AND is_signed = %s AND is_slabbed = false
                   AND base_type_id = %s AND parallel_id = %s""",
                (checklist_id, is_signed, base_type_id, parallel_id)
            )
        elif base_type_id:
            self.cursor.execute(
                """SELECT id, quantity, total_cost FROM inventory
                   WHERE checklist_id = %s AND is_signed = %s AND is_slabbed = false
                   AND base_type_id = %s AND parallel_id IS NULL""",
                (checklist_id, is_signed, base_type_id)
            )
        else:
            self.cursor.execute(
                """SELECT id, quantity, total_cost FROM inventory
                   WHERE checklist_id = %s AND is_signed = %s AND is_slabbed = false
                   AND base_type_id IS NULL AND parallel_id IS NULL""",
                (checklist_id, is_signed)
            )

        row = self.cursor.fetchone()
        if row:
            self.cursor.execute(
                "UPDATE inventory SET quantity = quantity + %s, total_cost = total_cost + %s WHERE id = %s",
                (quantity, float(total_cost), str(row[0]))
            )
            return str(row[0])

        new_id = str(uuid.uuid4())
        self.cursor.execute(
            """INSERT INTO inventory (id, item_type, checklist_id, base_type_id, parallel_id,
               quantity, is_signed, is_slabbed, total_cost)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (new_id, "card", checklist_id, base_type_id, parallel_id, quantity, is_signed, False, float(total_cost))
        )
        self.result.inventory_created += 1
        return new_id

    def create_purchase(self, purchase_date, checklist_id, quantity: int, total_price: Decimal, notes: Optional[str]) -> str:
        unit_price = total_price / quantity if quantity > 0 else total_price
        purchase_id = str(uuid.uuid4())
        self.cursor.execute(
            """INSERT INTO purchases (id, purchase_date, platform, vendor, subtotal, total, notes)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (purchase_id, purchase_date, "Import", "Legacy Import", float(total_price), float(total_price), notes)
        )
        self.result.purchases_created += 1

        item_id = str(uuid.uuid4())
        self.cursor.execute(
            """INSERT INTO purchase_items (id, purchase_id, checklist_id, quantity, unit_price, condition, notes)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (item_id, purchase_id, checklist_id, quantity, float(unit_price), "Raw", notes)
        )
        return purchase_id

    def import_row(self, row: ImportRow) -> bool:
        try:
            brand_id = self.get_or_create_brand(row.company)
            product_line_name = get_product_line_name(row.year, row.base_type_name or "Chrome")
            product_line_id = self.get_or_create_product_line(brand_id, product_line_name, row.year)
            player_id = self.get_or_create_player(row.player_name)
            base_type_id = self.get_or_create_base_type(row.base_type_name)
            parallel_id = self.get_or_create_parallel(row.parallel_name)
            checklist_id = self.get_or_create_checklist(
                product_line_id, row.player_name, player_id, row.year,
                row.card_type, row.is_autograph, base_type_id
            )
            self.create_inventory(checklist_id, base_type_id, parallel_id, row.quantity, row.is_autograph, row.price_total)
            self.create_purchase(row.purchase_date, checklist_id, row.quantity, row.price_total, row.notes)
            self.result.successful += 1
            return True
        except Exception as e:
            self.result.failed += 1
            self.result.errors.append(f"Row {self.result.total_rows}: {str(e)}")
            return False


def run_import(file_path: str):
    print(f"\nConnecting to Railway PostgreSQL...")
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False

    rows = parse_excel(file_path)
    print(f"Parsed {len(rows)} rows from Excel")

    try:
        importer = DirectImporter(conn)
        importer.result.total_rows = len(rows)

        print(f"\nImporting {len(rows)} rows...")
        for i, row in enumerate(rows):
            importer.import_row(row)
            if (i + 1) % 100 == 0:
                print(f"  Processed {i + 1}/{len(rows)} rows...")
                conn.commit()

        conn.commit()
        print(f"\nImport complete!")

        r = importer.result
        print(f"\n{'='*60}")
        print("RESULTS")
        print(f"{'='*60}")
        print(f"Total Rows: {r.total_rows}")
        print(f"Successful: {r.successful}")
        print(f"Failed: {r.failed}")
        print(f"\nEntities Created:")
        print(f"  Brands: {r.brands_created}")
        print(f"  Product Lines: {r.product_lines_created}")
        print(f"  Players: {r.players_created}")
        print(f"  Checklists: {r.checklists_created}")
        print(f"  Inventory Items: {r.inventory_created}")
        print(f"  Purchases: {r.purchases_created}")

        if r.errors:
            print(f"\nErrors ({len(r.errors)}):")
            for e in r.errors[:10]:
                print(f"  {e}")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    import sys
    file_path = sys.argv[1] if len(sys.argv) > 1 else "inventory_import_cleaned.xlsx"

    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        sys.exit(1)

    print(f"File: {file_path}")
    confirm = input("Run import against Railway database? (yes/no): ")
    if confirm.lower() == 'yes':
        run_import(file_path)
    else:
        print("Cancelled.")
