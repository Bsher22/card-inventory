#!/usr/bin/env python3
"""
CLI script to run bulk inventory import.
Usage: python run_bulk_import.py <excel_file_path>
"""

import asyncio
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the preview function directly (doesn't need DB)
from app.services.bulk_inventory_import import preview_import


async def run_preview(file_path: str):
    """Preview import without making changes."""
    print(f"\n{'='*60}")
    print("PREVIEW MODE - No changes will be made")
    print(f"{'='*60}\n")

    result = await preview_import(file_path)

    print(f"Total Rows: {result['total_rows']}")
    print(f"Total Cards: {result['total_cards']}")
    print(f"Total Value: ${result['total_value']:,.2f}")
    print(f"Unique Players: {result['unique_players']}")

    print(f"\n--- Year Breakdown ---")
    for year, data in result['year_breakdown'].items():
        print(f"  {year}: {data['count']} cards, ${data['value']:,.2f}")

    print(f"\n--- Type Breakdown ---")
    for type_name, data in list(result['type_breakdown'].items())[:15]:
        print(f"  {type_name}: {data['count']} cards, ${data['value']:,.2f}")

    print(f"\n--- Sample Rows ---")
    for row in result['sample_rows'][:5]:
        print(f"  {row['date'][:10]} | {row['player'][:25]:<25} | {row['year']} | {row['card_type'][:15]:<15} | {row['quantity']} @ ${row['price']:.2f}")

    return result


async def main():
    if len(sys.argv) < 2:
        print("Usage: python run_bulk_import.py <excel_file_path> [--preview]")
        print("\nOptions:")
        print("  --preview    Preview import without making changes")
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        sys.exit(1)

    print(f"File: {file_path}")

    # Run preview
    await run_preview(file_path)

    print("\n\nNote: To execute the actual import, use the API endpoint:")
    print("  POST /api/bulk-import/execute")
    print("  with the Excel file as form-data")


if __name__ == "__main__":
    asyncio.run(main())
