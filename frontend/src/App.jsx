// import { useState } from 'react';
// import { Header } from './components/Header';
// import { ErrorDisplay } from './components/ErrorDisplay';
// import { TabNavigation } from './components/TabNavigation';
// import { ProviderSettings } from './components/ProviderSettings';
// import { CustomLLMModal } from './components/CustomLLMModal';
// import { ParserTab } from './components/ParserTab';
// import { ReasonerTab } from './components/ReasonerTab';
// import { GeneratorTab } from './components/GeneratorTab';
// import { ValidatorTab } from './components/ValidatorTab';
// import { Footer } from './components/Footer';
// import { useBackend } from './hooks/useBackend';
// import { useLLMSettings } from './hooks/useLLMSettings';
// import { usePolicyWorkflow } from './hooks/usePolicyWorkflow';

// function App() {
//   const [settingsOpen, setSettingsOpen] = useState(false);
//   const [customLLMModalOpen, setCustomLLMModalOpen] = useState(false);

//   // Backend connection
//   const { providerInfo, loading: backendLoading, connected, error: backendError, retry } = useBackend();

//   // LLM settings
//   const {
//     advancedMode,
//     setAdvancedMode,
//     settings,
//     updateSettings,
//     getAvailableModels,
//     getModelForAgent
//   } = useLLMSettings(providerInfo);

//   // Workflow state
//   const {
//     activeTab,
//     setActiveTab,
//     inputText,
//     setInputText,
//     parsedData,
//     reasoningResult,
//     generatedODRL,
//     validationResult,
//     loading,
//     error,
//     handleParse,
//     handleReason,
//     handleGenerate,
//     handleValidate,
//     resetDemo
//   } = usePolicyWorkflow();

//   const availableModels = getAvailableModels();

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
//       <div className="max-w-7xl mx-auto">
//         <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          
//           {/* Header */}
//           <Header
//             loading={backendLoading}
//             connected={connected}
//             providerInfo={providerInfo}
//             advancedMode={advancedMode}
//             onRetry={retry}
//           />

//           {/* Navigation Tabs */}
//           <TabNavigation
//             activeTab={activeTab}
//             setActiveTab={setActiveTab}
//             parsedData={parsedData}
//             reasoningResult={reasoningResult}
//             generatedODRL={generatedODRL}
//           />

//           {/* Error Display */}
//           <ErrorDisplay error={error || backendError} />

//           {/* Content Area */}
//           <div className="p-6">
            
//             {/* Settings Panel */}
//             <ProviderSettings
//               isOpen={settingsOpen}
//               setIsOpen={setSettingsOpen}
//               loading={backendLoading}
//               connected={connected}
//               providerInfo={providerInfo}
//               advancedMode={advancedMode}
//               setAdvancedMode={setAdvancedMode}
//               settings={settings}
//               updateSettings={updateSettings}
//               availableModels={availableModels}
//               onRetry={retry}
//               onAddCustomProvider={() => setCustomLLMModalOpen(true)}
//             />

//             {/* Tab Content */}
//             {activeTab === 'parser' && (
//               <ParserTab
//                 inputText={inputText}
//                 setInputText={setInputText}
//                 parsedData={parsedData}
//                 loading={loading}
//                 backendConnected={connected}
//                 modelName={getModelForAgent('parser')?.split(':')[1]}
//                 onParse={() => handleParse(getModelForAgent('parser'), settings.temperature)}
//                 onContinue={() => setActiveTab('reasoner')}
//               />
//             )}

//             {activeTab === 'reasoner' && (
//               <ReasonerTab
//                 parsedData={parsedData}
//                 reasoningResult={reasoningResult}
//                 loading={loading}
//                 backendConnected={connected}
//                 modelName={getModelForAgent('reasoner')?.split(':')[1]}
//                 onReason={() => handleReason(getModelForAgent('reasoner'), settings.temperature)}
//                 onContinue={() => setActiveTab('generator')}
//               />
//             )}

//             {activeTab === 'generator' && (
//               <GeneratorTab
//                 reasoningResult={reasoningResult}
//                 generatedODRL={generatedODRL}
//                 loading={loading}
//                 backendConnected={connected}
//                 modelName={getModelForAgent('generator')?.split(':')[1]}
//                 onGenerate={() => handleGenerate(getModelForAgent('generator'), settings.temperature)}
//                 onContinue={() => setActiveTab('validator')}
//               />
//             )}

//             {activeTab === 'validator' && (
//               <ValidatorTab
//                 generatedODRL={generatedODRL}
//                 validationResult={validationResult}
//                 loading={loading}
//                 backendConnected={connected}
//                 modelName={getModelForAgent('validator')?.split(':')[1]}
//                 onValidate={() => handleValidate(getModelForAgent('validator'), settings.temperature)}
//               />
//             )}
//           </div>

//           {/* Footer */}
//           <Footer
//             parsedData={parsedData}
//             reasoningResult={reasoningResult}
//             generatedODRL={generatedODRL}
//             validationResult={validationResult}
//             advancedMode={advancedMode}
//             singleModel={settings.singleModel}
//             temperature={settings.temperature}
//             providerInfo={providerInfo}
//             onReset={resetDemo}
//           />
//         </div>

//         {/* Custom LLM Modal */}
//         <CustomLLMModal
//           isOpen={customLLMModalOpen}
//           onClose={() => setCustomLLMModalOpen(false)}
//           onSuccess={() => {
//             retry(); // Refresh provider list
//             setCustomLLMModalOpen(false);
//           }}
//         />
//       </div>
//     </div>
//   );
// }

// export default App;