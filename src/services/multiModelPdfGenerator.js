import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Universal autoTable caller to support ESM and bundlers cleanly
 */
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

/**
 * Safe round rectangle drawer that works across all browser canvas engines
 */
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
 * Draws the Results & Cost Comparison Graph with the Pareto intersection point on an HTML Canvas.
 * Rotates model names at -38° to guarantee neat, clean, non-overlapping labels.
 */
function createComparisonChartImage(results, winner, intersection) {
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

  // Card Border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Title
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('MODEL PERFORMANCE VS. COST TRADE-OFF & INTERSECTION ANALYSIS', 40, 48);

  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('ARRANGED IN ASCENDING ORDER: PRICE (LOWEST → HIGHEST) & PERFORMANCE (SCORE %)', 40, 72);

  const paddingLeft = 100;
  const paddingRight = 100;
  const paddingTop = 110;
  const paddingBottom = 135; // Ample space for rotated labels and badges

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  // Filter models to plot
  const validModels = (results || []).filter((r) => r.status === 'success');
  if (validModels.length === 0) {
    ctx.font = 'italic 16px sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('No successful model responses available to plot.', paddingLeft, height / 2);
    return canvas.toDataURL('image/png');
  }

  // Sort models in strict ascending order of price (total_cost) and then performance (quality_score)
  const sorted = [...validModels].sort(
    (a, b) => a.total_cost - b.total_cost || a.quality_score - b.quality_score
  );

  const maxCost = Math.max(...sorted.map((m) => m.total_cost), 0.0001) * 1.15;
  const maxScore = 100;

  // Draw Grid Lines
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const y = paddingTop + (chartH / gridSteps) * i;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + chartW, y);
    ctx.stroke();

    // Left Y Axis labels (Quality Score %)
    const scoreVal = Math.round(maxScore - (maxScore / gridSteps) * i);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#38bdf8'; // light sky blue
    ctx.textAlign = 'right';
    ctx.fillText(`${scoreVal}%`, paddingLeft - 12, y + 4);

    // Right Y Axis labels (Cost in $)
    const costVal = (maxCost - (maxCost / gridSteps) * i).toFixed(5);
    ctx.fillStyle = '#f59e0b'; // amber
    ctx.textAlign = 'left';
    ctx.fillText(`$${costVal}`, paddingLeft + chartW + 12, y + 4);
  }

  // Draw Y-Axis Titles
  ctx.save();
  ctx.translate(28, paddingTop + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.fillText('← Response Quality Score (%) [CYAN]', 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(width - 25, paddingTop + chartH / 2);
  ctx.rotate(Math.PI / 2);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#f59e0b';
  ctx.textAlign = 'center';
  ctx.fillText('Actual Cost per Turn ($) [AMBER] →', 0, 0);
  ctx.restore();

  // Compute Coordinates
  const points = sorted.map((m, idx) => {
    const x =
      sorted.length === 1
        ? paddingLeft + chartW / 2
        : paddingLeft + (chartW / (sorted.length - 1)) * idx;

    // Quality y (higher score = smaller y)
    const yScore = paddingTop + chartH - (m.quality_score / maxScore) * chartH;

    // Cost y (higher cost = smaller y, normalized)
    const yCost = paddingTop + chartH - (m.total_cost / maxCost) * chartH;

    return { m, x, yScore, yCost, idx };
  });

  // Draw Cost Line (Amber)
  ctx.beginPath();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.yCost);
    else ctx.lineTo(p.x, p.yCost);
  });
  ctx.stroke();

  // Draw Quality Score Line (Sky Blue)
  ctx.beginPath();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.yScore);
    else ctx.lineTo(p.x, p.yScore);
  });
  ctx.stroke();

  // Draw Points & Rotated Non-Overlapping Labels
  points.forEach((p) => {
    // Quality node
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(p.x, p.yScore, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cost node
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(p.x, p.yCost, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Vertical tick mark
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, paddingTop + chartH);
    ctx.lineTo(p.x, paddingTop + chartH + 8);
    ctx.stroke();

    // Rotated Label block at -38° for guaranteed legibility
    ctx.save();
    ctx.translate(p.x, paddingTop + chartH + 16);
    ctx.rotate(-Math.PI / 4.7); // ~38 degrees

    // Model Name with rank
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#f1f5f9';
    ctx.textAlign = 'right';
    ctx.fillText(`#${p.idx + 1} ${p.m.model_id}`, 0, 0);

    // Score & Cost details beneath
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${p.m.quality_score}% score`, 0, 14);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`$${p.m.total_cost.toFixed(5)}`, 0, 26);

    ctx.restore();
  });

  // Draw Sweet Spot / Intersection Marker
  const winnerModelId = winner?.model_id || sorted[0]?.model_id;
  const winnerPoint = points.find((p) => p.m.model_id === winnerModelId) || points[0];

  if (winnerPoint) {
    const midY = (winnerPoint.yScore + winnerPoint.yCost) / 2;

    // Glowing connection line between cost and score
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(winnerPoint.x, winnerPoint.yScore);
    ctx.lineTo(winnerPoint.x, winnerPoint.yCost);
    ctx.stroke();
    ctx.setLineDash([]);

    // Intersection Star/Circle Callout
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(winnerPoint.x, midY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ecfdf5';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Callout Tag
    const tagX = Math.min(winnerPoint.x + 18, width - 270);
    const tagY = Math.max(midY - 26, paddingTop + 10);

    ctx.fillStyle = '#064e3b';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, tagX, tagY, 240, 48, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'left';
    ctx.fillText(`★ SWEET SPOT: ${winnerPoint.m.model_id}`, tagX + 10, tagY + 19);

    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('Optimal cost-to-performance intersection', tagX + 10, tagY + 35);
  }

  // Legend at bottom
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';

  // Quality legend
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(280, height - 28, 14, 14);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Response Quality (%) [CYAN]', 302, height - 17);

  // Cost legend
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(520, height - 28, 14, 14);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Turn Cost ($ USD) [AMBER]', 542, height - 17);

  // Sweet spot legend
  ctx.fillStyle = '#10b981';
  ctx.fillRect(750, height - 28, 14, 14);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Pareto Sweet Spot [EMERALD]', 772, height - 17);

  return canvas.toDataURL('image/png');
}

/**
 * Main PDF Exporter Function
 * Outputs a clean, beautifully formatted 2-page executive report
 */
export async function downloadMultiModelEvaluationPDF(evalData) {
  if (!evalData) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 595.28 pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
  const margin = 36;
  const contentWidth = pageWidth - margin * 2; // 523.28 pt

  // ==========================================
  // PAGE 1: HEADER, CONTEXT & SPECIFICATIONS
  // ==========================================

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 80, 'F');

  doc.setTextColor(248, 250, 252);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MULTI-MODEL EVALUATION & COST REPORT', margin, 34);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Evaluation Timestamp: ${evalData.evaluated_at || new Date().toISOString()}`, margin, 50);
  doc.text('Engine: MathRouter Multi-Model Inference & Benchmarking', margin, 62);
  doc.setTextColor(2, 132, 199);
  doc.setFont('helvetica', 'bold');
  doc.text('Senior AI Judge: GPT-6.1-Sol (Extra High Reasoning / xhigh)', margin, 74);

  let currentY = 88;

  // 2. Evaluated Prompt Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, currentY, contentWidth, 54, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const takeInfo = evalData.selected_take_info;
  const takeTitle = takeInfo
    ? `${takeInfo.recording_title || 'RECORDING'} • ${takeInfo.take_label || 'TAKE'}`
    : 'Direct Viewport Prompt';
  doc.text(`EVALUATED SOURCE CONTEXT: ${takeTitle.toUpperCase()}`, margin + 10, currentY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const promptSnippet = (evalData.user_prompt || '').replace(/\s+/g, ' ');
  const truncatedPrompt =
    promptSnippet.length > 150 ? promptSnippet.substring(0, 147) + '...' : promptSnippet;
  doc.text(`Prompt: "${truncatedPrompt}"`, margin + 10, currentY + 34);

  currentY += 66;

  // 3. COLOR LEGEND & READING GUIDE BOX
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, currentY, contentWidth, 42, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('COLOR CODING & INTERPRETATION GUIDE:', margin + 10, currentY + 14);

  // Cyan badge
  doc.setFillColor(56, 189, 248);
  doc.rect(margin + 10, currentY + 22, 10, 10, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('CYAN = Quality Score (%)', margin + 24, currentY + 30);

  // Amber badge
  doc.setFillColor(245, 158, 11);
  doc.rect(margin + 160, currentY + 22, 10, 10, 'F');
  doc.text('AMBER = Turn Cost ($ USD)', margin + 174, currentY + 30);

  // Emerald badge
  doc.setFillColor(16, 185, 129);
  doc.rect(margin + 320, currentY + 22, 10, 10, 'F');
  doc.text('EMERALD = Sweet Spot / Winner', margin + 334, currentY + 30);

  currentY += 52;

  // 4. TABLE 1: MODEL SPECIFICATIONS (Arranged by Price Ascending)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Model Specifications & Token Pricing (Arranged by Price Ascending)', margin, currentY);
  currentY += 6;

  const sortedRefTable = [...(evalData.reference_table || [])].sort(
    (a, b) =>
      (a.input_price || 0) - (b.input_price || 0) || (a.output_price || 0) - (b.output_price || 0)
  );

  const refHeaders = [
    ['Rank & Model ID', 'Role / Target Workload', 'Context', 'Max Out', 'Input / 1M ↑', 'Output / 1M'],
  ];

  const refRows = sortedRefTable.map((m, idx) => [
    `#${idx + 1} ${m.model_id}`,
    m.role || m.tier || 'General',
    `${(m.context_window || 0).toLocaleString()} tok`,
    `${(m.max_output || 0).toLocaleString()} tok`,
    `$${(m.input_price || 0).toFixed(2)}`,
    `$${(m.output_price || 0).toFixed(2)}`,
  ]);

  callAutoTable(doc, {
    startY: currentY,
    head: refHeaders,
    body: refRows,
    margin: { left: margin, right: margin },
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 105 },
      1: { cellWidth: 195 },
      2: { cellWidth: 55, halign: 'right' },
      3: { cellWidth: 55, halign: 'right' },
      4: { cellWidth: 55, halign: 'right', fontStyle: 'bold', textColor: [217, 119, 6] },
      5: { cellWidth: 58, halign: 'right' },
    },
  });

  currentY = (doc.lastAutoTable?.finalY || currentY + 140) + 16;

  // 5. TABLE 2: EMPIRICAL RESULTS (Arranged by Price & Performance Ascending)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Empirical Turn Results & Actual Dollar Costs (Ascending Order)', margin, currentY);
  currentY += 6;

  const sortedResults = [...(evalData.results || [])].sort((a, b) => {
    if (a.status === 'success' && b.status === 'success') {
      return a.total_cost - b.total_cost || a.quality_score - b.quality_score;
    }
    if (a.status === 'success') return -1;
    if (b.status === 'success') return 1;
    return (a.input_price || 0) - (b.input_price || 0);
  });

  const resultHeaders = [
    ['Rank & Model', 'Status', 'Answer Excerpt', 'Latency', 'Tokens', 'Cost ($) ↑', 'Judge Score ↑'],
  ];

  const resultRows = sortedResults.map((r, idx) => {
    const isSuccess = r.status === 'success';
    const answerSnippet = isSuccess
      ? (r.answer || '').replace(/\s+/g, ' ').substring(0, 65) + '...'
      : `[${r.status.toUpperCase()}] ${r.error || 'Unavailable'}`.substring(0, 65);

    const tokenStr = isSuccess ? `${r.prompt_tokens} / ${r.completion_tokens}` : '—';
    const costStr = isSuccess ? `$${r.total_cost.toFixed(5)}` : '$0.00000';
    const scoreStr = isSuccess ? `${r.quality_score}%` : '0%';

    return [
      `#${idx + 1} ${r.model_id}`,
      isSuccess ? 'Active' : r.status.toUpperCase(),
      answerSnippet,
      isSuccess ? `${r.latency}s` : '—',
      tokenStr,
      costStr,
      scoreStr,
    ];
  });

  callAutoTable(doc, {
    startY: currentY,
    head: resultHeaders,
    body: resultRows,
    margin: { left: margin, right: margin },
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 105 },
      1: { cellWidth: 48, fontStyle: 'bold' },
      2: { cellWidth: 175 },
      3: { cellWidth: 42, halign: 'right' },
      4: { cellWidth: 55, halign: 'right' },
      5: { cellWidth: 53, halign: 'right', fontStyle: 'bold', textColor: [217, 119, 6] },
      6: { cellWidth: 45, halign: 'right', fontStyle: 'bold', textColor: [2, 132, 199] },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        if (data.cell.raw === 'Active') {
          data.cell.styles.textColor = [16, 185, 129];
        } else {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
  });

  // Footer for Page 1
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Page 1 of 2 • MathRouter Evaluation Suite', margin, pageHeight - 16);

  // ==========================================
  // PAGE 2: GRAPH, WINNER & ANALYTICAL SUMMARY
  // ==========================================
  doc.addPage();
  currentY = margin + 10;

  // Header Page 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Performance vs. Cost Trade-Off Graph (Ascending Order)', margin, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Models plotted in strict ascending order of price ($) and score (%). Green circle marks the Pareto sweet spot.',
    margin,
    currentY + 8
  );
  currentY += 18;

  // Embedded Chart
  const chartDataUrl = createComparisonChartImage(
    evalData.results,
    evalData.winner,
    evalData.intersection_point
  );

  if (chartDataUrl) {
    const chartHeight = 250;
    doc.addImage(chartDataUrl, 'PNG', margin, currentY, contentWidth, chartHeight);
    currentY += chartHeight + 24;
  }

  // 4. WINNER ANNOUNCEMENT CARD
  const winner = evalData.winner;
  if (winner) {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.setLineWidth(1.5);
    doc.rect(margin, currentY, contentWidth, 90, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(6, 95, 70); // emerald-800
    doc.text(`★ WINNER MODEL: ${winner.model_id.toUpperCase()}`, margin + 14, currentY + 22);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text(
      `Response Quality Score: ${winner.quality_score}%   •   Turn Cost: $${winner.total_cost.toFixed(5)}   •   Latency: ${winner.latency}s`,
      margin + 14,
      currentY + 38
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('Pareto Intersection Rationale:', margin + 14, currentY + 56);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const justificationText =
      evalData.intersection_point?.rationale ||
      `${winner.model_id} sits at the optimal trade-off intersection: it delivers high response quality while minimizing token cost per query.`;

    const splitText = doc.splitTextToSize(justificationText, contentWidth - 28);
    doc.text(splitText, margin + 14, currentY + 70);

    currentY += 105;
  }

  // Footer for Page 2
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Page 2 of 2 • MathRouter Evaluation Suite', margin, pageHeight - 16);

  // Trigger Save
  const safeSessionName = (evalData.selected_take_info?.recording_title || 'evaluation')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  const filename = `${safeSessionName}_cost_report_${Date.now()}.pdf`;
  doc.save(filename);
}
