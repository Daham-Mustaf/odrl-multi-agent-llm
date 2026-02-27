const path = require("path");
const PptxGenJS = require("/home/yxpeng/.local/pptx-tools/node_modules/pptxgenjs");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_16x9";
pptx.author = "ODRL Multi-Agent Team";
pptx.company = "Fraunhofer FIT / RWTH";
pptx.subject = "Evaluation overview";
pptx.title = "Evaluation Overview - ODRL Multi-Agent Copilot";
pptx.lang = "en-US";

const colors = {
  navy: "1E2761",
  ice: "CADCFC",
  white: "FFFFFF",
  teal: "028090",
  mint: "02C39A",
  red: "B85042",
  gray: "475569",
  light: "F8FAFC",
  dark: "0F172A",
};

function addHeader(slide, title, subtitle = "") {
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.9,
    line: { color: colors.navy, pt: 0 },
    fill: { color: colors.navy },
  });
  slide.addText(title, {
    x: 0.45,
    y: 0.18,
    w: 6.8,
    h: 0.45,
    fontFace: "Calibri",
    fontSize: 24,
    bold: true,
    color: colors.white,
    margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 6.9,
      y: 0.26,
      w: 2.7,
      h: 0.3,
      fontFace: "Calibri",
      fontSize: 11,
      color: colors.ice,
      align: "right",
      margin: 0,
    });
  }
}

function addFooter(slide) {
  slide.addText("Source: evaluation/ + acl_latex.tex (System Validation section)", {
    x: 0.45,
    y: 5.28,
    w: 9.1,
    h: 0.2,
    fontFace: "Calibri",
    fontSize: 9,
    color: "64748B",
    margin: 0,
  });
}

// Slide 1: Title
{
  const slide = pptx.addSlide();
  slide.background = { color: colors.navy };

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.55,
    y: 0.75,
    w: 8.9,
    h: 4.15,
    line: { color: colors.ice, pt: 0 },
    fill: { color: "243B7A" },
  });

  slide.addText("Evaluation Overview", {
    x: 0.95,
    y: 1.35,
    w: 8.1,
    h: 0.8,
    fontFace: "Calibri",
    fontSize: 42,
    bold: true,
    color: colors.white,
    margin: 0,
  });
  slide.addText("AI Copilot for Semantic Conflict-Free ODRL Policy Creation", {
    x: 0.95,
    y: 2.3,
    w: 8.1,
    h: 0.5,
    fontFace: "Calibri",
    fontSize: 19,
    color: colors.ice,
    margin: 0,
  });
  slide.addText("Benchmarks, metrics, and key findings for the evaluator pipeline", {
    x: 0.95,
    y: 2.9,
    w: 8.1,
    h: 0.35,
    fontFace: "Calibri",
    fontSize: 14,
    color: colors.white,
    italic: true,
    margin: 0,
  });
  slide.addText("ODRL Multi-Agent LLM | 2026", {
    x: 0.95,
    y: 4.4,
    w: 8.1,
    h: 0.25,
    fontFace: "Calibri",
    fontSize: 11,
    color: colors.ice,
    margin: 0,
  });
}

