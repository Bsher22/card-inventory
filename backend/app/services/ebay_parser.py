"""
eBay Sales Report Parser Service

Parses eBay "Listings & Sales Report" CSV files.
Handles the specific format including:
- Skip disclaimer rows (first 9 rows)
- Parse report date range from row 9
- Parse money values (strip $, commas)
- Handle scientific notation in item IDs
"""
import csv
import io
import re
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Optional

from ..schemas_ebay import EbayListingPreview, EbayUploadPreviewResponse


def parse_money(value: str) -> Decimal:
    """Parse money string like '$1,234.56' to Decimal."""
    if not value or value.strip() == '':
        return Decimal("0")
    
    # Remove $, commas, spaces, and quotes
    cleaned = value.strip().replace('$', '').replace(',', '').replace('"', '').strip()
    
    if not cleaned:
        return Decimal("0")
    
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return Decimal("0")


def parse_ebay_item_id(value: str) -> str:
    """
    Parse eBay item ID, handling scientific notation.
    e.g., '3.3521E+11' -> '335210000000'
    """
    if not value:
        return ""
    
    value = value.strip()
    
    # Check if it's in scientific notation
    if 'E' in value.upper():
        try:
            # Convert to float first, then to int to remove decimals
            num = float(value)
            return str(int(num))
        except (ValueError, OverflowError):
            return value
    
    return value


def parse_int(value: str) -> int:
    """Parse integer, defaulting to 0."""
    if not value or value.strip() == '':
        return 0
    try:
        return int(float(value.strip()))
    except (ValueError, TypeError):
        return 0


def parse_report_date_range(text: str) -> tuple[Optional[date], Optional[date]]:
    """
    Parse date range from report header like:
    'Report for Jan 1, 2025 to Dec 28, 2025'
    """
    pattern = r'Report for (\w+ \d+, \d{4}) to (\w+ \d+, \d{4})'
    match = re.search(pattern, text)
    
    if not match:
        return None, None
    
    from datetime import datetime
    
    try:
        start_str = match.group(1)
        end_str = match.group(2)
        
        start_date = datetime.strptime(start_str, "%b %d, %Y").date()
        end_date = datetime.strptime(end_str, "%b %d, %Y").date()
        
        return start_date, end_date
    except ValueError:
        return None, None


