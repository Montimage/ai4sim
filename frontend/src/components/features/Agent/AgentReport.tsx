import React from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../../store/themeStore';
import { useAgentStore } from '../../../store/agentStore';
import { 
  DocumentTextIcon,
  ShareIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const AgentReport: React.FC = () => {
  const theme = useThemeStore((state) => state.theme);
  
  const {
    currentSession
  } = useAgentStore();

  const exportReport = () => {
    if (!currentSession?.finalReport) return;
    
    const report = currentSession.finalReport;
    const reportText = `
RAPPORT DE SÉCURITÉ AI4SIM
==========================

Session: ${currentSession.id}
Cible: ${currentSession.targetIp}
Date: ${currentSession.updatedAt.toLocaleDateString()}

RÉSUMÉ
------
${report.executiveSummary}

NARRATIVE D'ATTAQUE
-------------------
${report.attackNarrative}

PLAN DE REMÉDIATION
-------------------
${report.remediationPlan.map((item: any, index: number) => `
${index + 1}. ${item.vulnerability}
   Fix: ${item.fix}
`).join('\n')}

Généré le ${currentSession.updatedAt.toLocaleString()} par AI4SIM Agent
    `;
    
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai4sim-rapport-${currentSession.targetIp}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareReport = () => {
    if (!currentSession?.finalReport) return;
    
    const summary = `Rapport de sécurité AI4SIM pour ${currentSession.targetIp}: ${currentSession.finalReport.remediationPlan.length} vulnérabilité(s) détectée(s)`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Rapport AI4SIM',
        text: summary,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(summary);
      alert('Résumé copié dans le presse-papiers');
    }
  };

  if (!currentSession) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <DocumentTextIcon className={`w-16 h-16 mx-auto mb-4 ${
            theme === 'light' ? 'text-slate-400' : 'text-gray-500'
          }`} />
          <h3 className={`text-lg font-semibold mb-2 ${
            theme === 'light' ? 'text-slate-700' : 'text-gray-300'
          }`}>
            Aucune session active
          </h3>
          <p className={`text-sm ${
            theme === 'light' ? 'text-slate-500' : 'text-gray-400'
          }`}>
            Créez une session et terminez une exécution pour générer un rapport
          </p>
        </div>
      </div>
    );
  }

  if (!currentSession.finalReport) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ClockIcon className={`w-16 h-16 mx-auto mb-4 ${
            theme === 'light' ? 'text-slate-400' : 'text-gray-500'
          }`} />
          <h3 className={`text-lg font-semibold mb-2 ${
            theme === 'light' ? 'text-slate-700' : 'text-gray-300'
          }`}>
            Rapport en cours de génération
          </h3>
          <p className={`text-sm ${
            theme === 'light' ? 'text-slate-500' : 'text-gray-400'
          }`}>
            Le rapport de sécurité sera disponible une fois l'exécution terminée
          </p>
        </div>
      </div>
    );
  }

  const report = currentSession.finalReport;
  const vulnCounts = {
    total: report.remediationPlan.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  return (
    <div className="h-full overflow-y-auto space-y-6">
      {/* Report Header */}
      <div className={`p-6 rounded-lg border ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className={`text-2xl font-bold ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}>
                Rapport de Sécurité
              </h1>
              <p className={`text-sm ${
                theme === 'light' ? 'text-slate-600' : 'text-gray-400'
              }`}>
                Session: {currentSession.id} | Cible: {currentSession.targetIp}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={shareReport}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                theme === 'light' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <ShareIcon className="w-4 h-4 mr-2" />
              Partager
            </button>
            
            <button
              onClick={exportReport}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                theme === 'light' 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Exporter
            </button>
          </div>
        </div>

        {/* Report Summary */}
        <div className={`p-4 rounded-lg ${
          theme === 'light' ? 'bg-slate-50' : 'bg-slate-700/50'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            theme === 'light' ? 'text-slate-900' : 'text-white'
          }`}>
            Résumé Exécutif
          </h3>
          <p className={theme === 'light' ? 'text-slate-700' : 'text-gray-300'}>
            {report.executiveSummary}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className={`p-4 rounded-lg text-center ${
            theme === 'light' ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-800'
          }`}>
            <div className="text-2xl font-bold text-red-600">
              {vulnCounts.total}
            </div>
            <div className={`text-sm ${
              theme === 'light' ? 'text-red-700' : 'text-red-300'
            }`}>
              Total
            </div>
          </div>
          
          <div className={`p-4 rounded-lg text-center ${
            theme === 'light' ? 'bg-orange-50 border border-orange-200' : 'bg-orange-900/20 border border-orange-800'
          }`}>
            <div className="text-2xl font-bold text-orange-600">
              {vulnCounts.critical}
            </div>
            <div className={`text-sm ${
              theme === 'light' ? 'text-orange-700' : 'text-orange-300'
            }`}>
              Critique
            </div>
          </div>
          
          <div className={`p-4 rounded-lg text-center ${
            theme === 'light' ? 'bg-yellow-50 border border-yellow-200' : 'bg-yellow-900/20 border border-yellow-800'
          }`}>
            <div className="text-2xl font-bold text-yellow-600">
              {vulnCounts.high}
            </div>
            <div className={`text-sm ${
              theme === 'light' ? 'text-yellow-700' : 'text-yellow-300'
            }`}>
              Élevée
            </div>
          </div>
          
          <div className={`p-4 rounded-lg text-center ${
            theme === 'light' ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-800'
          }`}>
            <div className="text-2xl font-bold text-blue-600">
              {vulnCounts.medium}
            </div>
            <div className={`text-sm ${
              theme === 'light' ? 'text-blue-700' : 'text-blue-300'
            }`}>
              Moyenne
            </div>
          </div>
        </div>
      </div>

      {/* Vulnerabilities Section */}
      <div className={`p-6 rounded-lg border ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
      }`}>
        <h2 className={`text-xl font-bold mb-4 ${
          theme === 'light' ? 'text-slate-900' : 'text-white'
        }`}>
          Vulnérabilités Détectées ({report.remediationPlan.length})
        </h2>
        
        <div className="space-y-4">
          {report.remediationPlan.map((vuln: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-700 border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                    <h3 className={`font-semibold ${
                      theme === 'light' ? 'text-slate-900' : 'text-white'
                    }`}>
                      {vuln.vulnerability}
                    </h3>
                  </div>
                  
                  <div className={`text-sm mb-3 ${
                    theme === 'light' ? 'text-slate-600' : 'text-gray-400'
                  }`}>
                    {vuln.fix}
                  </div>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  theme === 'light' ? 'bg-slate-200 text-slate-700' : 'bg-slate-600 text-slate-200'
                }`}>
                  Fix: {vuln.fix}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recommendations Section */}
      <div className={`p-6 rounded-lg border ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-gray-700'
      }`}>
        <h2 className={`text-xl font-bold mb-4 ${
          theme === 'light' ? 'text-slate-900' : 'text-white'
        }`}>
          Recommandations Globales
        </h2>
        
        <div className="space-y-3">
          {report.remediationPlan.map((item: any, index: number) => (
            <div key={index} className={`p-3 rounded-lg ${
              theme === 'light' ? 'bg-slate-50' : 'bg-slate-700/50'
            }`}>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${
                    theme === 'light' ? 'text-slate-700' : 'text-gray-300'
                  }`}>
                    <span className="font-medium">{index + 1}.</span> {item.fix}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className={`p-4 rounded-lg border text-center ${
        theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-700/50 border-gray-600'
      }`}>
        <p className={`text-sm ${
          theme === 'light' ? 'text-slate-600' : 'text-gray-400'
        }`}>
          Rapport généré le {currentSession.updatedAt.toLocaleString()} par AI4SIM Agent
        </p>
      </div>
    </div>
  );
};

export default AgentReport; 