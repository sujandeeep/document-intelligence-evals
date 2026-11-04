from fpdf import FPDF
import prompts

pdf = FPDF()
pdf.add_page()
pdf.set_font("Arial", size=12)

pdf.cell(200, 10, txt="MathRouter - Complete System Prompts", ln=True, align='C')
pdf.ln(10)

pdf.set_font("Arial", size=10)
for line in prompts.SYSTEM_PROMPT.split('\n'):
    pdf.multi_cell(0, 10, txt=line.encode('latin-1', 'replace').decode('latin-1'))

pdf.ln(5)
pdf.set_font("Arial", 'B', 12)
pdf.cell(200, 10, txt="Critical Recency Instruction (Appended at the end of Context):", ln=True)
pdf.set_font("Arial", size=10)

for line in prompts.RECENCY_INSTRUCTION.split('\n'):
    pdf.multi_cell(0, 10, txt=line.encode('latin-1', 'replace').decode('latin-1'))

pdf.output("MathRouter_Prompts.pdf")
