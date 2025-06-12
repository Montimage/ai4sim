import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ExecutionRecord } from '../../../../services/executionHistoryService';
import aiAnalysisService, { AIAnalysisResult } from '../../../../services/aiAnalysisService';
import { CpuChipIcon, CloudIcon, InformationCircleIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useAISettingsStore } from '../../../../store/aiSettingsStore';
import { Scenario } from '../../../../types/projectManagement';

interface AIAnalysisPanelProps {
  execution: ExecutionRecord;
  scenario: Scenario;
}

const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ execution, scenario }) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const aiSettings = useAISettingsStore(state => state.settings);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load analysis
  const loadAnalysis = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setIsFromCache(false);

    try {
      console.log('Starting AI analysis for execution:', execution.id);
      
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedAnalysis = await aiAnalysisService.getCachedAnalysis(execution.id, false);
        if (cachedAnalysis) {
          console.log('Using cached AI analysis');
          setAnalysis(cachedAnalysis);
          setIsFromCache(true);
          setIsLoading(false);
          return;
        }
      }
      
      // If forcing refresh, invalidate cache first
      if (forceRefresh) {
        aiAnalysisService.invalidateExecutionCache(execution.id);
      }
      
      const result = await aiAnalysisService.analyzeExecution(execution, false); // Without Wazuh for basic analysis
      console.log('AI analysis completed successfully');
      setAnalysis(result);
      setIsFromCache(false);
    } catch (err) {
      console.error('AI analysis failed:', err);
      
      // Améliorer le message d'erreur selon le type d'erreur
      let errorMessage = 'Failed to load analysis';
      let errorDetails = '';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Détecter les erreurs de parsing JSON spécifiques
        if (err.message.includes('JSON') || err.message.includes('parse')) {
          errorMessage = 'AI response format error - JSON parsing failed';
          errorDetails = 'The AI service returned malformed data. This usually resolves itself on retry.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'AI analysis timed out';
          errorDetails = aiSettings.provider === 'ollama' 
            ? 'Local AI processing took too long. Try using a smaller model or ensure sufficient system resources.'
            : 'The AI service took too long to respond. Please try again.';
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network connection error';
          errorDetails = 'Unable to connect to the AI service. Check your internet connection and API settings.';
        }
      }
      
      setError(errorMessage);
      
      // Log des détails supplémentaires pour le débogage
      if (errorDetails) {
        console.warn('Error details:', errorDetails);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, [execution.id]);

  const getAnalysisStatusIcon = (status: 'success' | 'failed' | 'partial') => {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'partial': return '⚠️';
      default: return '❓';
    }
  };

  const getAnalysisStatusClass = (status: 'success' | 'failed' | 'partial') => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'partial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getProviderIcon = (provider: string) => {
    return provider === 'ollama' ? CpuChipIcon : CloudIcon;
  };

  const getProviderColor = (provider: string) => {
    return provider === 'ollama' ? 'text-green-500' : 'text-blue-500';
  };

  // Export to PDF function
  const exportToPDF = async () => {
    if (!analysis || !contentRef.current) return;

    setIsExporting(true);
    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      // Create a hidden clone of the element for PDF rendering
      const originalElement = contentRef.current;
      const clonedElement = originalElement.cloneNode(true) as HTMLElement;
      
      // Style the clone for PDF (positioned off-screen but visible for html2canvas)
      clonedElement.style.cssText = `
        position: fixed !important;
        top: -9999px !important;
        left: -9999px !important;
        width: 720px !important;
        height: auto !important;
        background-color: white !important;
        color: black !important;
        font-family: Arial, sans-serif !important;
        line-height: 1.6 !important;
        padding: 18px !important;
        max-width: none !important;
        box-shadow: none !important;
        z-index: -1000 !important;
        visibility: visible !important;
        opacity: 1 !important;
        overflow: visible !important;
        transform: scale(0.8) !important;
        transform-origin: top left !important;
      `;

      // Apply PDF-friendly styles to all child elements in the clone
      const allElements = clonedElement.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        
        // Force light theme colors
        htmlEl.style.cssText += `
          background-color: white !important;
          color: black !important;
          border-color: #e5e7eb !important;
          box-shadow: none !important;
        `;
        
        // Handle specific dark mode classes
        if (htmlEl.classList.contains('dark:bg-gray-900') || 
            htmlEl.classList.contains('dark:bg-gray-800') ||
            htmlEl.classList.contains('bg-gray-900') ||
            htmlEl.classList.contains('bg-gray-800')) {
          htmlEl.style.backgroundColor = 'white !important';
        }
        
        if (htmlEl.classList.contains('dark:text-gray-200') || 
            htmlEl.classList.contains('dark:text-gray-300') ||
            htmlEl.classList.contains('text-gray-200') ||
            htmlEl.classList.contains('text-gray-300')) {
          htmlEl.style.color = 'black !important';
        }
      });

      // Add clone to document temporarily
      document.body.appendChild(clonedElement);

      // Wait for styles to apply and fonts to load
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 720,
        height: clonedElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        ignoreElements: (element) => {
          // Ignore elements that might cause issues
          return element.classList.contains('animate-spin') || 
                 element.tagName === 'BUTTON' ||
                 element.classList.contains('hidden');
        }
      });

      // Remove the clone immediately after capture
      document.body.removeChild(clonedElement);

      // Check if canvas has content
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Failed to capture content - canvas is empty');
      }

      const imgData = canvas.toDataURL('image/png');
      
      // Check if image data is valid
      if (imgData === 'data:,') {
        throw new Error('Failed to generate image data');
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 171; // A4 width in mm with margins, réduit de 10%
      const pageHeight = 277; // A4 height in mm with margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10; // Top margin

      // Add first page with margins (centré horizontalement)
      const xOffset = (210 - imgWidth) / 2; // Centrer sur la page A4 (210mm de largeur)
      pdf.addImage(imgData, 'PNG', xOffset, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', xOffset, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with scenario name and date
      const date = format(new Date(), 'yyyy-MM-dd_HH-mm');
      const scenarioName = scenario.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `AI_Analysis_${scenarioName}_${date}.pdf`;

      pdf.save(filename);
      
      // Show success message
      setSuccessMessage(`PDF exported successfully: ${filename}`);
      setError(null);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSuccessMessage(null);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
          AI Analysis Report
        </h2>
        <div className="flex space-x-3">
          {/* Export PDF Button */}
          <button
            onClick={exportToPDF}
            disabled={isExporting || !analysis}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="w-4 h-4" />
                <span>Export PDF</span>
              </>
            )}
          </button>
          
          {/* Refresh Button */}
          <button
            onClick={() => loadAnalysis(true)}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>Analyzing...</span>
              </div>
            ) : (
              '🔄 Refresh Analysis'
            )}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">Export Successful</h4>
              <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Ollama Performance Notice */}
      {aiSettings.provider === 'ollama' && isLoading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                Local AI Processing in Progress
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                Ollama is processing your request locally. This may take 3-10 minutes depending on your system and the model used.
                Local processing ensures complete privacy of your data.
              </p>
              <div className="text-xs text-blue-700 dark:text-blue-400">
                <p><strong>Recommended models for better results:</strong></p>
                <p>• llama3.2:latest or llama3.1:latest (optimal performance)</p>
                <p>• mistral:latest (good speed/quality balance)</p>
                <p>• qwen2.5:latest (excellent for technical analysis)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">Analysis Error</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-2">{error}</p>
              
              {/* Conseils spécifiques selon le type d'erreur */}
              {error.includes('JSON parsing failed') && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded p-3 mt-2">
                  <h5 className="font-medium text-red-800 dark:text-red-200 text-sm mb-1">💡 Troubleshooting Tips:</h5>
                  <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                    <li>• Click "Refresh Analysis" to retry with a new AI request</li>
                    <li>• The AI service may have returned incomplete data - this usually resolves on retry</li>
                    <li>• If the problem persists, try switching to a different AI provider in settings</li>
                  </ul>
                </div>
              )}
              
              {error.includes('timeout') && aiSettings.provider === 'ollama' && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded p-3 mt-2">
                  <h5 className="font-medium text-red-800 dark:text-red-200 text-sm mb-1">💡 Conseils de Performance Ollama :</h5>
                  <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                    <li>• <strong>Modèles recommandés :</strong> llama3.2:latest, mistral:latest, qwen2.5:latest</li>
                    <li>• <strong>Éviter :</strong> Les modèles très volumineux (&gt;13B) sur des systèmes avec moins de 16GB RAM</li>
                    <li>• <strong>RAM :</strong> Minimum 8GB, recommandé 16GB+ pour les gros modèles</li>
                    <li>• <strong>Alternative :</strong> Utiliser OpenRouter pour une analyse plus rapide</li>
                    <li>• <strong>Vérifier :</strong> Que le modèle est bien téléchargé avec `ollama list`</li>
                  </ul>
                </div>
              )}
              
              {error.includes('Network connection error') && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded p-3 mt-2">
                  <h5 className="font-medium text-red-800 dark:text-red-200 text-sm mb-1">💡 Connection Tips:</h5>
                  <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                    <li>• Check your internet connection</li>
                    <li>• Verify API keys in AI settings</li>
                    <li>• Ensure the AI service URL is correct</li>
                    <li>• Try switching to a different AI provider</li>
                  </ul>
                </div>
              )}
              
              <div className="mt-3">
                <button
                  onClick={() => loadAnalysis(true)}
                  disabled={isLoading}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Retrying...' : '🔄 Retry Analysis'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis content */}
      {analysis ? (
        <div ref={contentRef} className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg">
          {/* Provider and Model Info */}
          {analysis.provider && analysis.model && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {React.createElement(getProviderIcon(analysis.provider), {
                    className: `w-5 h-5 ${getProviderColor(analysis.provider)}`
                  })}
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Analyzed with {analysis.provider === 'ollama' ? 'Ollama' : 'OpenRouter'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      • Model: {analysis.model}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      • {format(analysis.timestamp, 'dd/MM/yyyy HH:mm', { locale: enUS })}
                    </span>
                  </div>
                </div>
                {isFromCache && (
                  <div className="flex items-center space-x-2 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                      Cached
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PDF Header - Only visible in PDF */}
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">AI Security Analysis Report</h1>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Scenario:</strong> {scenario.name}</p>
              <p><strong>Execution ID:</strong> {execution.id}</p>
              <p><strong>Generated:</strong> {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: enUS })}</p>
              {analysis.provider && analysis.model && (
                <p><strong>AI Provider:</strong> {analysis.provider === 'ollama' ? 'Ollama' : 'OpenRouter'} - {analysis.model}</p>
              )}
            </div>
            <hr className="my-4" />
          </div>

          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b pb-2">
            🤖 AI-Powered Security Analysis
          </h3>

          {/* Executive Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700 p-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              📋 Executive Summary
            </h4>
            <p className="text-gray-800 dark:text-gray-200">{analysis.summary}</p>
          </div>

          {/* Attack Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700 p-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              ⚔️ Attack Analysis
            </h4>
            <div className="space-y-3">
              {analysis.attacksAnalysis.map((attackAnalysis, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-800 dark:text-gray-200">
                      {attackAnalysis.attackName} ({attackAnalysis.tool})
                    </h5>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAnalysisStatusClass(attackAnalysis.status)}`}>
                      {getAnalysisStatusIcon(attackAnalysis.status)} {attackAnalysis.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{attackAnalysis.analysis}</p>
                  {attackAnalysis.recommendations && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-sm">
                      <strong className="text-blue-900 dark:text-blue-200">💡 Recommendations:</strong> 
                      <span className="text-blue-800 dark:text-blue-300"> {attackAnalysis.recommendations}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Overall Assessment */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700 p-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              🎯 Overall Assessment
            </h4>
            <p className="text-gray-800 dark:text-gray-200">{analysis.overallAssessment}</p>
          </div>

          {/* Security Implications */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700 p-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              🔒 Security Implications
            </h4>
            <p className="text-gray-800 dark:text-gray-200">{analysis.securityImplications}</p>
          </div>

          {/* Next Steps */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700 p-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              🚀 Recommended Next Steps
            </h4>
            <ul className="space-y-2">
              {analysis.nextSteps.map((step, index) => (
                <li key={index} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 mr-2 font-bold">{index + 1}.</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700 p-6 text-center">
          {isLoading ? (
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Loading AI analysis...</span>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                AI Analysis Not Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Click "Refresh Analysis" to generate a new AI-powered security report
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAnalysisPanel; 