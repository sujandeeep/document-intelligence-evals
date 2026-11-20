import os
import re
import json
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "RAG Benchmark: Evaluation Console vs. Cloud RAG-RAGFlow | Judge: GPT-6.2 Sol")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 744, letter[0] - 54, 744)

        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 36, footer_text)
        self.drawString(54, 36, "Confidential - Automated LLM-as-a-Judge Benchmark Report")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 48, letter[0] - 54, 48)
        self.restoreState()

def text_to_flowables(raw_text: str, normal_style, heading_style, bullet_style):
    """
    Parses raw answer/critique markdown into individual ReportLab Paragraph flowables.
    This guarantees that lengthy text breaks across pages seamlessly with ZERO LayoutErrors.
    """
    flowables = []
    if not raw_text:
        flowables.append(Paragraph("<i>No content provided.</i>", normal_style))
        return flowables

    lines = raw_text.strip().split("\n")
    for line in lines:
        line_str = line.strip()
        if not line_str:
            flowables.append(Spacer(1, 3))
            continue

        # Escape XML entities safely
        clean_line = line_str.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

        # Convert markdown bold and italic
        clean_line = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", clean_line)
        clean_line = re.sub(r"\*(.+?)\*", r"<i>\1</i>", clean_line)

        # Handle headings
        if line_str.startswith("### "):
            flowables.append(Spacer(1, 4))
            flowables.append(Paragraph(f"<b>{clean_line[4:].strip()}</b>", heading_style))
            flowables.append(Spacer(1, 2))
        elif line_str.startswith("## "):
            flowables.append(Spacer(1, 5))
            flowables.append(Paragraph(f"<b>{clean_line[3:].strip()}</b>", heading_style))
            flowables.append(Spacer(1, 2))
        elif line_str.startswith("# "):
            flowables.append(Spacer(1, 6))
            flowables.append(Paragraph(f"<b>{clean_line[2:].strip()}</b>", heading_style))
            flowables.append(Spacer(1, 2))
        elif line_str.startswith("- ") or line_str.startswith("* "):
            bullet_body = clean_line[2:].strip()
            flowables.append(Paragraph(f"&bull;&nbsp;&nbsp;{bullet_body}", bullet_style))
        elif re.match(r"^\d+\.\s", line_str):
            # Numbered list
            flowables.append(Paragraph(clean_line, bullet_style))
        else:
            flowables.append(Paragraph(clean_line, normal_style))

    return flowables

