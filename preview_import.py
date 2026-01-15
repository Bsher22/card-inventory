#!/usr/bin/env python3
"""
Standalone preview script for bulk inventory import.
No backend dependencies required.
"""

import pandas as pd
from datetime import datetime


# Type mapping from bulk_inventory_import.py
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
    "Image Variation-Sapphire": ("Sapphire", "Image Variation", False),
    "Blue Mega": ("Mega", "Blue Mega", False),
    "Green Mega": ("Mega", "Green Mega", False),
    "Pink Mega": ("Mega", "Pink Mega", False),
    "Purple Mega": ("Mega", "Purple Mega", False),
    "Mega Image": ("Mega", "Image Variation", False),
    "Mega Image Variation": ("Mega", "Image Variation", False),
    "Image Variation-Mega": ("Mega", "Image Variation", False),
    "Mega Variation": ("Mega", "Variation", False),
    "Image Variation": ("Paper", "Image Variation", False),
    "Variation": ("Paper", "Variation", False),
    "Draft Image Variation": ("Paper", "Draft Image Variation", False),
    "Auto": ("Chrome", None, True),
    "*": ("Paper", None, False),
    "***": ("Paper", None, False),
}


def map_card_type(type_str):
    """Map Excel Type value to (base_type, parallel, is_autograph)."""
    type_str = str(type_str).strip()

    if type_str in TYPE_MAPPING:
        return TYPE_MAPPING[type_str]

    for key, value in TYPE_MAPPING.items():
        if key.lower() == type_str.lower():
            return value

    type_lower = type_str.lower()
    if "sapphire" in type_lower:
        if "aqua" in type_lower:
            return ("Sapphire", "Aqua Sapphire", False)
        if "orange" in type_lower:
            return ("Sapphire", "Orange Sapphire", False)
        return ("Sapphire", None, False)
    if "chrome" in type_lower:
        return ("Chrome", None, False)
    if "mega" in type_lower:
        return ("Mega", None, False)
    if "refractor" in type_lower:
        return ("Chrome", "Refractor", False)
    if "auto" in type_lower:
        return ("Chrome", None, True)
    if "shimmer" in type_lower:
        return ("Chrome", "Shimmer", False)

    return ("Paper", None, False)


def preview_import(file_path):
    """Preview what would be imported."""
    df = pd.read_excel(file_path)

    # Check if cleaned format (has headers)
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
            if hasattr(date_val, 'strftime'):
                date_str = date_val.strftime('%Y-%m-%d')
            else:
                date_str = str(date_val)[:10]

            rows.append({
                "date": date_str,
                "player": str(row['player_name']).strip(),
                "year": year,
                "card_type": card_type,
                "base_type": base_type,
                "parallel": parallel,
                "is_auto": is_auto,
                "quantity": int(row.get('quantity', 1)),
                "price": float(row.get('price_total', 0))
            })
    else:
        # Raw format
        df = pd.read_excel(file_path, header=None)
        for i in range(5, len(df)):
            row_data = df.iloc[i, :7].tolist()

            if pd.isna(row_data[1]) or not isinstance(row_data[0], (datetime, pd.Timestamp)):
                continue

            year_val = row_data[2]
            if isinstance(year_val, (datetime, pd.Timestamp)):
                year = year_val.year
            elif isinstance(year_val, (int, float)) and not pd.isna(year_val):
                year = int(year_val)
            else:
                continue

            if year < 2015 or year > 2030:
                continue

            card_type = str(row_data[4]).strip() if pd.notna(row_data[4]) else "Base"
            base_type, parallel, is_auto = map_card_type(card_type)

            rows.append({
                "date": row_data[0].strftime('%Y-%m-%d') if hasattr(row_data[0], 'strftime') else str(row_data[0])[:10],
                "player": str(row_data[1]).strip(),
                "year": year,
                "card_type": card_type,
                "base_type": base_type,
                "parallel": parallel,
                "is_auto": is_auto,
                "quantity": int(row_data[5]) if pd.notna(row_data[5]) else 1,
                "price": float(row_data[6]) if pd.notna(row_data[6]) else 0.0
            })

    # Calculate statistics
    total_cards = sum(r["quantity"] for r in rows)
    total_value = sum(r["price"] for r in rows)

    # Type breakdown
    type_breakdown = {}
    for r in rows:
        key = f"{r['base_type']}" + (f" - {r['parallel']}" if r['parallel'] else "")
        if key not in type_breakdown:
            type_breakdown[key] = {"count": 0, "value": 0}
        type_breakdown[key]["count"] += r["quantity"]
        type_breakdown[key]["value"] += r["price"]

    # Year breakdown
    year_breakdown = {}
    for r in rows:
        y = r["year"]
        if y not in year_breakdown:
            year_breakdown[y] = {"count": 0, "value": 0}
        year_breakdown[y]["count"] += r["quantity"]
        year_breakdown[y]["value"] += r["price"]

    return {
        "total_rows": len(rows),
        "total_cards": total_cards,
        "total_value": total_value,
        "type_breakdown": dict(sorted(type_breakdown.items(), key=lambda x: -x[1]["count"])),
        "year_breakdown": dict(sorted(year_breakdown.items())),
        "sample_rows": rows[:10],
        "unique_players": len(set(r["player"] for r in rows))
    }


if __name__ == "__main__":
    import sys

    file_path = sys.argv[1] if len(sys.argv) > 1 else "inventory_import_cleaned.xlsx"

    print(f"\nPreview Import: {file_path}")
    print("=" * 60)

    result = preview_import(file_path)

    print(f"\nTotal Rows: {result['total_rows']}")
    print(f"Total Cards: {result['total_cards']}")
    print(f"Total Value: ${result['total_value']:,.2f}")
    print(f"Unique Players: {result['unique_players']}")

    print(f"\n--- Year Breakdown ---")
    for year, data in result['year_breakdown'].items():
        print(f"  {year}: {data['count']} cards, ${data['value']:,.2f}")

    print(f"\n--- Type Breakdown (Top 15) ---")
    for type_name, data in list(result['type_breakdown'].items())[:15]:
        print(f"  {type_name}: {data['count']} cards, ${data['value']:,.2f}")

    print(f"\n--- Sample Rows ---")
    for row in result['sample_rows'][:10]:
        print(f"  {row['date']} | {row['player'][:30]:<30} | {row['year']} | {row['card_type'][:20]:<20} | {row['quantity']:>3} @ ${row['price']:>8.2f}")
