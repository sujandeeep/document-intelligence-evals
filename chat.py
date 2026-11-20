import os
import sys
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.prompt import Prompt

from src.server import ingest_document, ask_rag, get_recent_evaluations
from src.generator import AVAILABLE_MODELS

console = Console()

def show_header():
    console.clear()
    console.print(
        Panel.fit(
            "[bold cyan]Elephant-Goldfish RAG & Evaluation Console[/bold cyan]\n"
            "[green]• Elephant:[/green] PostgreSQL (pgvector :5434) + Prometheus (:8000) + Grafana (:3000)\n"
            "[yellow]• Goldfish:[/yellow] gpt-6-astra RAG Triad Evaluator (Faithfulness, Relevancy, Confidence)",
            border_style="cyan"
        )
    )

def handle_ingest():
    console.print("\n[bold yellow]── Ingest Document ──[/bold yellow]")
    file_path = Prompt.ask("[bold white]Enter file path to ingest (.txt, .md, .pdf)[/bold white]").strip()
    
    if not file_path:
        console.print("[red]No file path provided.[/red]")
        return
        
    dataset_name = Prompt.ask("Enter dataset name", default="default_kb").strip()
    
    with console.status("[cyan]Chunking, generating embeddings, and storing...[/cyan]"):
        res = ingest_document(file_path=file_path, dataset_name=dataset_name)
        
    console.print(f"[green]✓ Ingestion Complete![/green] Details: {res}")

def handle_ask():
    console.print("\n[bold yellow]── Ask RAG Question ──[/bold yellow]")
    query = Prompt.ask("[bold white]Enter your question[/bold white]").strip()
    
    if not query:
        return
        
    console.print("\n[bold cyan]Select Model:[/bold cyan]")
    for idx, m in enumerate(AVAILABLE_MODELS, 1):
        console.print(f"  [{idx}] {m}")
        
    choice = Prompt.ask("Choose model", choices=[str(i) for i in range(1, len(AVAILABLE_MODELS) + 1)], default="1")
    selected_model = AVAILABLE_MODELS[int(choice) - 1]
    
    console.print(f"\n[cyan]Generating answer using [bold]{selected_model}[/bold]...[/cyan]")
    
    # We use async_eval=False here so you see the confidence score right in the terminal
    res = ask_rag(query=query, model_id=selected_model, async_eval=False)
    
    console.print("\n" + "=" * 60)
    console.print(f"[bold green]Answer ({res['model_used']}):[/bold green]")
    console.print(res["answer"])
    console.print("=" * 60)
    
    if res.get("evaluation"):
        ev = res["evaluation"]
        conf = ev["confidence_percentage"]
        verdict = res["verdict"]
        
        color = "green" if conf >= 85 else ("yellow" if conf >= 70 else "red")
        
        console.print(Panel(
            f"[bold {color}]Confidence Score: {conf}%  |  Verdict: {verdict}[/bold {color}]\n\n"
            f"• [bold]Faithfulness (Groundedness):[/bold] {ev['metrics']['faithfulness'] * 100}%\n"
            f"• [bold]Context Relevance:[/bold] {ev['metrics']['context_relevance'] * 100}%\n"
            f"• [bold]Answer Relevancy:[/bold] {ev['metrics']['answer_relevance'] * 100}%\n\n"
            f"[dim]{ev['explanations']['summary']}[/dim]",
            title="[bold yellow]Goldfish RAG Triad Audit[/bold yellow]",
            border_style=color
        ))
        
        if ev.get("unsupported_claims"):
            console.print("[bold red]⚠ Hallucinations / Unsupported Claims Detected:[/bold red]")
            for c in ev["unsupported_claims"]:
                console.print(f"  [red]✗ {c}[/red]")
        else:
            console.print("[green]✓ Zero Hallucinations Detected. All claims backed by retrieved context.[/green]")

def handle_history():
    console.print("\n[bold yellow]── Recent RAG Evaluations in PostgreSQL ──[/bold yellow]")
    records = get_recent_evaluations(limit=10)
    
    if not records:
        console.print("[dim]No evaluations recorded yet.[/dim]")
        return
        
    table = Table(title="PostgreSQL Audit Log (Elephant)")
    table.add_column("ID", justify="right", style="cyan")
    table.add_column("Model", style="magenta")
    table.add_column("Query", style="white", max_width=40)
    table.add_column("Confidence", justify="right")
    table.add_column("Verdict")
    
    for r in records:
        conf_str = f"{round(float(r['confidence_score']) * 100, 1)}%"
        color = "green" if float(r['confidence_score']) >= 0.85 else "yellow"
        table.add_row(
            str(r["id"]),
            str(r["model_id"]),
            str(r["query"])[:40] + ("..." if len(str(r["query"])) > 40 else ""),
            f"[{color}]{conf_str}[/{color}]",
            str(r["verdict"])
        )
        
    console.print(table)
    console.print("\n[dim]To view full time-series charts, visit Grafana at: http://localhost:3000[/dim]")

def main():
    while True:
        show_header()
        console.print("\n[bold white]What would you like to do?[/bold white]")
        console.print("  [bold cyan]1.[/bold cyan] Ingest a new document")
        console.print("  [bold cyan]2.[/bold cyan] Ask a question (Chat with model selection)")
        console.print("  [bold cyan]3.[/bold cyan] View recent evaluation audit logs")
        console.print("  [bold cyan]4.[/bold cyan] Exit")
        
        choice = Prompt.ask("\nEnter choice", choices=["1", "2", "3", "4"], default="2")
        
        if choice == "1":
            handle_ingest()
        elif choice == "2":
            handle_ask()
        elif choice == "3":
            handle_history()
        elif choice == "4":
            console.print("[cyan]Goodbye![/cyan]")
            sys.exit(0)
            
        Prompt.ask("\n[dim]Press Enter to continue...[/dim]")

if __name__ == "__main__":
    main()
