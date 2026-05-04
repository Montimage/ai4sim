import puppeteer, { Browser } from 'puppeteer';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

export interface SecurityReport {
  sessionId: string;
  target: string;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  tools: string[];
  results: Record<string, any>;
  executiveSummary: string;
  attackNarrative: string;
  methodologyUsed: string[];
  findings: Array<{
    id: string;
    vulnerability: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    service: string;
    port: number;
    description: string;
    impact: string;
    evidence: string[];
    fix: string;
    cve?: string;
    cwe?: string;
    references?: string[];
    latestSolutions?: string[];
  }>;
  statistiques: {
    totalPortsScanned: number;
    openPorts: number;
    vulnerabilitiesFound: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
  };
  remediationPlan: Array<{
    priority: number;
    vulnerability: string;
    fix: string;
    estimatedEffort: string;
    businessImpact: string;
    internetResearch?: string;
    officialDocs?: string[];
  }>;
  recommendations: string[];
  riskScore: number;
  nextSteps: string[];
  internetEnrichment?: {
    sources: string[];
    lastUpdated: string;
    credibility: string;
  };
}

export class PDFService {
  private browser: Browser | null = null;

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async generateSecurityReportPDF(report: SecurityReport): Promise<string> {
    await this.initialize();
    
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    // Créer le HTML du rapport
    const html = this.generateReportHTML(report);
    
    await page.setContent(html);
    
    // Créer le dossier reports s'il n'existe pas
    const reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const filename = `mmt-pentester-rapport-securite-${report.target}-${new Date().toISOString().split('T')[0]}.pdf`;
    const filepath = path.join(reportsDir, filename);
    
    await page.pdf({
      path: filepath,
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    });
    
    await page.close();
    
    logger.info(`PDF généré: ${filepath}`);
    return filepath;
  }

  private generateReportHTML(report: SecurityReport): string {
    const severityColors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#d97706',
      low: '#059669'
    };

    const findingsHTML = report.findings.map(finding => `
      <div class="finding" style="border-left: 4px solid ${severityColors[finding.severity]}; padding: 15px; margin: 10px 0; background: #f8f9fa;">
        <h4 style="margin: 0 0 10px 0; color: ${severityColors[finding.severity]};">${finding.vulnerability}</h4>
        <p><strong>Sévérité:</strong> <span style="color: ${severityColors[finding.severity]}; font-weight: bold;">${finding.severity.toUpperCase()}</span></p>
        <p><strong>Service:</strong> ${finding.service}:${finding.port}</p>
        <p><strong>Description:</strong> ${finding.description}</p>
        <p><strong>Impact:</strong> ${finding.impact}</p>
        <p><strong>Correction:</strong> ${finding.fix}</p>
        ${finding.cve ? `<p><strong>CVE:</strong> ${finding.cve}</p>` : ''}
        ${finding.cwe ? `<p><strong>CWE:</strong> ${finding.cwe}</p>` : ''}
        ${finding.latestSolutions && finding.latestSolutions.length > 0 ? 
          `<p><strong>Solutions récentes:</strong> ${finding.latestSolutions.join(', ')}</p>` : ''}
      </div>
    `).join('');

    const remediationHTML = report.remediationPlan.map(item => `
      <div class="remediation-item" style="border: 1px solid #e5e7eb; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h4 style="margin: 0 0 10px 0;">Priorité ${item.priority}: ${item.vulnerability}</h4>
        <p><strong>Effort estimé:</strong> ${item.estimatedEffort}</p>
        <p><strong>Impact business:</strong> ${item.businessImpact}</p>
        <p><strong>Solution:</strong> ${item.fix}</p>
        ${item.internetResearch ? `<p><strong>Recherche internet:</strong> ${item.internetResearch}</p>` : ''}
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Rapport de Sécurité - ${report.target}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .section { margin: 20px 0; }
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
          .stat-card { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
          .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
          .recommendations { background: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .next-steps { background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .risk-score { font-size: 3em; font-weight: bold; text-align: center; margin: 20px 0; }
          .risk-critical { color: #dc2626; }
          .risk-high { color: #ea580c; }
          .risk-medium { color: #d97706; }
          .risk-low { color: #059669; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔒 Rapport de Sécurité MMT-Pentester</h1>
          <h2>Cible: ${report.target}</h2>
          <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        </div>

        <div class="section">
          <h3>📊 Résumé Exécutif</h3>
          <p>${report.executiveSummary}</p>
        </div>

        <div class="section">
          <h3>🎯 Score de Risque</h3>
          <div class="risk-score ${report.riskScore >= 80 ? 'risk-critical' : report.riskScore >= 60 ? 'risk-high' : report.riskScore >= 40 ? 'risk-medium' : 'risk-low'}">
            ${report.riskScore}/100
          </div>
        </div>

        <div class="section">
          <h3>📈 Statistiques</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${report.statistiques.totalPortsScanned}</div>
              <div>Ports scannés</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${report.statistiques.openPorts}</div>
              <div>Ports ouverts</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${report.statistiques.vulnerabilitiesFound}</div>
              <div>Vulnérabilités trouvées</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${report.statistiques.criticalFindings}</div>
              <div>Critiques</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>🔍 Vulnérabilités Identifiées</h3>
          ${findingsHTML}
        </div>

        <div class="section">
          <h3>🛠️ Plan de Remédiation</h3>
          ${remediationHTML}
        </div>

        <div class="section">
          <h3>💡 Recommandations</h3>
          <div class="recommendations">
            ${report.recommendations.map(rec => `<p>• ${rec}</p>`).join('')}
          </div>
        </div>

        <div class="section">
          <h3>🚀 Prochaines Étapes</h3>
          <div class="next-steps">
            ${report.nextSteps.map(step => `<p>• ${step}</p>`).join('')}
          </div>
        </div>

        <div class="section">
          <h3>📋 Détails Techniques</h3>
          <p><strong>Session ID:</strong> ${report.sessionId}</p>
          <p><strong>Outils utilisés:</strong> ${report.tools.join(', ')}</p>
          <p><strong>Début:</strong> ${report.startedAt.toLocaleString('fr-FR')}</p>
          ${report.completedAt ? `<p><strong>Fin:</strong> ${report.completedAt.toLocaleString('fr-FR')}</p>` : ''}
        </div>

        <footer style="text-align: center; margin-top: 40px; padding: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
          <p>Rapport généré automatiquement par MMT-Pentester Agent Pro</p>
          <p>Enrichi par recherche internet pour les solutions les plus récentes</p>
        </footer>
      </body>
      </html>
    `;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const pdfService = new PDFService(); 