// Slide 2: Evaluation setup
{
  const slide = pptx.addSlide();
  slide.background = { color: colors.light };
  addHeader(slide, "Evaluation Setup", "System Validation");

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.55,
    y: 1.15,
    w: 4.3,
    h: 3.9,
    fill: { color: colors.white },
    line: { color: "E2E8F0", pt: 1 },
    shadow: { type: "outer", color: "000000", blur: 2, offset: 1, angle: 45, opacity: 0.08 },
  });
  slide.addText("Benchmarks", {
    x: 0.85,
    y: 1.42,
    w: 3.7,
    h: 0.3,
    fontSize: 19,
    bold: true,
    color: colors.dark,
    margin: 0,
  });
  slide.addText(
    [
      { text: "Input-to-policy dataset: 50 samples", options: { bullet: true, breakLine: true } },
      { text: "20 Agreement, 19 Offer, 11 Set/Rule", options: { bullet: true, breakLine: true } },
      { text: "Reasoner benchmark: 139 policies", options: { bullet: true, breakLine: true } },
      { text: "67 with conflicts, 72 without conflicts", options: { bullet: true } },
    ],
    { x: 0.85, y: 1.86, w: 3.7, h: 2.25, fontSize: 14, color: "1E293B", margin: 0.03 }
  );

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 5.1,
    y: 1.15,
    w: 4.35,
    h: 3.9,
    fill: { color: colors.white },
    line: { color: "E2E8F0", pt: 1 },
    shadow: { type: "outer", color: "000000", blur: 2, offset: 1, angle: 45, opacity: 0.08 },
  });
  slide.addText("Evaluators and Scope", {
    x: 5.4,
    y: 1.42,
    w: 3.75,
    h: 0.3,
    fontSize: 19,
    bold: true,
    color: colors.dark,
    margin: 0,
  });
  slide.addText(
    [
      { text: "Generator Evaluator: ", options: { bold: true } },
      { text: "Input → Generator", options: { breakLine: true } },
      { text: "Reasoner Evaluator: ", options: { bold: true } },
      { text: "Input → Parser → Reasoner", options: { breakLine: true } },
      { text: "Workflow Evaluator: ", options: { bold: true } },
      { text: "Full pipeline (P-R-G-V)", options: { breakLine: true } },
      { text: "Main reported model: ", options: { bold: true } },
      { text: "DeepSeek-chat V3.2" },
    ],
    { x: 5.4, y: 1.9, w: 3.7, h: 2.05, fontSize: 14, color: "1E293B", margin: 0 }
  );

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 5.4,
    y: 4.12,
    w: 3.45,
    h: 0.65,
    fill: { color: "ECFDF5" },
    line: { color: "A7F3D0", pt: 1 },
  });
  slide.addText("Goal: stage-wise explainability and error localization", {
    x: 5.58,
    y: 4.32,
    w: 3.1,
    h: 0.2,
    fontSize: 11,
    bold: true,
    color: "065F46",
    margin: 0,
  });
  addFooter(slide);
}

// Slide 3: Benchmark examples
{
  const slide = pptx.addSlide();
  slide.background = { color: colors.white };
  addHeader(slide, "Benchmark Example Records", "Concrete samples used in evaluation");

  const inputToPolicyExample = `{
  "Input": "The museum offers digital images with a resolution rule: files above 300 dpi require a fee.",
  "policy_type": "odrl:Offer",
  "Permission.actions": ["odrl:use"],
  "Permission.Constraints.Triplets": [["odrl:resolution", "odrl:gt", "\\"300\\"^^xsd:integer"]],
  "Permission.duty.actions": ["odrl:compensate"],
  "Permission.duty.Constraints.Triplets": [["odrl:payAmount", "odrl:gt", "\\"0\\"^^xsd:decimal"]],
  "Prohibition.actions": [],
  "Prohibition.Constraints.Triplets": []
}`;

  const reasonerExample = `{
  "policy_id": 1,
  "policy_text": "The Daten Raumkultur project offers access to the Medieval Manuscripts Collection (dataset ID: drk:dataset:medieval_mss_2024) for UC4 Partner. The partner may use the dataset ONLY for research purposes. The partner may also use the dataset ONLY for archival backup purposes.",
  "conflict": "unmeasurable_terms",
  "conflict_primary": "vagueness"
}`;

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.55,
    y: 1.15,
    w: 4.35,
    h: 3.95,
    fill: { color: "F8FAFC" },
    line: { color: "CBD5E1", pt: 1 },
  });
  slide.addText("Input-to-Policy benchmark example", {
    x: 0.75,
    y: 1.35,
    w: 3.95,
    h: 0.24,
    fontSize: 14,
    bold: true,
    color: colors.dark,
    margin: 0,
  });
  slide.addText(inputToPolicyExample, {
    x: 0.75,
    y: 1.68,
    w: 3.95,
    h: 3.2,
    fontFace: "Consolas",
    fontSize: 9.3,
    color: "1E293B",
    margin: 0,
    valign: "top",
  });

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 5.1,
    y: 1.15,
    w: 4.35,
    h: 3.95,
    fill: { color: "F8FAFC" },
    line: { color: "CBD5E1", pt: 1 },
  });
  slide.addText("Reasoner benchmark example", {
    x: 5.3,
    y: 1.35,
    w: 3.95,
    h: 0.24,
    fontSize: 14,
    bold: true,
    color: colors.dark,
    margin: 0,
  });
  slide.addText(reasonerExample, {
    x: 5.3,
    y: 1.68,
    w: 3.95,
    h: 3.2,
    fontFace: "Consolas",
    fontSize: 9.3,
    color: "1E293B",
    margin: 0,
    valign: "top",
  });
  addFooter(slide);
}

