import argparse
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def resolve_project_path(path: str) -> Path:
    candidate = Path(path)
    if candidate.is_absolute():
        return candidate
    return (PROJECT_ROOT / candidate).resolve()


def clean_ttl_content(text: str) -> str:
    cleaned_lines = []
    previous_blank = False

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()

        # Remove markdown fences and all full-line comments.
        if not stripped:
            if not previous_blank:
                cleaned_lines.append("")
            previous_blank = True
            continue
        if stripped.startswith("#") or stripped.startswith("```"):
            continue

        cleaned_lines.append(line)
        previous_blank = False

    cleaned = "\n".join(cleaned_lines).strip() + "\n"
    return cleaned


def process_session(session_dir: Path, prune_non_refined: bool) -> None:
    if not session_dir.exists():
        raise FileNotFoundError(f"Session directory not found: {session_dir}")

    ttl_files = sorted(session_dir.glob("*.ttl"))
    refined_files = [p for p in ttl_files if "_Refined_" in p.name]

    if not refined_files:
        print(f"No refined TTL files found in: {session_dir}")
        return

    print(f"Session: {session_dir}")
    print(f"Refined files found: {len(refined_files)}")

    for refined_path in refined_files:
        final_name = refined_path.name.replace("_Refined_", "_Final_")
        final_path = session_dir / final_name

        cleaned = clean_ttl_content(refined_path.read_text(encoding="utf-8"))
        final_path.write_text(cleaned, encoding="utf-8")
        print(f"Created final TTL: {final_path.name}")

    if prune_non_refined:
        kept = 0
        deleted = 0
        for ttl_path in sorted(session_dir.glob("*.ttl")):
            name = ttl_path.name
            if "_Refined_" in name or "_Final_" in name:
                kept += 1
                continue
            ttl_path.unlink()
            deleted += 1
            print(f"Removed non-refined TTL: {name}")

        print(f"Prune completed. kept={kept}, deleted={deleted}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Create clean final TTL files from refined TTL files "
            "and optionally remove non-refined files."
        )
    )
    parser.add_argument(
        "--session-dir",
        required=True,
        help="Path to one session folder (e.g., ../data/text2policy/draft_GT/20260220_142336)",
    )
    parser.add_argument(
        "--no-prune",
        action="store_true",
        help="Do not remove non-refined/non-final TTL files",
    )
    args = parser.parse_args()

    process_session(
        session_dir=resolve_project_path(args.session_dir),
        prune_non_refined=not args.no_prune,
    )


if __name__ == "__main__":
    main()
