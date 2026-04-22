"""
PDF generation for eBay consignment agreements and monthly payout statements.

Uses reportlab's high-level Platypus API so the layout stays clean and easy to
edit (no manual canvas drawing).

Two entry points:
    * build_agreement_pdf(agreement, consigner) -> bytes
    * build_payout_statement_pdf(payout, consigner, items) -> bytes
"""

from __future__ import annotations

from decimal import Decimal
from io import BytesIO
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)


# ------------------------------------------------------------------
# Brand config - tweak when ready.  Kept here so we don't scatter
# company details through the code.
# ------------------------------------------------------------------
IDGAS_COMPANY_NAME = "IDGAS LLC"
IDGAS_ADDRESS = ""
IDGAS_EMAIL = ""


def _money(value) -> str:
    if value is None:
        return "$0.00"
    return f"${Decimal(value):,.2f}"


def _styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "Title", parent=base["Title"], fontSize=18, alignment=TA_CENTER,
            textColor=colors.HexColor("#0f172a"), spaceAfter=12,
        ),
        "h2": ParagraphStyle(
            "H2", parent=base["Heading2"], fontSize=12, textColor=colors.HexColor("#0f172a"),
            spaceBefore=12, spaceAfter=6,
        ),
        "body": ParagraphStyle("Body", parent=base["BodyText"], fontSize=10, leading=14),
        "small": ParagraphStyle("Small", parent=base["BodyText"], fontSize=8, leading=11,
                                textColor=colors.HexColor("#475569")),
        "meta": ParagraphStyle("Meta", parent=base["BodyText"], fontSize=9, leading=12,
                               textColor=colors.HexColor("#334155")),
        "right": ParagraphStyle("Right", parent=base["BodyText"], fontSize=10, alignment=2),
    }
    return styles


# ==================================================================
# AGREEMENT PDF
# ==================================================================

AGREEMENT_TERMS = """
<b>Consignment Agreement Terms</b><br/><br/>

1. <b>Appointment.</b> Consigner appoints IDGAS as non-exclusive agent to list and
sell the items described in Schedule A on eBay.<br/><br/>

2. <b>Minimum Price.</b> IDGAS will not sell any item for less than its listed
Minimum Accepted Price without written consent of the Consigner.<br/><br/>

3. <b>Commission.</b> IDGAS shall retain a fee equal to <b>{fee_percent}%</b> of the final
sale price of each item. Pass-through costs (eBay fees, payment-processor fees,
shipping) may be deducted from gross proceeds prior to calculating the
Consigner's payout.<br/><br/>

4. <b>Payout.</b> IDGAS will provide the Consigner with a monthly statement
itemizing items sold during the preceding calendar month and will remit the
net payout by the payment method on file.<br/><br/>

5. <b>Unsold Items.</b> Items that remain unsold after a commercially reasonable
period may, at IDGAS's option, be returned to the Consigner or re-listed at
the same Minimum Accepted Price.<br/><br/>

6. <b>Risk of Loss.</b> Risk of loss transfers to IDGAS upon physical delivery
of the items and returns to the Consigner upon return shipment.<br/><br/>

7. <b>Authenticity.</b> Consigner represents that Consigner is the lawful owner of
each item and that each item is authentic.<br/><br/>

8. <b>Term.</b> This agreement becomes effective on the Agreement Date and
remains in force until all listed items are sold, returned, or withdrawn.
"""


