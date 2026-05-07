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
        

        // Créer un lien de téléchargement pour le rapport complet
        const reportBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const reportUrl = URL.createObjectURL(reportBlob);
        const reportLink = document.createElement('a');
        reportLink.href = reportUrl;
        reportLink.download = `mmt-pentester-rapport-${currentSession.target}-${new Date().toISOString()}.json`;
        reportLink.click();
        URL.revokeObjectURL(reportUrl);
      } else {
        console.error('❌ Report generation failed:', data);
      }
    } catch (error) {
      console.error('❌ Error generating report:', error);
    }
  };

  const exportSessionData = async () => {
    if (!currentSession) {
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/agents/session/${currentSession.id}/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Export failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Créer un fichier de téléchargement
      const exportBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const exportUrl = URL.createObjectURL(exportBlob);
      const exportLink = document.createElement('a');
      exportLink.href = exportUrl;
      exportLink.download = `pentest-session-${currentSession.id}.json`;
      exportLink.click();
      URL.revokeObjectURL(exportUrl);
    } catch (error) {
      console.error('❌ Error exporting session:', error);
    }
  };

  return {
    generateReport,
    exportSessionData
  };
};
