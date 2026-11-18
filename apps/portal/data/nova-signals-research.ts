/**
 * Source-first research references, not operational pharmaceutical data or AI model endpoints.
 * Protected Nova ML research view only. No raw ChatGPT data or OpenAI credentials.
 */
export const novaSignalsResearchSources = [
  {
    id: "science-frontier", group: "Scientific research",
    title: "Science at the Frontier: How scientists use ChatGPT",
    url: "https://cdn.openai.com/pdf/0e4b2466-0be0-4326-8bf7-117d809e14d2/Science%20at%20the%20Frontier.pdf",
    finding: "Scientific users concentrate on reading and writing, idea development and iterative expert review.",
    adaptation: "Evidence review, question refinement, reproducibility and explicit researcher acceptance.",
    boundary: "Observational use of AI by sampled academics does not validate pharmaceutical decisions."
  },
  {
    id: "freelance-frontier", group: "Work and organisations",
    title: "Work at the Frontier: AI's effect on freelance work",
    url: "https://cdn.openai.com/pdf/openai-upwork-full-report.pdf",
    finding: "AI-related projects combine more diverse tasks; demand cannot be reduced to a simple replacement story.",
    adaptation: "Design end-to-end research deliverables with clear handoffs and accountable completion.",
    boundary: "Freelance marketplace associations do not predict NovaPharm employment or ROI."
  },
  {
    id: "workers-frontier", group: "Work and organisations",
    title: "How workers are unlocking new ways of working",
    url: "https://cdn.openai.com/pdf/work-at-the-frontier-report-202609.pdf",
    finding: "AI-assisted tasks outside established roles can become recurrent work.",
    adaptation: "Support voluntary cross-role workflows with training, provenance and permission boundaries.",
    boundary: "Cross-role use is not evidence of regulated competence or automatic authorisation."
  },
  {
    id: "novices-rct", group: "Scientific research",
    title: "Training novices to think, or giving them LLMs? Evidence from an RCT",
    url: "https://cdn.openai.com/pdf/novices-and-llm-august-2026.pdf",
    finding: "Randomised evidence distinguishes better evaluated output from causal-reasoning skills.",
    adaptation: "Show assumptions, counterexamples and human hypothesis tests alongside AI drafts.",
    boundary: "Results from student business tasks do not generalise to medicine safety or efficacy."
  },
  {
    id: "enterprise-usage", group: "Work and organisations",
    title: "How organizations use AI: Evidence from ChatGPT",
    url: "https://cdn.openai.com/pdf/how-organizations-use-chatgpt.pdf",
    finding: "Organisational adoption and intensity vary across firms, functions and seniority.",
    adaptation: "Evaluate permission-scoped pilots by task outcomes, not message or token volume alone.",
    boundary: "OpenAI customer usage patterns are not NovaPharm production metrics."
  },
  {
    id: "task-crossover", group: "Work and organisations",
    title: "How AI is expanding what people do at work",
    url: "https://openai.com/index/how-ai-is-expanding-what-people-do-at-work/",
    finding: "Workers use AI for some activities associated with other occupations.",
    adaptation: "Constrain cross-department collaboration to allowed sources and human reviewers.",
    boundary: "Task crossover is not approval for clinical, legal or regulatory work."
  },
  {
    id: "eu-jobs", group: "Work and organisations",
    title: "The AI jobs transition framework for the EU",
    url: "https://cdn.openai.com/pdf/the-ai-jobs-transition-framework-for-the-eu.pdf",
    finding: "AI exposure, labour demand and human judgement require different measures.",
    adaptation: "Use a skills and change-management framework rather than job-displacement predictions.",
    boundary: "Framework signals are not forecasts for an individual worker or business."
  },
  {
    id: "adoption-global", group: "OpenAI Signals",
    title: "How ChatGPT adoption has expanded",
    url: "https://openai.com/index/how-chatgpt-adoption-has-expanded/",
    finding: "Aggregated consumer adoption broadens by region and use case over time.",
    adaptation: "Design localisation and accessibility research without importing personal user histories.",
    boundary: "Consumer ChatGPT adoption is not pharmaceutical market adoption or medicine demand."
  },
  {
    id: "codex-agentic", group: "Work and organisations",
    title: "The shift to agentic AI: evidence from Codex",
    url: "https://cdn.openai.com/pdf/5d1e1489-21c0-43e4-9d42-f87efdbf0082/the-shift-to-agentic-ai-evidence-from-codex.pdf",
    finding: "Agentic tools expand the complexity and variety of delegated tasks.",
    adaptation: "Prepare staged read-plan-review workflows with explicit approvals and audit receipts.",
    boundary: "No autonomous medicine, commercial, regulatory, financial or infrastructure actions."
  },
  {
    id: "adoption-q1", group: "OpenAI Signals",
    title: "How ChatGPT adoption broadened in early 2026",
    url: "https://openai.com/signals/research/2026q1-update/",
    finding: "Consumer adoption broadened across age and geography in the first quarter of 2026.",
    adaptation: "Review interface inclusiveness and country context without inferred individual profiling.",
    boundary: "Country rank reflects relative consumer use, not total enterprise adoption."
  },
  {
    id: "signals-v3", group: "OpenAI Signals",
    title: "Signals individual data v3.0 and methodology",
    url: "https://openai.com/signals/data-download/",
    finding: "Published CC BY 4.0 aggregate CSV data with privacy-preserving statistical methods.",
    adaptation: "Allowlist aggregate data tables, retain attribution, timestamps, caveats and human provenance review.",
    boundary: "No user prompts, personal records, OpenAI internal APIs or live user-level data feeds."
  },
  {
    id: "enterprise-signals", group: "OpenAI Signals",
    title: "Enterprise Signals: What frontier firms are doing differently",
    url: "https://openai.com/signals/enterprise-data/",
    finding: "Enterprise AI use varies in depth, connected workflows and agentic adoption.",
    adaptation: "Benchmark workflow design only after a defensible NovaPharm baseline exists.",
    boundary: "OpenAI enterprise benchmarks are not NovaPharm measured outcomes."
  },
  {
    id: "whisper-2022", group: "AI engineering",
    title: "Introducing Whisper",
    url: "https://openai.com/index/whisper/",
    finding: "Multilingual speech recognition and translation can support user-requested transcription.",
    adaptation: "Design opt-in device audio drafts with deletion, language review and correction.",
    boundary: "No microphone capture, speech model, API call, patient audio or background listening is enabled."
  },
  {
    id: "large-network-training-2022", group: "AI engineering",
    title: "Techniques for training large neural networks",
    url: "https://openai.com/index/techniques-for-training-large-neural-networks/",
    finding: "Data, pipeline and tensor parallelism, MoE and memory management have different trade-offs.",
    adaptation: "Use these as design alternatives only after rights, demand, evaluation and budget approval.",
    boundary: "No distributed GPU cluster or training job has been provisioned."
  },
  {
    id: "triton-2021", group: "AI engineering",
    title: "Introducing Triton",
    url: "https://openai.com/index/triton/",
    finding: "GPU kernel programming can improve specific training and inference operations.",
    adaptation: "Evaluate only on a profiled, licensed, approved backend workload with portable fallback.",
    boundary: "Triton is not a mobile/web API; no custom kernels are compiled or deployed."
  }
] as const;

export const novaSignalsResearchGroups = ["Scientific research", "Work and organisations", "OpenAI Signals", "AI engineering"] as const;
