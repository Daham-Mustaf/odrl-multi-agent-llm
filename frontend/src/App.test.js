{/* Reasoner Tab - Shows results automatically after parsing */}
{activeTab === 'reasoner' && (
  <div className="space-y-6 animate-fade-in">
    
    {!reasoningResult ? (
      // No results yet - show placeholder
      <div className={`${cardClass} border rounded-xl shadow-sm overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${textClass}`}>Step 2: Policy Analysis</h2>
          <p className={`text-sm ${mutedTextClass} mt-1`}>
            Review policy validation results
          </p>
        </div>
        <div className={`p-12 text-center ${mutedTextClass}`}>
          <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Please parse text first</p>
          <p className="text-sm mt-2">Go to Parser tab and click "Start Processing"</p>
        </div>
      </div>
    ) : (
      // Show reasoning results
      <>
        <ReasonerTab
          reasoningResult={reasoningResult}
          darkMode={darkMode}
          onCopy={copyToClipboard}
          onDownload={downloadJSON}
          onContinue={() => {
            console.log('[App] User approved - continuing to Generator');
            handleGenerate();
          }}
          onEdit={() => {
            console.log('[App] User wants to edit - returning to Parser');
            setActiveTab('parser');
            showToast('Edit your policy text and click "Start Processing" again', 'info');
          }}
        />

        {/* Footer */}
        <div className={`flex items-center justify-between text-sm ${mutedTextClass}`}>
          <span>Reasoner: Validation & Conflict Detection</span>
          <span>
            {reasoningResult.processing_time_ms}ms • {reasoningResult.model_used}
          </span>
        </div>
      </>
    )}
  </div>
)}