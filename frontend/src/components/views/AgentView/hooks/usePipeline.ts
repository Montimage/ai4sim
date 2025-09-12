import { useAISettingsStore } from '../../../../store/aiSettingsStore';

export const usePipeline = (sessionHooks: any, _addMessageToConversation: any) => {
  const { settings: aiSettings } = useAISettingsStore();
  const { currentSession } = sessionHooks;

  const generateReport = async () => {
    if (!currentSession) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/agents/session/${currentSession.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          aiSettings: {
            provider: aiSettings?.provider || 'google',
            model: aiSettings?.provider === 'google' ? aiSettings.google?.model : 'gemini-2.0-flash',
            baseUrl: aiSettings?.provider === 'google' ? aiSettings.google?.baseUrl : 'https://generativelanguage.googleapis.com',
            apiKey: aiSettings?.provider === 'google' ? aiSettings.google?.apiKey : ''
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const report = data.report;
        
        // Construire un message détaillé avec le rapport intelligent
        let reportMessage = `📊 **RAPPORT DE SÉCURITÉ GÉNÉRÉ PAR IA**

🎯 **Cible :** ${report.target}
📅 **Date :** ${new Date().toLocaleDateString()}
⏱️ **Durée :** ${report.statistiques?.totalExecutionTime ? Math.round(report.statistiques.totalExecutionTime / 1000) : 0}s

📋 **RÉSUMÉ EXÉCUTIF**
${report.executiveSummary || 'Analyse de sécurité terminée'}

📖 **NARRATIVE D'ATTAQUE**
${report.attackNarrative || 'Les outils de pentest ont été exécutés avec succès'}

🛠️ **MÉTHODOLOGIE UTILISÉE**
${report.methodologyUsed?.map((method: string) => `• ${method}`).join('\n') || 'Outils de pentest standards'}

📊 **STATISTIQUES**
• Ports scannés : ${report.statistiques?.totalPortsScanned || 0}
• Ports ouverts : ${report.statistiques?.openPorts || 0}
• Vulnérabilités trouvées : ${report.statistiques?.vulnerabilitiesFound || 0}
• Score de risque : ${report.riskScore || 50}/100

🔍 **VULNÉRABILITÉS IDENTIFIÉES**
${report.findings?.length > 0 ? 
  report.findings.map((finding: any, index: number) => 
    `${index + 1}. **${finding.vulnerability}** (${finding.severity?.toUpperCase()})
   Service : ${finding.service}:${finding.port}
   Impact : ${finding.impact}
   Correction : ${finding.fix}`
  ).join('\n\n') : 
  'Aucune vulnérabilité critique identifiée'
}

🎯 **PLAN DE REMÉDIATION**
${report.remediationPlan?.length > 0 ? 
  report.remediationPlan.map((item: any, index: number) => 
    `${index + 1}. **${item.vulnerability}** (Priorité ${item.priority})
   Effort estimé : ${item.estimatedEffort}
   Impact business : ${item.businessImpact}
   Solution : ${item.fix}`
  ).join('\n\n') : 
  'Aucune remédiation urgente requise'
}

💡 **RECOMMANDATIONS**
${report.recommendations?.map((rec: string) => `• ${rec}`).join('\n') || 'Effectuer des tests de sécurité réguliers'}

🚀 **PROCHAINES ÉTAPES**
${report.nextSteps?.map((step: string) => `• ${step}`).join('\n') || 'Analyser les résultats en détail'}`;

        // Find associated conversation and add message
        // Note: This would need the conversation hooks to find the right conversation
        console.log('Report generated:', reportMessage);
        
        // Créer un lien de téléchargement pour le rapport complet
        const reportBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const reportUrl = URL.createObjectURL(reportBlob);
        const reportLink = document.createElement('a');
        reportLink.href = reportUrl;
        reportLink.download = `ai4sim-rapport-${currentSession.target}-${new Date().toISOString()}.json`;
        reportLink.click();
        URL.revokeObjectURL(reportUrl);
        
        console.log(`📁 **Rapport téléchargé !** Fichier : \`ai4sim-rapport-${currentSession.target}-${new Date().toISOString()}.json\``);
      } else {
        console.error('❌ Report generation failed:', data);
        console.log(`❌ **Erreur lors de la génération du rapport**: ${data.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('❌ Error generating report:', error);
      console.log(`❌ **Erreur lors de la génération du rapport**: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const exportSessionData = async () => {
    if (!currentSession) {
      console.log('❌ Aucune session active pour exporter.');
      return;
    }
    
    console.log('📁 **Export des données en cours...**');
    
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Exporting session data for:', currentSession.id);
      
      const response = await fetch(`/api/agents/session/${currentSession.id}/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Export response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Export failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📁 Export data received:', data);
      
      // Créer un fichier de téléchargement
      const exportBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const exportUrl = URL.createObjectURL(exportBlob);
      const exportLink = document.createElement('a');
      exportLink.href = exportUrl;
      exportLink.download = `pentest-session-${currentSession.id}.json`;
      exportLink.click();
      URL.revokeObjectURL(exportUrl);
      
      console.log(`📁 **Données de session exportées !**

Fichier téléchargé : \`pentest-session-${currentSession.id}.json\`
Contient toutes les données de la session pour analyse externe.`);
    } catch (error) {
      console.error('❌ Error exporting session:', error);
      console.log(`❌ **Erreur lors de l'export**: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  return {
    generateReport,
    exportSessionData
  };
};