// Slide 4: Metrics
{
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  addHeader(slide, "What We Measure", "Decision-critical fields");

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.65,
    y: 1.2,
    w: 8.7,
    h: 1.05,
    fill: { color: "F1F5F9" },
    line: { color: "CBD5E1", pt: 1 },
  });
  slide.addText("Why these metrics?", {
    x: 0.9,
    y: 1.42,
    w: 2.9,
    h: 0.3,
    fontSize: 18,
    bold: true,
    color: colors.dark,
    margin: 0,
  });
  slide.addText(
    "We treat policy_type, action fields, and constraint triplets as core ODRL semantics. The evaluator is designed to answer three research questions:",
    {
      x: 3.15,
      y: 1.43,
      w: 5.9,
      h: 0.33,
      fontSize: 10.6,
      color: colors.gray,
      margin: 0,
    }
  );
  slide.addText(
    [
      { text: "RQ1: How accurate is the multi-agent pipeline at the field level (actions/constraints)?", options: { bullet: true, breakLine: true } },
      { text: "RQ2: Which fields are most error-prone (triplets vs actions vs policy type), and which policy type performs worst?", options: { bullet: true, breakLine: true } },
      { text: "RQ3: How reliably does the Reasoner detect conflicts in the input policy text?", options: { bullet: true } },
    ],
    {
      x: 3.15,
      y: 1.77,
      w: 5.9,
      h: 0.5,
      fontSize: 9.6,
      color: "334155",
      margin: 0,
    }
  );

  const tableRows = [
    ["Evaluator", "Primary outputs", "Metrics"],
    ["Generator", "policy_type, action fields, triplets", "Accuracy + Precision/Recall/F1"],
    ["Reasoner", "conflict labels", "Conflict-label accuracy"],
    ["Workflow", "parser-only vs generator-only vs full", "Stage-wise deltas (W-P, W-G)"],
  ];

  slide.addTable(tableRows, {
    x: 0.8,
    y: 2.55,
    w: 8.4,
    border: { pt: 1, color: "CBD5E1" },
    fill: "FFFFFF",
    fontFace: "Calibri",
    fontSize: 12,
    color: "0F172A",
    colW: [1.5, 3.95, 2.95],
    rowH: [0.42, 0.5, 0.45, 0.45],
    valign: "middle",
    align: "left",
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8,
    y: 2.55,
    w: 8.4,
    h: 0.42,
    fill: { color: colors.navy },
    line: { color: colors.navy, pt: 0 },
  });
  slide.addText("Evaluator", { x: 0.92, y: 2.65, w: 1.3, h: 0.2, fontSize: 12, color: "FFFFFF", bold: true, margin: 0 });
  slide.addText("Primary outputs", { x: 2.4, y: 2.65, w: 2.6, h: 0.2, fontSize: 12, color: "FFFFFF", bold: true, margin: 0 });
  slide.addText("Metrics", { x: 6.35, y: 2.65, w: 1.5, h: 0.2, fontSize: 12, color: "FFFFFF", bold: true, margin: 0 });

  addFooter(slide);
}

