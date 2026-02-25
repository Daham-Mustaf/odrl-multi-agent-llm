# Evaluator Usage (DeepSeek + All Ground Truth)

This guide uses the default dataset settings of both evaluators and runs all ground-truth samples with `deepseek`.

## Custom Model Configuration (English Guide + Template)

If you want to run evaluators with a custom model, you must provide the model configuration first.

You have two options:

1. **Edit file manually**  
   Add your model entry in:
   `backend/config/custom_models.json`
2. **Add from Frontend UI**  
   Open the frontend model settings page and add a custom model there.  
   The backend will store the entry into `backend/config/custom_models.json`.

> Security note: never commit real API keys. Use placeholders in docs and local secrets in your runtime environment.

### `custom_models.json` template

```json
[
  {
    "value": "custom:your-model-name",
    "label": "Your Model Label",
    "provider_type": "openai-compatible",
    "base_url": "https://your-provider-endpoint/v1",
    "model_id": "your-model-name",
    "api_key": "YOUR_API_KEY",
    "context_length": 4096,
    "temperature_default": 0.3,
    "created_at": 0,
    "updated_at": 0
  }
]
```

### Additional entry template (append inside the same JSON array)

```json
{
  "value": "custom:another-model",
  "label": "Another Model",
  "provider_type": "openai-compatible",
  "base_url": "https://your-provider-endpoint/v1",
  "model_id": "another-model",
  "api_key": "YOUR_API_KEY",
  "context_length": 4096,
  "temperature_default": 0.3,
  "created_at": 0,
  "updated_at": 0
}
```

## 1) 进入项目根目录

```bash
cd /home/yxpeng/Projects/Papers/2026/odrl-multi-agent-llm
```

## 2) 先提取 DeepSeek 自定义配置

```bash
DEEPSEEK_CFG=$(
python - <<'PY'
import json
from pathlib import Path

p = Path("backend/config/custom_models.json")
models = json.loads(p.read_text(encoding="utf-8"))

target = None
for m in models:
    value = str(m.get("value", ""))
    if value in ("custom:deepseek-chat", "deepseek-chat"):
        target = m
        break

if target is None:
    raise SystemExit("deepseek model not found in backend/config/custom_models.json")

print(json.dumps(target, ensure_ascii=False))
PY
)
```

## 3) Workflow Evaluator（默认 dataset，DeepSeek，全量）

```bash
uv run --project backend python evaluation/evaluator/workflow-evaluator.py \
  --model custom:deepseek-chat \
  --custom-config-json "$DEEPSEEK_CFG" \
  --start 0 \
  --end 999999
```

## 4) Reasoner Evaluator（默认 dataset，DeepSeek，全量）

```bash
uv run --project backend python evaluation/evaluator/reasoner_evaluator.py \
  --model custom:deepseek-chat \
  --custom-config-json "$DEEPSEEK_CFG" \
  --start 0 \
  --end 999999
```

`--end 999999` 会被脚本内部自动截断到数据集最后一条，因此可用于“全量运行”。

---

## 使用 Azure GPT（custom:azure-gpt-4.1）

### 1) 提取 Azure GPT 自定义配置

```bash
AZURE_GPT_CFG=$(
python - <<'PY'
import json
from pathlib import Path

p = Path("backend/config/custom_models.json")
models = json.loads(p.read_text(encoding="utf-8"))

target = None
for m in models:
    value = str(m.get("value", ""))
    if value in ("custom:azure-gpt-4.1", "azure-gpt-4.1"):
        target = m
        break

if target is None:
    raise SystemExit("azure-gpt-4.1 model not found in backend/config/custom_models.json")

print(json.dumps(target, ensure_ascii=False))
PY
)
```

### 2) Workflow Evaluator（默认 dataset，Azure GPT，全量）

```bash
uv run --project backend python evaluation/evaluator/workflow-evaluator.py \
  --model custom:azure-gpt-4.1 \
  --custom-config-json "$AZURE_GPT_CFG" \
  --start 0 \
  --end 999999
```

### 3) Reasoner Evaluator（默认 dataset，Azure GPT，全量）

```bash
uv run --project backend python evaluation/evaluator/reasoner_evaluator.py \
  --model custom:azure-gpt-4.1 \
  --custom-config-json "$AZURE_GPT_CFG" \
  --start 0 \
  --end 999999
```

---

## 使用 GPT-5.1（RWTHLLM:gpt-5.1）

### 1) 提取 GPT-5.1 自定义配置

```bash
GPT_51_CFG=$(
python - <<'PY'
import json
from pathlib import Path

p = Path("backend/config/custom_models.json")
models = json.loads(p.read_text(encoding="utf-8"))

target = None
for m in models:
    value = str(m.get("value", ""))
    if value in ("RWTHLLM:gpt-5.1", "gpt-5.1"):
        target = m
        break

if target is None:
    raise SystemExit("gpt-5.1 model not found in backend/config/custom_models.json")

print(json.dumps(target, ensure_ascii=False))
PY
)
```

### 2) Workflow Evaluator（默认 dataset，GPT-5.1，全量）

```bash
uv run --project backend python evaluation/evaluator/workflow-evaluator.py \
  --model RWTHLLM:gpt-5.1 \
  --custom-config-json "$GPT_51_CFG" \
  --start 0 \
  --end 999999
```

### 3) Reasoner Evaluator（默认 dataset，GPT-5.1，全量）

```bash
uv run --project backend python evaluation/evaluator/reasoner_evaluator.py \
  --model RWTHLLM:gpt-5.1 \
  --custom-config-json "$GPT_51_CFG" \
  --start 0 \
  --end 999999
```
