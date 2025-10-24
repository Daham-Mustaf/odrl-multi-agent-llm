# TODO List – ODRL Multi-Agent LLM Demo

## ✅ Completed
- [x] Add dark mode toggle and persistence
- [x] Initial backend and frontend setup
- [x] Link API docs in frontend footer

---

## 🔹 Backend
- [ ] Improve agent capabilities:
  - Parser: better error detection & richer parsing
  - Reasoner: more reasoning rules or context handling
  - Generator: richer ODRL templates
  - Validator: improved SHACL validation
- [ ] Add tools integration (e.g., knowledge base, external APIs)
- [ ] Improve error handling for custom models
- [ ] Refactor custom models storage for scalability
- [ ] Add unit tests for each agent
- [ ] Add integration tests for full parse → reason → generate → validate pipeline

---

## 🔹 Frontend
- [ ] Add modularity: split components and reusable hooks
- [ ] Improve UI/UX for model selection and response display
- [ ] Link GitHub repo dynamically (optional)
- [ ] Add loading states for async operations
- [ ] Add frontend component tests

---

## 🔹 Future / Nice-to-Have
- [ ] Batch processing support:
  - File upload (JSON/CSV)
  - Asynchronous processing
  - Progress/status per item
  - Export results (JSON/CSV)
- [ ] Deployment improvements:
  - Environment-based API docs links
  - Authentication/authorization
  - CI/CD pipelines
  -  Docker Compose for local development
  - Environment variable handling (e.g., CUSTOM_MODELS_FILE)
  - Easy deployment on different OS (Windows/Mac/Linux)