// Slide 5: Reasoner results
{
  const slide = pptx.addSlide();
  slide.background = { color: colors.light };
  addHeader(slide, "Reasoner Evaluator: Key Results", "Conflict-aware behavior");

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.65,
    y: 1.2,
    w: 2.7,
    h: 3.75,
    fill: { color: colors.white },
    line: { color: "E2E8F0", pt: 1 },
  });
  slide.addText("Conflict Taxonomy", {
    x: 0.88,
    y: 1.45,
    w: 2.2,
    h: 0.3,
    fontSize: 16,
    bold: true,
    color: colors.dark,
    margin: 0,
  });
  slide.addText(
    [
      { text: "Temporal (21)", options: { bullet: true, breakLine: true } },
      { text: "Vagueness (17)", options: { bullet: true, breakLine: true } },
      { text: "Action hierarchy (13)", options: { bullet: true, breakLine: true } },
      { text: "Role hierarchy (7)", options: { bullet: true, breakLine: true } },
      { text: "Circular dependency (6)", options: { bullet: true, breakLine: true } },
      { text: "Spatial (3)", options: { bullet: true } },
    ],
    { x: 0.9, y: 1.86, w: 2.2, h: 2.35, fontSize: 12.5, color: "334155", margin: 0 }
  );

  slide.addChart(
    pptx.charts.BAR,
    [
      { name: "With conflict", labels: ["DeepSeek V3.2", "GPT 4.1"], values: [0.9231, 0.96] },
      { name: "No conflict", labels: ["DeepSeek V3.2", "GPT 4.1"], values: [0.8, 0.7865] },
    ],
    {
      x: 3.55,
      y: 1.45,
      w: 5.65,
      h: 2.85,
      barDir: "col",
      catAxisLabelColor: "475569",
      valAxisLabelColor: "475569",
      valAxisMinVal: 0.7,
      valAxisMaxVal: 1.0,
      valAxisMajorUnit: 0.05,
      chartColors: [colors.teal, colors.red],
      showLegend: true,
      legendPos: "b",
      showValue: true,
      dataLabelPosition: "outEnd",
      dataLabelFormatCode: "0.0000",
      dataLabelColor: "1E293B",
      valAxisLabelFormatCode: "0.00",
      valGridLine: { color: "E2E8F0", size: 0.5 },
    }
  );

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 3.7,
    y: 4.4,
    w: 5.3,
    h: 0.55,
    fill: { color: "ECFEFF" },
    line: { color: "A5F3FC", pt: 1 },
  });
  slide.addText("Interpretation: stronger on explicit contradiction detection than preserving true negatives.", {
    x: 3.9,
    y: 4.58,
    w: 4.95,
    h: 0.2,
    fontSize: 11.5,
    color: "155E75",
    margin: 0,
  });
  addFooter(slide);
}

// Slide 6: Workflow by policy type
{
  const slide = pptx.addSlide();
  slide.background = { color: colors.white };
  addHeader(slide, "Workflow Evaluator by Policy Type", "DeepSeek V3.2");

  slide.addChart(
    pptx.charts.BAR,
    [
      { name: "Agreement", labels: ["Policy type acc", "Perm triplets F1", "Prohib triplets F1"], values: [0.5, 0.145, 0.75] },
      { name: "Offer", labels: ["Policy type acc", "Perm triplets F1", "Prohib triplets F1"], values: [0.8947, 0.3807, 0.8421] },
      { name: "Set", labels: ["Policy type acc", "Perm triplets F1", "Prohib triplets F1"], values: [1.0, 0.2727, 0.6364] },
    ],
    {
      x: 0.65,
      y: 1.3,
      w: 6.45,
      h: 3.7,
      barDir: "col",
      chartColors: [colors.navy, colors.teal, colors.mint],
      showLegend: true,
      legendPos: "b",
      showValue: true,
      dataLabelPosition: "outEnd",
      dataLabelFormatCode: "0.0000",
      dataLabelColor: "1E293B",
      catAxisLabelColor: "475569",
      valAxisLabelColor: "475569",
      valAxisLabelFormatCode: "0.00",
      valAxisMinVal: 0,
      valAxisMaxVal: 1.05,
      valAxisMajorUnit: 0.2,
      valGridLine: { color: "E2E8F0", size: 0.5 },
    }
  );

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 7.25,
    y: 1.3,
    w: 2.1,
    h: 3.7,
    fill: { color: "F8FAFC" },
    line: { color: "CBD5E1", pt: 1 },
  });
  slide.addText("Highlights", {
    x: 7.48,
    y: 1.52,
    w: 1.6,
    h: 0.24,
    fontSize: 15,
    bold: true,
    color: colors.dark,
    margin: 0,
  });
  slide.addText(
    [
      { text: "Agreement: weak type accuracy (0.50)", options: { bullet: true, breakLine: true } },
      { text: "Offer: most stable overall", options: { bullet: true, breakLine: true } },
      { text: "Set: best type classification (1.00)", options: { bullet: true, breakLine: true } },
      { text: "Permission triplets remain hardest across types", options: { bullet: true } },
    ],
    { x: 7.45, y: 1.88, w: 1.75, h: 2.7, fontSize: 11.2, color: "334155", margin: 0 }
  );

  addFooter(slide);
}

