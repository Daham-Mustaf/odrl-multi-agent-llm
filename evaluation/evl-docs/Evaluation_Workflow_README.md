Evaluation Workflow

This document describes the evaluation workflow script `run_workflow.py`, which
runs the full pipeline from user input to ODRL Turtle output with validation.

What `run_workflow.py` does
- Runs parser -> reasoner -> generator -> validator in sequence.
- If validation fails, runs regeneration and revalidation once.
- Saves each session to `results/workflow/session_*.json`, including `final_output`
  (formatted Turtle).
- Prints concise status messages for each agent.

How to run
`cd /home/yxpeng/Projects/Papers/2026/odrl-multi-agent-llm/evaluation`
- Default input:
  `uv run --project ../backend python run_workflow.py`
- Custom text:
  `uv run --project ../backend python run_workflow.py --text "Your policy text..."`
- Text from file:
  `uv run --project ../backend python run_workflow.py --file /path/to/input.txt`

Output
- Session JSON files are written to `results/workflow/` under this folder.
- The final Turtle is stored under the `final_output` key.


Evaluator:

`uv run --project ../backend python evaluator.py --start 10 --end 19` -> evaluate the 11th - 20th data