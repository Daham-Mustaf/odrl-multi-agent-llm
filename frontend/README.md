```javascript
warnings && validationResult.warnings.length > 0 && (
            <div className="mb-4 p-4 bg-white rounded-lg border border-yellow-300">
              <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Warnings ({validationResult.warnings.length})
              </h4>
              <ul className="space-y-1 text-sm text-yellow-800">
                {validationResult.warnings.map((warning, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-yellow-500">•</span>
                    <span className="flex-1">{warning.message || warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.recommendations && validationResult.recommendations.length > 0 && (
            <div className="p-4 bg-white rounded-lg border border-blue-300">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Recommendations
              </h4>
              <ul className="space-y-1 text-sm text-blue-800">
                {validationResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span className="flex-1">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### **File 16: `src/components/Footer.jsx`**

```javascript
import { RefreshCw } from 'lucide-react';

export function Footer({ 
  parsedData, 
  reasoningResult, 
  generatedODRL, 
  validationResult, 
  advancedMode, 
  singleModel, 
  temperature,
  providerInfo,
  onReset 
}) {
  return (
    <>
      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {parsedData && <span className="text-green-600 font-medium">✓ Parsed</span>}
            {reasoningResult && <span className="text-green-600 font-medium"> → ✓ Reasoned</span>}
            {generatedODRL && <span className="text-green-600 font-medium"> → ✓ Generated</span>}
            {validationResult && (
              <span className={validationResult.is_valid ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {validationResult.is_valid ? ' → ✓ Validated' : ' → ✗ Failed'}
              </span>
            )}
          </div>
          {advancedMode ? (
            <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
              Multi-Model Mode
            </div>
          ) : (
            singleModel && (
              <div className="text-xs text-gray-500">
                {singleModel.split(':')[1]} @ {temperature}
              </div>
            )
          )}
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reset Demo
        </button>
      </div>

      {/* Info Footer */}
      <div className="mt-6 text-center text-sm text-gray-600">
        <p className="font-medium">ODRL Policy Generator • Multi-Agent System</p>
        {providerInfo?.all_providers && (
          <p className="mt-1 text-xs">
            Powered by: {providerInfo.all_providers.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
          </p>
        )}
      </div>
    </>
  );
}
```

---

## **PHASE 5: Main App Component**

### **File 17: `src/App.jsx`**

```javascript
import { useState } from 'react';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { TabNavigation } from './components/TabNavigation';
import { ProviderSettings } from './components/ProviderSettings';
import { CustomLLMModal } from './components/CustomLLMModal';
import { ParserTab } from './components/ParserTab';
import { ReasonerTab } from './components/ReasonerTab';
import { GeneratorTab } from './components/GeneratorTab';
import { ValidatorTab } from './components/ValidatorTab';
import { Footer } from './components/Footer';
import { useBackend } from './hooks/useBackend';
import { useLLMSettings } from './hooks/useLLMSettings';
import { usePolicyWorkflow } from './hooks/usePolicyWorkflow';

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customLLMModalOpen, setCustomLLMModalOpen] = useState(false);

  // Backend connection
  const { providerInfo, loading: backendLoading, connected, error: backendError, retry } = useBackend();

  // LLM settings
  const {
    advancedMode,
    setAdvancedMode,
    settings,
    updateSettings,
    getAvailableModels,
    getModelForAgent
  } = useLLMSettings(providerInfo);

  // Workflow state
  const {
    activeTab,
    setActiveTab,
    inputText,
    setInputText,
    parsedData,
    reasoningResult,
    generatedODRL,
    validationResult,
    loading,
    error,
    handleParse,
    handleReason,
    handleGenerate,
    handleValidate,
    resetDemo
  } = usePolicyWorkflow();

  const availableModels = getAvailableModels();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          
          {/* Header */}
          <Header
            loading={backendLoading}
            connected={connected}
            providerInfo={providerInfo}
            advancedMode={advancedMode}
            onRetry={retry}
          />

          {/* Navigation Tabs */}
          <TabNavigation
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            parsedData={parsedData}
            reasoningResult={reasoningResult}
            generatedODRL={generatedODRL}
          />

          {/* Error Display */}
          <ErrorDisplay error={error || backendError} />

          {/* Content Area */}
          <div className="p-6">
            
            {/* Settings Panel */}
            <ProviderSettings
              isOpen={settingsOpen}
              setIsOpen={setSettingsOpen}
              loading={backendLoading}
              connected={connected}
              providerInfo={providerInfo}
              advancedMode={advancedMode}
              setAdvancedMode={setAdvancedMode}
              settings={settings}
              updateSettings={updateSettings}
              availableModels={availableModels}
              onRetry={retry}
              onAddCustomProvider={() => setCustomLLMModalOpen(true)}
            />

            {/* Tab Content */}
            {activeTab === 'parser' && (
              <ParserTab
                inputText={inputText}
                setInputText={setInputText}
                parsedData={parsedData}
                loading={loading}
                backendConnected={connected}
                modelName={getModelForAgent('parser')?.split(':')[1]}
                onParse={() => handleParse(getModelForAgent('parser'), settings.temperature)}
                onContinue={() => setActiveTab('reasoner')}
              />
            )}

            {activeTab === 'reasoner' && (
              <ReasonerTab
                parsedData={parsedData}
                reasoningResult={reasoningResult}
                loading={loading}
                backendConnected={connected}
                modelName={getModelForAgent('reasoner')?.split(':')[1]}
                onReason={() => handleReason(getModelForAgent('reasoner'), settings.temperature)}
                onContinue={() => setActiveTab('generator')}
              />
            )}

            {activeTab === 'generator' && (
              <GeneratorTab
                reasoningResult={reasoningResult}
                generatedODRL={generatedODRL}
                loading={loading}
                backendConnected={connected}
                modelName={getModelForAgent('generator')?.split(':')[1]}
                onGenerate={() => handleGenerate(getModelForAgent('generator'), settings.temperature)}
                onContinue={() => setActiveTab('validator')}
              />
            )}

            {activeTab === 'validator' && (
              <ValidatorTab
                generatedODRL={generatedODRL}
                validationResult={validationResult}
                loading={loading}
                backendConnected={connected}
                modelName={getModelForAgent('validator')?.split(':')[1]}
                onValidate={() => handleValidate(getModelForAgent('validator'), settings.temperature)}
              />
            )}
          </div>

          {/* Footer */}
          <Footer
            parsedData={parsedData}
            reasoningResult={reasoningResult}
            generatedODRL={generatedODRL}
            validationResult={validationResult}
            advancedMode={advancedMode}
            singleModel={settings.singleModel}
            temperature={settings.temperature}
            providerInfo={providerInfo}
            onReset={resetDemo}
          />
        </div>

        {/* Custom LLM Modal */}
        <CustomLLMModal
          isOpen={customLLMModalOpen}
          onClose={() => setCustomLLMModalOpen(false)}
          onSuccess={() => {
            retry(); // Refresh provider list
            setCustomLLMModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}

export default App;
```

---

### **File 18: `src/main.jsx`** (Keep as is, or verify)

```javascript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

## **PHASE 6: Testing & Verification**

### **Step 1: Clean up old file**

If you had everything in one file before, **remove or rename your old App.jsx**:

```bash
# Backup old file
mv src/App.jsx src/App.old.jsx
```

### **Step 2: Install dependencies (if needed)**

```bash
npm install
# or
yarn install
```

### **Step 3: Start the development server**

```bash
npm run dev
# or
yarn dev
```

### **Step 4: Test the Custom LLM Feature**

1. **Start your backend**:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Open the frontend** in your browser

3. **Click "LLM Configuration"** to expand settings

4. **Click "Add Custom"** button (purple button next to "Available Providers")

5. **Fill in the form**:
   - Name: `lm-studio`
   - Type: `openai_compatible`
   - Base URL: `http://localhost:1234/v1`
   - Model: `llama-3-8b-instruct`

6. **Click "Add Provider"**

7. The provider should now appear in your dropdown!

---

## **PHASE 7: File Structure Verification**

Your final structure should look like this:

```
src/
├── components/
│   ├── Header.jsx                ✅
│   ├── ErrorDisplay.jsx          ✅
│   ├── TabNavigation.jsx         ✅
│   ├── ExampleCards.jsx          ✅
│   ├── ProviderSettings.jsx      ✅
│   ├── CustomLLMModal.jsx        ✅ (NEW!)
│   ├── ParserTab.jsx             ✅
│   ├── ReasonerTab.jsx           ✅
│   ├── GeneratorTab.jsx          ✅
│   ├── ValidatorTab.jsx          ✅
│   └── Footer.jsx                ✅
│
├── hooks/
│   ├── useBackend.js             ✅
│   ├── useLLMSettings.js         ✅
│   └── usePolicyWorkflow.js      ✅
│
├── services/
│   └── api.js                    ✅
│
├── constants/
│   └── models.js                 ✅
│
├── App.jsx                       ✅ (NEW - much smaller!)
├── main.jsx                      ✅
└── index.css                     (keep your existing styles)
```

---

## **Benefits of This Structure**

✅ **Maintainable**: Each component has a single responsibility  
✅ **Reusable**: Components can be used in different contexts  
✅ **Testable**: Easy to write unit tests for each component  
✅ **Scalable**: Easy to add new features (like custom LLMs!)  
✅ **Clean**: Main App.jsx is now only ~150 lines instead of 1000+  
✅ **Professional**: Industry-standard React project structure  

---

## **What's New?**

1. **Custom LLM Modal**: Users can now add their own LLM providers
2. **Modular Architecture**: Code is split into logical, manageable pieces
3. **Custom Hooks**: State management is separated from UI
4. **API Service Layer**: All API calls are centralized
5. **Constants File**: Model configurations are in one place

---

## **Next Steps**

Want me to:
1. Add more custom LLM provider templates (Azure OpenAI, AWS Bedrock, etc.)?
2. Add validation for the custom LLM form?
3. Add a "Test Connection" button for custom LLMs?
4. Create a settings page to manage all custom providers?
5. Add export/import for LLM configurations?

Let me know what you'd like to add next! 🚀






# 🎯 Summary Prompt for Next Chat

Copy this prompt to continue in a new chat:

---

## Project Context: ODRL Policy Generator Demo

**What we built:** A research demo paper system with a React GUI frontend and FastAPI backend using LangChain + LangGraph for generating ODRL policies through a 4-agent pipeline (Parser → Reasoner → Generator → SHACL Validator).

### ✅ What We Accomplished:

1. **Multi-Deployment Architecture** - System supports 3 modes:
   - **FITS Server** (My development): Uses Fraunhofer DGX server at `http://dgx.fit.fraunhofer.de/v1` - NO API key needed
   - **Local Ollama** (For reviewers/users): Self-hosted models
   - **Cloud APIs** (Custom): Groq/OpenAI/Anthropic for users with API keys

2. **Backend Structure:**
   - `backend/utils/llm_factory.py` - Universal LLM factory supporting all 3 modes
   - `backend/api/main.py` - FastAPI with `/api/provider-info` endpoint
   - `backend/agents/` - TextParser, Reasoner, Generator, Validator (use LLMFactory)
   - `backend/.env` - Configuration: `DEPLOYMENT_MODE=fits_server`, `FITS_SERVER_URL=http://dgx.fit.fraunhofer.de/v1`
   - `backend/test_quick.py` - Test script (working ✅)

3. **Frontend (React GUI):**
   - Complete ODRL demo interface
   - Dynamic model detection from backend
   - Per-agent model selection (Advanced mode)
   - Settings panel with temperature control

### 🔧 Current Files Status:

**Working:**
- ✅ `backend/utils/llm_factory.py` - Handles FITS/Local/Cloud routing
- ✅ `backend/.env` - FITS server configured correctly
- ✅ `backend/test_quick.py` - All tests pass (FITS connection working)
- ✅ Backend API returns correct data: `{"provider":"ollama","available_models":["llama3.1:8b","llama3.1:70b","deepseek-r1:70b",...], "deployment_mode":"fits_server"}`

**Current Issue:**
- ❌ GUI shows "No LLM Providers Available" despite backend returning correct data
- The GUI's `getAvailableModels()` function isn't properly parsing the backend response
- Models should appear as: `ollama:llama3.1:8b`, `ollama:llama3.1:70b`, etc. (then routed to FITS by backend)

### 🎯 What Needs Fixing:

**Problem:** GUI receives provider info but model dropdown shows "No LLM Providers Available"

**Root Cause:** The GUI's model detection logic in the React component doesn't correctly map the backend's `available_models` array to the dropdown options.

**Backend returns:**
```json
{
  "provider": "ollama",
  "available_models": ["llama3.1:8b", "llama3.1:70b", "deepseek-r1:70b", ...],
  "deployment_mode": "fits_server"
}
```

**GUI needs to:**
1. Take `available_models` array from backend
2. Prefix each with `ollama:` (e.g., `ollama:llama3.1:8b`)
3. Populate dropdown with these options
4. When user selects a model, send it to backend (e.g., `ollama:llama3.1:8b`)
5. Backend's LLMFactory sees `DEPLOYMENT_MODE=fits_server` and routes to FITS server

### 📁 Key Files to Focus On:

1. **GUI Component** (React artifact ID: `odrl_final_gui`):
   - `getAvailableModels()` function - needs to properly parse backend response
   - `detectProvider()` function - should set default model from backend

2. **Backend** (working correctly):
   - `/api/provider-info` endpoint returns correct data
   - LLMFactory routes based on `DEPLOYMENT_MODE`

### 🔧 Environment Setup:

```bash
# backend/.env (CURRENT CONFIG - WORKING)
DEPLOYMENT_MODE=fits_server
FITS_SERVER_URL=http://dgx.fit.fraunhofer.de/v1
FITS_API_KEY=not_needed
DEFAULT_MODEL=llama3.1:8b
DEFAULT_TEMPERATURE=0.3
MAX_TOKENS=4096
```

### 🚀 Next Steps Needed:

1. Fix GUI's `getAvailableModels()` to correctly parse backend's `available_models` array
2. Ensure models show in dropdown with `ollama:` prefix
3. Test full pipeline: GUI → Backend → FITS server → Response

### 💡 Important Notes:

- FITS server doesn't need an API key (uses `"not_needed"`)
- Backend correctly routes `ollama:modelname` to FITS when in `fits_server` mode
- All 4 agents (Parser, Reasoner, Generator, Validator) use the same LLMFactory
- Test script confirms FITS connection works perfectly
- Issue is purely frontend - backend is 100% functional

---

**Use this prompt to continue where we left off!** 🎯