// Slide 7: Takeaways
{
  const slide = pptx.addSlide();
  slide.background = { color: colors.light };
  addHeader(slide, "Takeaways and Next Steps", "For demo presentation");

  const boxes = [
    { x: 0.65, y: 1.35, w: 2.75, h: 1.55, title: "Strengths", color: "DCFCE7", line: "86EFAC", text: "Conflict screening is robust and auditable via Checkpoint I + reasoner labels." },
    { x: 3.62, y: 1.35, w: 2.75, h: 1.55, title: "Limitations", color: "FEF3C7", line: "FDE68A", text: "Agreement policy-type identification and permission triplet modeling are weaker." },
    { x: 6.6, y: 1.35, w: 2.75, h: 1.55, title: "Value", color: "DBEAFE", line: "93C5FD", text: "Stage-wise evaluators make failures explainable and guide targeted fixes." },
  ];
  for (const b of boxes) {
    slide.addShape(pptx.shapes.RECTANGLE, {
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
      fill: { color: b.color },
      line: { color: b.line, pt: 1 },
    });
    slide.addText(b.title, {
      x: b.x + 0.2,
      y: b.y + 0.2,
      w: b.w - 0.35,
      h: 0.22,
      fontSize: 14,
      bold: true,
      color: "0F172A",
      margin: 0,
    });
    slide.addText(b.text, {
      x: b.x + 0.2,
      y: b.y + 0.52,
      w: b.w - 0.35,
      h: 0.9,
      fontSize: 11.5,
      color: "334155",
      margin: 0,
    });
  }

  slide.addText("Suggested speaking flow (60-90s):", {
    x: 0.8,
    y: 3.35,
    w: 3.7,
    h: 0.26,
    fontSize: 15,
    bold: true,
    color: colors.dark,
    margin: 0,
  });
  slide.addText(
    [
      { text: "Dataset setup and evaluator roles", options: { bullet: true, breakLine: true } },
      { text: "Reasoner conflict/no-conflict behavior", options: { bullet: true, breakLine: true } },
      { text: "Policy-type differences in workflow", options: { bullet: true, breakLine: true } },
      { text: "Concrete roadmap: improve agreement typing + triplets", options: { bullet: true } },
    ],
    { x: 0.95, y: 3.72, w: 4.4, h: 1.35, fontSize: 12.2, color: "334155", margin: 0 }
  );

  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 5.45,
    y: 3.35,
    w: 3.9,
    h: 1.7,
    fill: { color: "0F172A" },
    line: { color: "0F172A", pt: 1 },
  });
  slide.addText("One-line conclusion", {
    x: 5.7,
    y: 3.6,
    w: 3.4,
    h: 0.22,
    fontSize: 13,
    bold: true,
    color: "A5B4FC",
    margin: 0,
  });
  slide.addText(
    "The multi-agent workflow is feasible and transparent for human-guided ODRL policy engineering, with clear next targets for robustness.",
    {
      x: 5.7,
      y: 3.88,
      w: 3.35,
      h: 0.95,
      fontSize: 11.5,
      color: "E2E8F0",
      margin: 0,
    }
  );

  addFooter(slide);
}

const outputPath = path.resolve(
  "/home/yxpeng/Projects/Papers/2026/odrl-multi-agent-llm/evaluation/evaluator/Evaluation_Overview_Slides.pptx"
);

pptx.writeFile({ fileName: outputPath });
console.log(`Created: ${outputPath}`);