def build_agreement_pdf(agreement, consigner) -> bytes:
    """Render a consignment agreement to a PDF byte string."""
    styles = _styles()
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        title=f"Consignment Agreement {agreement.agreement_number or ''}".strip(),
    )
    story = []

    # --- Header ---
    story.append(Paragraph("eBay Consignment Agreement", styles["title"]))

    meta_rows = [
        ["Agreement #", agreement.agreement_number or "(pending)"],
        ["Agreement Date", agreement.agreement_date.strftime("%B %d, %Y") if agreement.agreement_date else ""],
        ["Commission Rate", f"{Decimal(agreement.fee_percent):.2f}%"],
        ["Status", (agreement.status or "draft").title()],
    ]
    meta_tbl = Table(meta_rows, colWidths=[1.4 * inch, 4.5 * inch])
    meta_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#334155")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 12))

    # --- Parties ---
    story.append(Paragraph("Parties", styles["h2"]))
    parties_data = [
        [
            Paragraph("<b>IDGAS</b><br/>"
                      f"{IDGAS_COMPANY_NAME}<br/>"
                      f"{IDGAS_ADDRESS}<br/>"
                      f"{IDGAS_EMAIL}", styles["body"]),
            Paragraph("<b>Consigner</b><br/>"
                      f"{consigner.name or ''}<br/>"
                      f"{(consigner.formatted_address or '').replace(chr(10), '<br/>')}<br/>"
                      f"{consigner.email or ''}<br/>"
                      f"{consigner.phone or ''}", styles["body"]),
        ]
    ]
    parties = Table(parties_data, colWidths=[3.35 * inch, 3.35 * inch])
    parties.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(parties)
    story.append(Spacer(1, 12))

    # --- Terms ---
    story.append(Paragraph(AGREEMENT_TERMS.format(
        fee_percent=f"{Decimal(agreement.fee_percent):.2f}"
    ), styles["body"]))
    story.append(Spacer(1, 12))

    # --- Schedule A: Items ---
    story.append(Paragraph("Schedule A &mdash; Consigned Items", styles["h2"]))
    if agreement.items:
        header = ["#", "Item", "Condition", "Min Price"]
        rows = [header]
        for i, it in enumerate(agreement.items, start=1):
            title_block = it.title or ""
            if it.description:
                title_block += f"<br/><font size=8 color='#64748b'>{it.description}</font>"
            rows.append([
                str(i),
                Paragraph(title_block, styles["body"]),
                it.condition or "",
                _money(it.minimum_price),
            ])
        items_tbl = Table(rows, colWidths=[0.3 * inch, 4.2 * inch, 1.1 * inch, 1.1 * inch], repeatRows=1)
        items_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("ALIGN", (3, 1), (3, -1), "RIGHT"),
            ("ALIGN", (0, 1), (0, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(items_tbl)
    else:
        story.append(Paragraph("<i>No items listed.</i>", styles["body"]))

    story.append(Spacer(1, 24))

    # --- Signatures ---
    story.append(Paragraph("Signatures", styles["h2"]))
    sig_data = [
        ["Consigner", "IDGAS Representative"],
        [_sig_cell(agreement.client_signature_name, agreement.client_signed_at),
         _sig_cell(agreement.idgas_signature_name, agreement.idgas_signed_at)],
    ]
    sig_tbl = Table(sig_data, colWidths=[3.35 * inch, 3.35 * inch], rowHeights=[0.25 * inch, 0.85 * inch])
    sig_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#94a3b8")),
        ("BOX", (0, 1), (-1, 1), 0.5, colors.HexColor("#cbd5e1")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(sig_tbl)

    doc.build(story)
    return buf.getvalue()


def _sig_cell(signature_name, signed_at):
    if signature_name:
        ts = signed_at.strftime("%B %d, %Y") if signed_at else ""
        return Paragraph(
            f"<i>Signed electronically by</i><br/><b>{signature_name}</b><br/>"
            f"<font size=8 color='#64748b'>{ts}</font>",
            getSampleStyleSheet()["BodyText"],
        )
    return Paragraph("<font color='#94a3b8'>Sign here: ______________________________</font>",
                     getSampleStyleSheet()["BodyText"])


# ==================================================================
# MONTHLY STATEMENT PDF
# ==================================================================

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def build_payout_statement_pdf(payout, consigner, items: Iterable) -> bytes:
    """Render a monthly payout statement to a PDF byte string."""
    styles = _styles()
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        title=f"Consignment Statement - {consigner.name} - {MONTH_NAMES[payout.period_month]} {payout.period_year}",
    )
    story = []

    story.append(Paragraph("Monthly Consignment Statement", styles["title"]))
    story.append(Paragraph(
        f"<b>{consigner.name}</b> &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"{MONTH_NAMES[payout.period_month]} {payout.period_year}",
        styles["meta"],
    ))
    story.append(Spacer(1, 12))

    # --- Summary card ---
    summary_rows = [
        ["Items Sold", str(payout.item_count)],
        ["Gross Sales", _money(payout.total_gross)],
        ["Less eBay Fees", f"({_money(payout.total_ebay_fees)})"],
        ["Less Other Fees (shipping, payment)", f"({_money(payout.total_other_fees)})"],
        [f"Less IDGAS Commission", f"({_money(payout.total_idgas_fee)})"],
        ["Net Payout", _money(payout.net_payout)],
    ]
    summary = Table(summary_rows, colWidths=[4.5 * inch, 1.7 * inch])
    summary.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -2), "Helvetica"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.HexColor("#0f172a")),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#f1f5f9")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(summary)
    story.append(Spacer(1, 16))

    # --- Item detail ---
    story.append(Paragraph("Items Sold", styles["h2"]))
    header = ["Sold", "Item", "Gross", "eBay Fees", "Other", "Commission", "Net"]
    rows = [header]
    for it in items:
        sold_date = it.sold_at.strftime("%m/%d") if it.sold_at else ""
        gross = Decimal(it.sold_price or 0)
        ebay_fee = Decimal(it.ebay_fees or 0)
        other = Decimal(it.payment_fees or 0) + Decimal(it.shipping_cost or 0)
        net_before_commission = gross - ebay_fee - other
        commission = (gross * _get_fee_pct(it, payout)) / Decimal(100)
        net = net_before_commission - commission
        rows.append([
            sold_date,
            Paragraph(it.title or "", styles["body"]),
            _money(gross),
            _money(ebay_fee),
            _money(other),
            _money(commission),
            _money(net),
        ])

    items_tbl = Table(rows, colWidths=[0.55 * inch, 2.6 * inch, 0.75 * inch,
                                       0.75 * inch, 0.65 * inch, 0.85 * inch, 0.75 * inch],
                       repeatRows=1)
    items_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 1), (0, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(items_tbl)

    story.append(Spacer(1, 18))
    pay_method = consigner.payment_method or "on file"
    story.append(Paragraph(
        f"<b>Net payout of {_money(payout.net_payout)}</b> will be remitted via {pay_method}.",
        styles["body"],
    ))
    if payout.is_paid and payout.paid_at:
        ref = f" (ref: {payout.paid_reference})" if payout.paid_reference else ""
        story.append(Paragraph(
            f"<font color='#15803d'><b>PAID</b> on {payout.paid_at.strftime('%B %d, %Y')}{ref}</font>",
            styles["body"],
        ))

    story.append(Spacer(1, 24))
    story.append(Paragraph(
        "Questions about this statement? Reply to the email this was sent from "
        "and we'll sort it out.",
        styles["small"],
    ))

    doc.build(story)
    return buf.getvalue()


def _get_fee_pct(item, payout) -> Decimal:
    """Fee percent for an item in a payout - falls back to the agreement's rate."""
    pct = getattr(item, "_fee_percent_snapshot", None)
    if pct is not None:
        return Decimal(pct)
    agr = getattr(item, "agreement", None)
    if agr is not None and agr.fee_percent is not None:
        return Decimal(agr.fee_percent)
    return Decimal(0)