def build_pdf_report(results: list, output_filename: str = "rag_benchmark_comparison_100.pdf"):
    """
    Builds a publication-quality PDF report comparing:
    - System A: Evaluation Console (Local pgvector RAG)
    - System B: Cloud RAG - RAGFlow (Cloud Vector Store RAG)
    Judged by: GPT-6.2 Sol
    """
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#0f172a")
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#475569")
    )
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=14,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=3
    )
    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        leftIndent=12,
        textColor=colors.HexColor("#334155"),
        spaceAfter=2
    )
    heading_style = ParagraphStyle(
        'SubHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=4,
        spaceAfter=2
    )
    meta_bold = ParagraphStyle(
        'MetaBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0f172a")
    )
    meta_val = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569")
    )
    q_title = ParagraphStyle(
        'QTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#0f172a")
    )
    section_label_a = ParagraphStyle(
        'SectionLabelA',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#1d4ed8"),
        spaceBefore=6,
        spaceAfter=3
    )
    section_label_b = ParagraphStyle(
        'SectionLabelB',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#047857"),
        spaceBefore=6,
        spaceAfter=3
    )
    judge_label_style = ParagraphStyle(
        'JudgeLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#7c2d12"),
        spaceBefore=6,
        spaceAfter=3
    )

    story = []

    # 1. Header & Title Block
    story.append(Paragraph("RAG Benchmark & LLM Judge Report", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Head-to-Head Comparison: <b>Evaluation Console</b> vs. <b>Cloud RAG- RAGFlow</b>", subtitle_style))
    story.append(Paragraph("Evaluated across Ingested Library Knowledge Base | Judge: <b>GPT-6.2 Sol</b>", subtitle_style))
    story.append(Spacer(1, 14))

    # Calculate Aggregate Metrics
    total_q = len(results)
    sys_a_wins = sum(1 for r in results if r.get("winner") == "Evaluation Console")
    sys_b_wins = sum(1 for r in results if r.get("winner") == "Cloud RAG - RAGFlow")
    ties = sum(1 for r in results if r.get("winner") == "Tie")
    
    avg_score_a = round(sum(r.get("system_a_score", 0) for r in results) / max(total_q, 1), 2)
    avg_score_b = round(sum(r.get("system_b_score", 0) for r in results) / max(total_q, 1), 2)
    avg_lat_a = round(sum(r.get("system_a_latency_ms", 0) for r in results) / max(total_q, 1), 1)
    avg_lat_b = round(sum(r.get("system_b_latency_ms", 0) for r in results) / max(total_q, 1), 1)

    winrate_a = round((sys_a_wins / max(total_q, 1)) * 100, 1)
    winrate_b = round((sys_b_wins / max(total_q, 1)) * 100, 1)
    tie_rate = round((ties / max(total_q, 1)) * 100, 1)

    # 2. Executive Scorecard Table
    scorecard_data = [
        [
            Paragraph("<b>Total Questions</b>", meta_bold),
            Paragraph("<b>Evaluation Console Wins</b>", meta_bold),
            Paragraph("<b>Cloud RAG- RAGFlow Wins</b>", meta_bold),
            Paragraph("<b>Ties</b>", meta_bold)
        ],
        [
            Paragraph(f"<font size=15 color='#0f172a'><b>{total_q}</b></font>", body_style),
            Paragraph(f"<font size=15 color='#2563eb'><b>{sys_a_wins}</b> ({winrate_a}%)</font>", body_style),
            Paragraph(f"<font size=15 color='#059669'><b>{sys_b_wins}</b> ({winrate_b}%)</font>", body_style),
            Paragraph(f"<font size=15 color='#d97706'><b>{ties}</b> ({tie_rate}%)</font>", body_style)
        ],
        [
            Paragraph("<b>Average Score (1-10)</b>", meta_bold),
            Paragraph(f"<b>{avg_score_a} / 10</b>", meta_val),
            Paragraph(f"<b>{avg_score_b} / 10</b>", meta_val),
            Paragraph("Delta: " + (f"+{round(avg_score_b - avg_score_a, 2)}" if avg_score_b >= avg_score_a else f"-{round(avg_score_a - avg_score_b, 2)}"), meta_val)
        ],
        [
            Paragraph("<b>Average Latency</b>", meta_bold),
            Paragraph(f"{avg_lat_a} ms", meta_val),
            Paragraph(f"{avg_lat_b} ms", meta_val),
            Paragraph("Roundtrip query time", meta_val)
        ]
    ]

    sc_table = Table(scorecard_data, colWidths=[120, 130, 135, 119])
    sc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(sc_table)
    story.append(Spacer(1, 14))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#94a3b8"), spaceBefore=8, spaceAfter=14))
    story.append(Paragraph("Detailed 100-Question Comparative Evaluations", h2_style))
    story.append(Paragraph("Individual evaluations presenting the response from <b>Evaluation Console</b>, the response from <b>Cloud RAG- RAGFlow</b>, and the official assessment from <b>GPT-6.2 Sol</b> with the declared winner.", subtitle_style))
    story.append(Spacer(1, 12))

    # 4. Question Cards (Using safe, flowable structure)
    for idx, r in enumerate(results, 1):
        winner = r.get("winner", "Tie")
        score_a = r.get("system_a_score", "-")
        score_b = r.get("system_b_score", "-")
        
        # Color coding for Winner Banner
        if winner == "Evaluation Console":
            win_bg = "#dbeafe"
            win_border = "#2563eb"
            win_badge = f"<font color='#1d4ed8'><b>WINNER: Evaluation Console</b></font> (Score: {score_a}/10 vs {score_b}/10)"
        elif winner == "Cloud RAG - RAGFlow":
            win_bg = "#d1fae5"
            win_border = "#059669"
            win_badge = f"<font color='#047857'><b>WINNER: Cloud RAG - RAGFlow</b></font> (Score: {score_b}/10 vs {score_a}/10)"
        else:
            win_bg = "#fef3c7"
            win_border = "#d97706"
            win_badge = f"<font color='#b45309'><b>VERDICT: TIE</b></font> (Score: {score_a}/10 vs {score_b}/10)"

        header_p = Paragraph(f"<b>Question #{r.get('id', idx)}: {r.get('book', '')}</b> &nbsp;|&nbsp; <i>{r.get('category', '')}</i>", q_title)
        query_p = Paragraph(f"<b>Query:</b> {r.get('query', '')}", body_style)
        badge_p = Paragraph(win_badge, meta_bold)

        # Header box (compact, guaranteed to fit)
        header_table = Table([[header_p], [query_p], [badge_p]], colWidths=[504])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(win_bg)),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(win_border)),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 4))

        # System A Answer Section
        story.append(Paragraph(f"<b>[System A] Evaluation Console Answer</b> <font color='#64748b' size=8>({r.get('system_a_latency_ms', 0)} ms | Score: {score_a}/10)</font>", section_label_a))
        ans_a_flowables = text_to_flowables(r.get("system_a_answer", ""), body_style, heading_style, bullet_style)
        for f in ans_a_flowables:
            story.append(f)
        story.append(Spacer(1, 4))

        # System B Answer Section
        story.append(Paragraph(f"<b>[System B] Cloud RAG- RAGFlow Answer</b> <font color='#64748b' size=8>({r.get('system_b_latency_ms', 0)} ms | Score: {score_b}/10)</font>", section_label_b))
        ans_b_flowables = text_to_flowables(r.get("system_b_answer", ""), body_style, heading_style, bullet_style)
        for f in ans_b_flowables:
            story.append(f)
        story.append(Spacer(1, 4))

        # Judge GPT-6.2 Sol Analysis Section
        story.append(Paragraph(f"<b>GPT-6.2 Sol Judge Verdict & Critique:</b>", judge_label_style))
        judge_flowables = text_to_flowables(r.get("reasoning", ""), body_style, heading_style, bullet_style)
        for f in judge_flowables:
            story.append(f)

        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceBefore=4, spaceAfter=12))

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF report: {output_filename}")
    return output_filename

if __name__ == "__main__":
    import sys
    results_path = "benchmark_100_results.json"
    if os.path.exists(results_path):
        with open(results_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"Building PDF from {len(data)} results in {results_path}...")
        build_pdf_report(data, "rag_benchmark_comparison_100.pdf")
    else:
        print("benchmark_100_results.json not found.")