def parse_ebay_csv(file_content: bytes) -> EbayUploadPreviewResponse:
    """
    Parse eBay Listings & Sales Report CSV.
    
    Expected format:
    - Rows 1-8: Disclaimers
    - Row 9: Report date range
    - Row 10: Header row
    - Rows 11+: Data
    """
    warnings = []
    listings = []
    
    try:
        # Decode content - handle BOM
        content = file_content.decode('utf-8-sig')
    except UnicodeDecodeError:
        try:
            content = file_content.decode('latin-1')
        except UnicodeDecodeError:
            return EbayUploadPreviewResponse(
                success=False,
                message="Unable to decode file. Please ensure it's a valid CSV file.",
                warnings=["File encoding not recognized"]
            )
    
    # Parse CSV
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)
    
    if len(rows) < 11:
        return EbayUploadPreviewResponse(
            success=False,
            message="File appears to be too short. Expected eBay Listings & Sales Report format.",
            warnings=["File has fewer than 11 rows"]
        )
    
    # Parse date range from row 9 (index 8)
    report_start_date = None
    report_end_date = None
    
    for i in range(min(10, len(rows))):
        row_text = ','.join(rows[i])
        if 'Report for' in row_text:
            report_start_date, report_end_date = parse_report_date_range(row_text)
            break
    
    if not report_start_date:
        warnings.append("Could not parse report date range from file")
    
    # Find header row (should be row 10, index 9)
    header_row_index = None
    for i in range(min(15, len(rows))):
        if rows[i] and 'Listing title' in rows[i][0]:
            header_row_index = i
            break
    
    if header_row_index is None:
        return EbayUploadPreviewResponse(
            success=False,
            message="Could not find header row with 'Listing title'. Is this an eBay Listings & Sales Report?",
            warnings=["Header row not found"]
        )
    
    headers = rows[header_row_index]
    
    # Map column indices
    col_map = {h.strip(): i for i, h in enumerate(headers)}
    
    # Required columns
    required_cols = ['Listing title', 'eBay item ID', 'Quantity sold', 'Item sales', 'Net sales (Net of taxes and selling costs)']
    missing_cols = [c for c in required_cols if c not in col_map]
    
    if missing_cols:
        return EbayUploadPreviewResponse(
            success=False,
            message=f"Missing required columns: {', '.join(missing_cols)}",
            warnings=[f"Missing column: {c}" for c in missing_cols]
        )
    
    # Process data rows
    data_start = header_row_index + 1
    total_quantity = 0
    total_item_sales = Decimal("0")
    total_net_sales = Decimal("0")
    
    for row_num, row in enumerate(rows[data_start:], start=1):
        # Skip empty rows
        if not row or not row[0].strip():
            continue
        
        # Skip if the row looks like a header or disclaimer
        if 'Listing title' in row[0] or 'Disclaimers' in row[0]:
            continue
        
        try:
            # Helper to get column value safely
            def get_col(name: str, default: str = "") -> str:
                idx = col_map.get(name)
                if idx is not None and idx < len(row):
                    return row[idx]
                return default
            
            listing_title = get_col('Listing title').strip()
            if not listing_title:
                continue
            
            item_sales = parse_money(get_col('Item sales'))
            net_sales = parse_money(get_col('Net sales (Net of taxes and selling costs)'))
            quantity = parse_int(get_col('Quantity sold'))
            
            listing = EbayListingPreview(
                row_index=row_num,
                selected=True,
                
                listing_title=listing_title,
                ebay_item_id=parse_ebay_item_id(get_col('eBay item ID')),
                quantity_sold=quantity,
                
                item_sales=item_sales,
                total_selling_costs=parse_money(get_col('Total selling costs')),
                net_sales=net_sales,
                average_selling_price=parse_money(get_col('Average Selling price')),
                
                total_sales=parse_money(get_col('Total sales (Includes taxes)')),
                shipping_collected=parse_money(get_col('Shipping and handling paid by buyer to you')),
                taxes_to_seller=parse_money(get_col('Taxes and government fees paid by buyer to you')),
                taxes_to_ebay=parse_money(get_col('Taxes and government fees paid by buyer to eBay')),
                
                insertion_fees=parse_money(get_col('Insertion fees')),
                listing_upgrade_fees=parse_money(get_col('Optional listing upgrade fees')),
                final_value_fees=parse_money(get_col('Final value fees')),
                promoted_general_fees=parse_money(get_col('Promoted Listings - General fees')),
                promoted_priority_fees=parse_money(get_col('Promoted Listings - Priority fees')),
                ads_express_fees=parse_money(get_col('Ads Express fees')),
                promoted_offsite_fees=parse_money(get_col('Promoted Offsite - Fees')),
                international_fees=parse_money(get_col('International fees')),
                other_ebay_fees=parse_money(get_col('Other eBay fees')),
                deposit_processing_fees=parse_money(get_col('Deposit processing fees')),
                fee_credits=parse_money(get_col('Fee credits')),
                shipping_label_cost=parse_money(get_col('Shipping labels cost (Amount you paid to buy shipping labels on eBay)')),
                
                quantity_via_promoted=parse_int(get_col('Quantity sold via promoted listing')),
                quantity_via_best_offer=parse_int(get_col('Quantity sold via Best Offers')),
                quantity_via_seller_offer=parse_int(get_col('Quantity sold via Seller Initiated Offers')),
            )
            
            listings.append(listing)
            total_quantity += quantity
            total_item_sales += item_sales
            total_net_sales += net_sales
            
        except Exception as e:
            warnings.append(f"Row {row_num}: {str(e)}")
            continue
    
    if not listings:
        return EbayUploadPreviewResponse(
            success=False,
            message="No valid listings found in file",
            warnings=warnings
        )
    
    return EbayUploadPreviewResponse(
        success=True,
        message=f"Successfully parsed {len(listings)} listings",
        report_start_date=report_start_date,
        report_end_date=report_end_date,
        listings=listings,
        total_rows=len(listings),
        total_quantity=total_quantity,
        total_item_sales=total_item_sales,
        total_net_sales=total_net_sales,
        warnings=warnings
    )
