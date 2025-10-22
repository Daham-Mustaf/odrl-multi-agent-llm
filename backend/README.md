# 🚀 ODRL Policy Generator

**Multi-Agent LLM System for Automatic ODRL Policy Generation**

Transform natural language descriptions into valid ODRL (Open Digital Rights Language) policies using a sophisticated multi-agent architecture with flexible LLM support.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![LangChain](https://img.shields.io/badge/LangChain-0.3+-green.svg)](https://python.langchain.com/)

---

## ✨ Features

- 🤖 **Multi-Agent Architecture**: Four specialized agents (Parser, Reasoner, Generator, Validator)
- 🔄 **Flexible LLM Support**: Works with Ollama, Groq, OpenAI, Claude, and custom models
- 🎨 **Modern GUI**: Interactive dashboard with real-time processing visualization
- ⚡ **Performance Metrics**: Track timing, tokens, and efficiency
- 🌙 **Dark Mode**: Professional aesthetic for demos and presentations
- 📊 **SHACL Validation**: Automatic validation against ODRL specifications
- 🔧 **Zero-Configuration**: Auto-detects available LLM providers
- 💰 **FREE Options**: Full support for Groq's free tier

---

## 🎯 Quick Start (2 Minutes)

### Prerequisites
- Python 3.8+
- A FREE Groq API key ([Get one here](https://console.groq.com/keys))

### Installation
```bash
# 1. Clone repository
git clone https://github.com/your-username/odrl-generator.git
cd odrl-generator

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure (add your Groq key)
cd backend
cp .env.example .env
nano .env  # Add: GROQ_API_KEY=gsk_your_key_here

# 4. Run backend
uvicorn main:app --reload

# 5. Open GUI
# Open frontend/index.html in your browser
# Visit: http://localhost:8000
```

**That's it!** 🎉 You should see "Backend Connected" and be ready to generate policies.

---

## 📊 Architecture

```
Natural Language → Parser → Reasoner → Generator → Validator → ODRL Policy
                     ↓         ↓          ↓           ↓
                   Agent 1   Agent 2   Agent 3    Agent 4
                   (LLM)     (LLM)     (LLM)      (LLM+SHACL)
```

### Agent Pipeline

1. **Parser**: Extracts structured information from text
2. **Reasoner**: Applies logical reasoning and policy rules
3. **Generator**: Creates valid ODRL JSON-LD policy
4. **Validator**: Validates against SHACL shapes and standards

---

## 🎮 Usage Examples

### Example 1: Document Policy
**Input:**
```
Users can read and print the document but cannot modify or distribute it.
The policy expires on December 31, 2025.
```

**Output:**
```json
{
  "@context": "http://www.w3.org/ns/odrl.jsonld",
  "@type": "Offer",
  "permission": [
    {
      "action": "read",
      "constraint": [
        {"leftOperand": "dateTime", "operator": "lteq", "rightOperand": "2025-12-31"}
      ]
    }
  ],
  "prohibition": [
    {"action": "modify"},
    {"action": "distribute"}
  ]
}
```

### Example 2: Academic Dataset
**Input:**
```
Researchers can download and analyze the dataset for non-commercial research.
Attribution is required. Commercial use is prohibited.
```

**Output:** Complete ODRL policy with permissions, duties, and prohibitions.

---

## 🔧 Configuration

### Option 1: FREE Cloud (Groq)
```bash
# backend/.env
ENABLE_GROQ=true
GROQ_API_KEY=gsk_your_key_here
DEFAULT_MODEL=groq:llama-3.1-70b-versatile
```

### Option 2: Local Ollama
```bash
# backend/.env
ENABLE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=ollama:llama3.1:8b
```

### Option 3: Research Server
```bash
# backend/.env
ENABLE_FITS=true
FITS_SERVER_URL=http://your-server:11434
DEFAULT_MODEL=ollama:llama3.1:70b
```

### Option 4: Multiple Providers
```bash
# backend/.env
ENABLE_OLLAMA=true
ENABLE_GROQ=true
ENABLE_OPENAI=true
# Users can switch in GUI!
```

See [SETUP.md](SETUP.md) for complete configuration guide.

---

## 📁 Project Structure

```
odrl-generator/
├── backend/
│   ├── main.py                 # FastAPI server
│   ├── agents/
│   │   ├── llm_router.py       # Smart LLM provider router
│   │   ├── text_parser/        # Agent 1: Text parsing
│   │   ├── reasoner/           # Agent 2: Reasoning
│   │   ├── generator/          # Agent 3: ODRL generation
│   │   └── validator/          # Agent 4: SHACL validation
│   ├── .env.example            # Configuration template
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── index.html              # GUI interface
│   └── components/             # React components
├── docs/
│   ├── SETUP.md                # Detailed setup guide
│   ├── USER_GUIDE.md           # User documentation
│   └── API.md                  # API documentation
├── tests/                      # Unit tests
├── examples/                   # Example policies
└── README.md                   # This file
```

---

## 🛠️ API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/available-providers` | GET | List all available LLM providers |
| `/api/parse` | POST | Parse natural language text |
| `/api/reason` | POST | Apply reasoning to parsed data |
| `/api/generate` | POST | Generate ODRL policy |
| `/api/validate` | POST | Validate ODRL with SHACL |

Interactive API docs: `http://localhost:8000/docs`

---

## 🎓 For Researchers

### Citation
```bibtex
@software{odrl_generator_2025,
  title={ODRL Policy Generator: Multi-Agent LLM System},
  author={Your Name},
  year={2025},
  url={https://github.com/your-username/odrl-generator}
}
```

### Key Features for Papers
- ✅ Multi-agent architecture demonstration
- ✅ LLM flexibility (local, cloud, custom)
- ✅ Performance metrics collection
- ✅ SHACL validation integration
- ✅ Real-world policy examples

---

## 📊 Performance

| Model | Parser | Reasoner | Generator | Validator | Total |
|-------|--------|----------|-----------|-----------|-------|
| Groq Llama 3.1 70B | ~500ms | ~600ms | ~700ms | ~400ms | ~2.2s |
| Local Llama 3.1 8B | ~2s | ~2.5s | ~3s | ~1s | ~8.5s |
| GPT-4 Turbo | ~800ms | ~900ms | ~1s | ~500ms | ~3.2s |

*Tested on example "Document Policy" with default settings*

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

---

## 🌟 Acknowledgments

- Built with [LangChain](https://python.langchain.com/)
- ODRL specification: [W3C ODRL](https://www.w3.org/TR/odrl-model/)
- SHACL validation: [pySHACL](https://github.com/RDFLib/pySHACL)
- LLM providers: [Ollama](https://ollama.com/), [Groq](https://groq.com/), [OpenAI](https://openai.com/)

---

## 📞 Support

- 📖 [User Guide](docs/USER_GUIDE.md)
- 🔧 [Setup Guide](docs/SETUP.md)
- 🐛 [Issue Tracker](https://github.com/your-username/odrl-generator/issues)
- 💬 [Discussions](https://github.com/your-username/odrl-generator/discussions)

---

## 🗺️ Roadmap

- [x] Multi-agent architecture
- [x] Multiple LLM provider support
- [x] Interactive GUI with metrics
- [x] SHACL validation
- [ ] Batch processing
- [ ] Model comparison mode
- [ ] Confidence scoring
- [ ] Policy templates library
- [ ] REST API authentication
- [ ] Docker deployment

---

## ⭐ Star History

If this project helped you, please consider giving it a star! ⭐

---

**Made with ❤️ for the ODRL and Semantic Web community**