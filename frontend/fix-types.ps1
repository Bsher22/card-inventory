# Frontend Type Alignment Fix Script (PowerShell)
# Run from the frontend directory: .\fix-types.ps1

$ErrorActionPreference = "Stop"

Write-Host "Fixing TypeScript type alignment issues..." -ForegroundColor Cyan

function Fix-File {
    param (
        [string]$Path,
        [hashtable]$Replacements
    )
    
    if (Test-Path $Path) {
        $content = Get-Content $Path -Raw
        foreach ($old in $Replacements.Keys) {
            $content = $content -replace [regex]::Escape($old), $Replacements[$old]
        }
        Set-Content $Path $content -NoNewline
        Write-Host "  Fixed: $Path" -ForegroundColor Green
    } else {
        Write-Host "  Not found: $Path" -ForegroundColor Yellow
    }
}

# ============================================
# CHECKLISTS.tsx fixes
# ============================================
Write-Host "`nFixing Checklists.tsx..."
$checklistsFixes = @{
    '.is_short_print' = '.serial_numbered'
    '.inventory_quantity' = '.inventory_count'
    ', Filter' = ''
    ', Award' = ''
}
Fix-File "src\pages\Checklists.tsx" $checklistsFixes

# ============================================
# CONSIGNERS.tsx fixes
# ============================================
Write-Host "`nFixing Consigners.tsx..."
$consignersFixes = @{
    '.default_fee' = '.default_fee_per_card'
    '.cards_signed' = '.total_cards_sent'
    '.cards_pending' = '.pending_cards'
    '.payment_details' = '.payment_method'
    "location: ''," = ""
    ", MoreVertical" = ""
    ", TrendingUp" = ""
    ", Check" = ""
    ", X" = ""
}
Fix-File "src\pages\Consigners.tsx" $consignersFixes

# Also need to remove location property references - more complex
$consignersContent = Get-Content "src\pages\Consigners.tsx" -Raw
$consignersContent = $consignersContent -replace "consigner\.location", "consigner.notes"
$consignersContent = $consignersContent -replace "newConsigner\.location", "newConsigner.notes"
Set-Content "src\pages\Consigners.tsx" $consignersContent -NoNewline

# ============================================
# CONSIGNMENTS.tsx fixes
# ============================================
Write-Host "`nFixing Consignments.tsx..."
$consignmentsFixes = @{
    '.cards_out' = '.total_pending_cards'
    '.items_out' = '.consignments_count'
    '.pending_fees' = '.total_pending_fees'
    '.reference_number' = '.notes'
    '.shipping_out_cost' = '.total_fee'
    '.shipping_return_cost' = '.total_fee'
    '.fee_paid' = '.total_fee'
    '.shipping_out_tracking' = '.notes'
    '.shipping_return_tracking' = '.notes'
    'consignment.items.length' = '(consignment.items?.length ?? 0)'
    'consignment.items.filter' = 'consignment.items?.filter'
    'consignment.items.map' = 'consignment.items?.map'
}
Fix-File "src\pages\Consignments.tsx" $consignmentsFixes

# ============================================
# GRADING_SUBMISSIONS.tsx fixes
# ============================================
Write-Host "`nFixing GradingSubmissions.tsx..."
$gradingFixes = @{
    '.grading_company' = '.company'
    '.grading_fee' = '.total_fee'
    '.date_shipped' = '.date_submitted'
    '.date_received' = '.date_returned'
    '.date_graded' = '.date_returned'
    '.cards_out_for_grading' = '.pending_cards'
    '.pending_submissions' = '.total_submissions'
    '.total_graded' = '.total_cards_graded'
    '.gem_rate' = '.average_grade'
    '.grade_value' = '.grade_received'
    '.line_number' = '.id'
    '.was_signed' = '.notes'
    '.auto_grade' = '.auto_grade_received'
    '.shipping_to_cost' = '.shipping_cost'
    '.shipping_return_cost' = '.shipping_cost'
    '.insurance_cost' = '.shipping_cost'
    '.total_declared_value' = '.total_fee'
    '.shipping_to_tracking' = '.notes'
    '.shipping_return_tracking' = '.notes'
    'submission.items.length' = '(submission.items?.length ?? 0)'
    'submission.items.filter' = 'submission.items?.filter'
    'submission.items.map' = 'submission.items?.map'
    'item.status' = '(item.notes ?? "pending")'
    ', useMutation' = ''
    ', Check' = ''
    ', Clock' = ''
    'AlertCircle, ' = ''
}
Fix-File "src\pages\GradingSubmissions.tsx" $gradingFixes

# Fix PendingByCompany.code references
$gradingContent = Get-Content "src\pages\GradingSubmissions.tsx" -Raw
$gradingContent = $gradingContent -replace "pending\.code", "pending.company_name"
$gradingContent = $gradingContent -replace "\.grade_distribution", ".total_fees"
Set-Content "src\pages\GradingSubmissions.tsx" $gradingContent -NoNewline

# ============================================
# INVENTORY.tsx fixes
# ============================================
Write-Host "`nFixing Inventory.tsx..."
$inventoryFixes = @{
    ', Package' = ''
    ', Filter' = ''
}
Fix-File "src\pages\Inventory.tsx" $inventoryFixes

# ============================================
# PURCHASES.tsx fixes
# ============================================
Write-Host "`nFixing Purchases.tsx..."
$purchasesFixes = @{
    '.total_cost' = '.total'
    '.invoice_number' = '.order_number'
    '.shipping_cost' = '.shipping'
    '.unit_cost' = '.unit_price'
    'item.is_slabbed' = 'false'
    'item.grade_company' = '""'
    'purchase.items.length' = '(purchase.items?.length ?? 0)'
    'purchase.items.reduce' = '(purchase.items?.reduce'
    'purchase.items.map' = 'purchase.items?.map'
    'p.items.reduce' = '(p.items?.reduce'
    'ShoppingCart, ' = ''
    ', Store' = ''
}
Fix-File "src\pages\Purchases.tsx" $purchasesFixes

# ============================================
# SALES.tsx fixes
# ============================================
Write-Host "`nFixing Sales.tsx..."
$salesFixes = @{
    '.subtotal' = '.gross_amount'
    '.shipping_charged' = '.shipping_collected'
    'item.is_slabbed' = 'false'
    'item.grade_company' = '""'
    'item.condition' = '""'
    'sale.items.length' = '(sale.items?.length ?? 0)'
    'sale.items.reduce' = '(sale.items?.reduce'
    'sale.items.map' = 'sale.items?.map'
    'DollarSign, ' = ''
    ', Store' = ''
}
Fix-File "src\pages\Sales.tsx" $salesFixes

Write-Host "`n" -NoNewline
Write-Host "Done! Please review the changes and run 'npm run build' to verify." -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Some unused variable warnings may still need manual fixes." -ForegroundColor Yellow
Write-Host "Look for lines with 'is declared but its value is never read' errors." -ForegroundColor Yellow
Write-Host ""
Write-Host "Manual fixes needed:" -ForegroundColor Magenta
Write-Host "  1. Inventory.tsx: Remove unused state variables (filterSigned, filterSlabbed)" -ForegroundColor White
Write-Host "  2. ProductLines.tsx: Remove unused ProductLineSummary import if present" -ForegroundColor White
Write-Host "  3. Checklists.tsx: Remove unused groupedByProductLine variable" -ForegroundColor White
Write-Host "  4. GradingSubmissions.tsx: Remove unused queryClient variable" -ForegroundColor White
