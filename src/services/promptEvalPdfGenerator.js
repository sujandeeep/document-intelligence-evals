import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function callAutoTable(doc, options) {
  if (typeof doc.autoTable === 'function') {
    return doc.autoTable(options);
  }
  if (typeof autoTable === 'function') {
    return autoTable(doc, options);
  }
  if (autoTable && typeof autoTable.default === 'function') {
    return autoTable.default(doc, options);
  }
  throw new Error('autoTable plugin is not available on jsPDF');
}

function drawRoundRect(ctx, x, y, width, height, radius = 6) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Creates high-resolution comparison chart for the 10 System Prompts
 */
function createPromptComparisonChartImage(results, winner) {
  const width = 1100;
  const height = 520;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  ctx.fillStyle = '#0f172a'; // slate-900
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Chart Title
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('SYSTEM PROMPT BENCHMARK: PERFORMANCE VS MONEY ($)', 36, 42);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Sorted by Total Turn Cost (Ascending) • Dual Axis: Quality Score (%) vs Cost ($ USD)', 36, 64);

  // Plot dimensions
  const pL = 90;
  const pR = 90;
  const pT = 100;
  const pB = 120;
  const cW = width - pL - pR;
  const cH = height - pT - pB;

  const validResults = results.filter((r) => r.status === 'success');
  if (validResults.length === 0) return canvas.toDataURL('image/png');

  const maxScore = 100;
  const minScore = 0;
  const costs = validResults.map((r) => r.total_cost);
  const maxCost = Math.max(...costs) * 1.25 || 0.001;
  const minCost = 0;

  // Horizontal Grid Lines
  for (let i = 0; i <= 5; i++) {
    const y = pT + (cH / 5) * i;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pL, y);
    ctx.lineTo(pL + cW, y);
    ctx.stroke();

    // Left Y Axis: Score %
    const scoreVal = Math.round(maxScore - (maxScore / 5) * i);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'right';
    ctx.fillText(`${scoreVal}%`, pL - 12, y + 4);

    // Right Y Axis: Cost $
    const costVal = (maxCost - (maxCost / 5) * i).toFixed(5);
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'left';
    ctx.fillText(`$${costVal}`, pL + cW + 12, y + 4);
  }

  // Calculate coordinates
  const stepX = cW / Math.max(1, validResults.length - 1);
  const pts = validResults.map((p, idx) => {
    const x = pL + idx * stepX;
    const yScore = pT + cH - ((p.quality_score - minScore) / (maxScore - minScore)) * cH;
    const yCost = pT + cH - ((p.total_cost - minCost) / (maxCost - minCost)) * cH;
    return { p, x, yScore, yCost, idx };
  });

  // Draw Score Curve (Cyan)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x, pt.yScore);
    else ctx.lineTo(pt.x, pt.yScore);
  });
  ctx.stroke();

  // Draw Cost Curve (Amber)
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x, pt.yCost);
    else ctx.lineTo(pt.x, pt.yCost);
  });
  ctx.stroke();

  // Plot Points and Rotated Labels
  pts.forEach((pt) => {
    // Score dot
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(pt.x, pt.yScore, 6, 0, Math.PI * 2);
    ctx.fill();

    // Cost dot
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(pt.x, pt.yCost, 6, 0, Math.PI * 2);
    ctx.fill();

    // Bottom tick
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(pt.x, pT + cH);
    ctx.lineTo(pt.x, pT + cH + 8);
    ctx.stroke();

    // Rotated label at -38 degrees
    ctx.save();
    ctx.translate(pt.x, pT + cH + 16);
    ctx.rotate(-Math.PI / 4.7);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'right';
    const shortName = pt.p.name.length > 22 ? pt.p.name.substring(0, 20) + '..' : pt.p.name;
    ctx.fillText(`#${pt.idx + 1} ${shortName}`, 0, 0);

    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${pt.p.quality_score}% score`, 0, 13);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`$${pt.p.total_cost.toFixed(5)}`, 0, 25);

    ctx.restore();
  });

  // Sweet Spot / Winner Highlight
  const winnerId = winner?.id;
  const winnerPt = pts.find((pt) => pt.p.id === winnerId);
  if (winnerPt) {
    const midY = (winnerPt.yScore + winnerPt.yCost) / 2;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(winnerPt.x, winnerPt.yScore);
    ctx.lineTo(winnerPt.x, winnerPt.yCost);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(winnerPt.x, midY, 9, 0, Math.PI * 2);
    ctx.fill();

    // Winner Tag
    drawRoundRect(ctx, winnerPt.x - 70, midY - 32, 140, 24, 4);
    ctx.fillStyle = '#065f46';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#ecfdf5';
    ctx.textAlign = 'center';
    ctx.fillText('★ RECOMMENDED PROMPT', winnerPt.x, midY - 16);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Downloads the complete 10-System Prompt Evaluation PDF Report
 */
export async function downloadPromptEvaluationPDF(evalData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // PAGE 1: EXECUTIVE SUMMARY & DATA TABLES
  // Header Navy Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, 20, contentWidth, 72, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('10-SYSTEM PROMPT EVALUATION & COST REPORT', margin + 14, 44);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Evaluated At: ${evalData.evaluated_at || new Date().toISOString()}`, margin + 14, 58);

  const modelInfo = evalData.model_spec || {};
  doc.text(
    `Target Model: ${evalData.model_id}   •   Tier: ${modelInfo.tier || 'General'}   •   Input/Output: $${modelInfo.input_price || 0}/$${modelInfo.output_price || 0} per 1M`,
    margin + 14,
    70
  );
  doc.setTextColor(2, 132, 199);
  doc.setFont('helvetica', 'bold');
  doc.text('Senior AI Judge: GPT-6.1-Sol (Extra High Reasoning Depth / xhigh)', margin + 14, 82);

  let currentY = 96;

  // Prompt Query Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currentY, contentWidth, 36, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('EVALUATED TEST PROMPT / QUERY:', margin + 10, currentY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  const promptSnippet = (evalData.user_prompt || '').length > 120
    ? evalData.user_prompt.substring(0, 117) + '...'
    : evalData.user_prompt || 'Standard multi-aspect document evaluation';
  doc.text(promptSnippet, margin + 10, currentY + 26);

  currentY += 46;

  // Color Index Bar
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, currentY, contentWidth, 24, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('COLOR INDEX:', margin + 10, currentY + 15);

  // Cyan Legend
  doc.setFillColor(56, 189, 248);
  doc.circle(margin + 90, currentY + 12, 4, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(2, 132, 199);
  doc.text('Cyan: Quality Score (%)', margin + 98, currentY + 15);

  // Amber Legend
  doc.setFillColor(245, 158, 11);
  doc.circle(margin + 225, currentY + 12, 4, 'F');
  doc.setTextColor(180, 83, 9);
  doc.text('Amber: Turn Cost ($ USD)', margin + 233, currentY + 15);

  // Green Legend
  doc.setFillColor(16, 185, 129);
  doc.circle(margin + 365, currentY + 12, 4, 'F');
  doc.setTextColor(5, 150, 105);
  doc.text('Emerald Green: Recommended Winner Prompt', margin + 373, currentY + 15);

  currentY += 34;

  // Table Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('10-System Prompt Empirical Benchmark & Cost Table', margin, currentY);

  currentY += 8;

  // Table Data
  const sortedResults = [...(evalData.results || [])].sort((a, b) => {
    if (a.status !== 'success') return 1;
    if (b.status !== 'success') return -1;
    return a.total_cost - b.total_cost;
  });

  const tableRows = sortedResults.map((r, idx) => {
    const isWinner = evalData.winner?.id === r.id;
    return [
      `#${idx + 1}${isWinner ? ' ★' : ''}`,
      r.name,
      r.status === 'success' ? `${r.quality_score}%` : 'Error',
      r.status === 'success' ? `$${r.total_cost.toFixed(5)}` : '-',
      r.prompt_tokens?.toLocaleString() || '-',
      r.completion_tokens?.toLocaleString() || '-',
      r.latency ? `${r.latency}s` : '-',
      r.efficiency_ratio ? `${r.efficiency_ratio}` : '-',
    ];
  });

  callAutoTable(doc, {
    startY: currentY,
    head: [[
      'Rank',
      'Prompt Strategy Name',
      'Judge Score',
      'Turn Cost',
      'In Tokens',
      'Out Tokens',
      'Latency',
      'Efficiency',
    ]],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 38, halign: 'center' },
      1: { cellWidth: 150 },
      2: { cellWidth: 64, halign: 'center', textColor: [2, 132, 199], fontStyle: 'bold' },
      3: { cellWidth: 60, halign: 'right', textColor: [180, 83, 9], fontStyle: 'bold' },
      4: { cellWidth: 50, halign: 'right' },
      5: { cellWidth: 52, halign: 'right' },
      6: { cellWidth: 46, halign: 'right' },
      7: { cellWidth: 58, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  // Footer for Page 1
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Page 1 of 2 • Prompt Evaluation Suite', margin, pageHeight - 16);

  // PAGE 2: GRAPH & WINNER PROMPT ADVISORY
  doc.addPage();

  // Page 2 Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, 20, contentWidth, 38, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('PROMPT PERFORMANCE VS COST TRADE-OFF CURVE', margin + 14, 44);

  currentY = 70;

  // Render Canvas Chart Image
  const chartDataUrl = createPromptComparisonChartImage(sortedResults, evalData.winner);
  if (chartDataUrl) {
    const chartHeight = 240;
    doc.addImage(chartDataUrl, 'PNG', margin, currentY, contentWidth, chartHeight);
    currentY += chartHeight + 20;
  }

  // WINNER PROMPT ANNOUNCEMENT CARD
  const winner = evalData.winner;
  if (winner) {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.setLineWidth(1.5);
    doc.rect(margin, currentY, contentWidth, 100, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(6, 95, 70); // emerald-800
    doc.text(`★ RECOMMENDED PROMPT TO USE: ${winner.name.toUpperCase()}`, margin + 14, currentY + 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text(
      `Quality Score: ${winner.quality_score}%   •   Turn Cost: $${winner.total_cost.toFixed(5)}   •   Total Tokens: ${winner.total_tokens}   •   Latency: ${winner.latency}s`,
      margin + 14,
      currentY + 38
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('Decision Rationale & Value Analysis:', margin + 14, currentY + 54);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const justificationText =
      evalData.intersection_point?.rationale ||
      `${winner.name} achieved the optimal trade-off: delivering high response quality while minimizing token overhead and cost.`;

    const splitJustification = doc.splitTextToSize(justificationText, contentWidth - 28);
    doc.text(splitJustification, margin + 14, currentY + 66);

    // System Prompt Snippet
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(6, 95, 70);
    doc.text('System Prompt Excerpt:', margin + 14, currentY + 84);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const promptSnippetText = (winner.system_prompt || '').length > 180
      ? winner.system_prompt.substring(0, 177) + '...'
      : winner.system_prompt;
    doc.text(doc.splitTextToSize(`"${promptSnippetText}"`, contentWidth - 28), margin + 14, currentY + 94);

    currentY += 114;
  }

  // Best Output Preview Box
  if (winner && winner.answer) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, currentY, contentWidth, 120, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Generated Output Preview (${winner.name}):`, margin + 12, currentY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const splitAnswer = doc.splitTextToSize(winner.answer.trim().substring(0, 650) + '...', contentWidth - 24);
    doc.text(splitAnswer, margin + 12, currentY + 30);
  }

  // Footer for Page 2
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Page 2 of 2 • Prompt Evaluation Suite', margin, pageHeight - 16);

  // Trigger Save
  const safeModelName = evalData.model_id.replace(/[^a-z0-9]/g, '_');
  const filename = `prompt_eval_${safeModelName}_${Date.now()}.pdf`;
  doc.save(filename);
}
