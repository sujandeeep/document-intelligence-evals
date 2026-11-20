import logging
from prometheus_client import Counter, Histogram, Gauge, start_http_server

logger = logging.getLogger("rag_metrics")

# Prometheus Metrics Definitions
CONFIDENCE_SCORE = Histogram(
    "rag_confidence_score",
    "Distribution of composite confidence scores for RAG responses (0.0 to 1.0)",
    buckets=[0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0]
)

FAITHFULNESS_SCORE = Histogram(
    "rag_faithfulness_score",
    "Groundedness and hallucination resistance score (0.0 to 1.0)",
    buckets=[0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0]
)

CONTEXT_RELEVANCE_SCORE = Histogram(
    "rag_context_relevance_score",
    "Retrieval signal-to-noise ratio score (0.0 to 1.0)",
    buckets=[0.3, 0.5, 0.7, 0.8, 0.9, 1.0]
)

ANSWER_RELEVANCE_SCORE = Histogram(
    "rag_answer_relevance_score",
    "Answer completeness and intent satisfaction score (0.0 to 1.0)",
    buckets=[0.5, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0]
)

# Gauge Metrics for instant status displays & single-evaluation updates in Grafana
LATEST_CONFIDENCE_GAUGE = Gauge(
    "rag_latest_confidence",
    "Most recent confidence score (0.0 to 1.0)"
)

LATEST_FAITHFULNESS_GAUGE = Gauge(
    "rag_latest_faithfulness",
    "Most recent faithfulness score (0.0 to 1.0)"
)

LATEST_CONTEXT_RELEVANCE_GAUGE = Gauge(
    "rag_latest_context_relevance",
    "Most recent context relevance score (0.0 to 1.0)"
)

LATEST_ANSWER_RELEVANCE_GAUGE = Gauge(
    "rag_latest_answer_relevance",
    "Most recent answer relevance score (0.0 to 1.0)"
)

TOTAL_EVALUATIONS_GAUGE = Gauge(
    "rag_total_evaluations_count",
    "Total count of evaluations recorded"
)

EVAL_REQUESTS_TOTAL = Counter(
    "rag_eval_requests_total",
    "Total number of RAG evaluations performed",
    ["model_id", "verdict"]
)

HALLUCINATIONS_TOTAL = Counter(
    "rag_hallucinations_total",
    "Total count of detected hallucinated responses (Faithfulness < 0.85)",
    ["model_id"]
)

EVAL_LATENCY_SECONDS = Histogram(
    "rag_eval_latency_seconds",
    "Execution latency of the evaluation engine in seconds",
    buckets=[0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0]
)

_server_started = False

def start_metrics_server(port: int = 8000):
    """Starts the Prometheus scrape endpoint on the specified port."""
    global _server_started
    if not _server_started:
        try:
            start_http_server(port)
            _server_started = True
            logger.info(f"Prometheus metrics exporter started on port {port}/metrics")
            print(f"[Prometheus] Exporter listening on http://0.0.0.0:{port}/metrics")
        except Exception as e:
            logger.warning(f"Metrics server already running or port {port} busy: {e}")

def record_evaluation_metrics(
    model_id: str,
    faithfulness: float,
    context_relevance: float,
    answer_relevance: float,
    confidence: float,
    verdict: str,
    latency_ms: int
):
    """Records metric observations to Prometheus counters, gauges, and histograms."""
    CONFIDENCE_SCORE.observe(confidence)
    FAITHFULNESS_SCORE.observe(faithfulness)
    CONTEXT_RELEVANCE_SCORE.observe(context_relevance)
    ANSWER_RELEVANCE_SCORE.observe(answer_relevance)
    EVAL_LATENCY_SECONDS.observe(latency_ms / 1000.0)
    EVAL_REQUESTS_TOTAL.labels(model_id=model_id, verdict=verdict).inc()

    # Instantaneous gauges for live single-evaluation views
    LATEST_CONFIDENCE_GAUGE.set(confidence)
    LATEST_FAITHFULNESS_GAUGE.set(faithfulness)
    LATEST_CONTEXT_RELEVANCE_GAUGE.set(context_relevance)
    LATEST_ANSWER_RELEVANCE_GAUGE.set(answer_relevance)
    TOTAL_EVALUATIONS_GAUGE.inc()

    if faithfulness < 0.85:
        HALLUCINATIONS_TOTAL.labels(model_id=model_id).inc()
