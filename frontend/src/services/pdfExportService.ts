import { ExecutionRecord } from './executionHistoryService';
import { getToolDisplayName, getAttackDisplayNameFromParams } from '../constants/toolMapping';

interface PDFExportOptions {
  includeDetails?: boolean;
  includeLogs?: boolean;
  includeParameters?: boolean;
  includeAIAnalysis?: boolean;
}

class PDFExportService {
  private static instance: PDFExportService;
  
  public static getInstance(): PDFExportService {
    if (!PDFExportService.instance) {
      PDFExportService.instance = new PDFExportService();
    }
    return PDFExportService.instance;
  }

  /**
   * Exporte un rapport d'exécution en PDF
   */
  async exportExecutionReport(
    execution: ExecutionRecord & { projectName?: string; campaignName?: string },
    options: PDFExportOptions = {},
    aiAnalysis?: string
  ): Promise<void> {
    const {
      includeLogs = true,
      includeParameters = true,
      includeAIAnalysis = true
    } = options;

    try {
      // Dynamically import jsPDF to avoid bundle size issues
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const lineHeight = 7;

      // Helper function to add text with page break handling
      const addText = (text: string, x: number, fontSize: number = 12, style: 'normal' | 'bold' = 'normal') => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        
        doc.setFontSize(fontSize);
        if (style === 'bold') {
          doc.setFont(undefined, 'bold');
        } else {
          doc.setFont(undefined, 'normal');
        }
        
        doc.text(text, x, yPosition);
        yPosition += lineHeight;
      };

      const addSection = (title: string) => {
        yPosition += 5;
        addText(title, margin, 14, 'bold');
        yPosition += 3;
      };

      // Title
      addText('Execution Report', margin, 18, 'bold');
      yPosition += 10;

      // Basic Information
      addSection('General Information');
      addText(`Scenario: ${execution.scenarioName}`, margin + 5);
      addText(`Project: ${execution.projectName || 'Unknown'}`, margin + 5);
      addText(`Campaign: ${execution.campaignName || 'Unknown'}`, margin + 5);
      addText(`Status: ${this.translateStatus(execution.status)}`, margin + 5);
      addText(`Start Time: ${new Date(execution.startTime).toLocaleString()}`, margin + 5);
      if (execution.endTime) {
        addText(`End Time: ${new Date(execution.endTime).toLocaleString()}`, margin + 5);
        const duration = this.formatDuration(execution.startTime, execution.endTime);
        addText(`Duration: ${duration}`, margin + 5);
      }

      // Targets
      addSection('Targets');
      execution.targets.forEach((target, index) => {
        addText(`${index + 1}. ${target.name} (${target.host}${target.port ? `:${target.port}` : ''})`, margin + 5);
      });

      // Attacks with detailed outputs
      addSection('Attacks');
      execution.attacks.forEach((attack, index) => {
        const toolDisplayName = getToolDisplayName(attack.tool);
        const attackDisplayName = getAttackDisplayNameFromParams(
          attack.tool,
          attack.parameters?.attackId,
          attack.parameters
        );
        
        addText(`${index + 1}. ${attackDisplayName}`, margin + 5, 12, 'bold');
        addText(`   Tool: ${toolDisplayName}`, margin + 5);
        addText(`   Status: ${this.translateStatus(attack.status)}`, margin + 5);
        
        if (includeParameters && attack.parameters && Object.keys(attack.parameters).length > 0) {
          addText(`   Parameters:`, margin + 5);
          Object.entries(attack.parameters).forEach(([key, value]) => {
            if (key !== 'attackId' && key !== 'targetIndex') {
              addText(`     ${key}: ${value}`, margin + 10, 10);
            }
          });
        }

        // Attack-specific outputs
        if (attack.output && attack.output.length > 0) {
          addText(`   Attack Output:`, margin + 5, 11, 'bold');
          attack.output.slice(0, 20).forEach((output) => { // Limit to first 20 outputs per attack
            const timestamp = new Date(output.timestamp).toLocaleTimeString();
            const outputText = `     [${timestamp}] [${output.type.toUpperCase()}] ${output.content}`;
            
            // Split long lines
            const maxLineLength = 75;
            if (outputText.length > maxLineLength) {
              const lines = this.splitTextIntoLines(outputText, maxLineLength);
              lines.forEach((line, lineIndex) => {
                addText(lineIndex === 0 ? line : `       ${line}`, margin + 5, 9);
              });
            } else {
              addText(outputText, margin + 5, 9);
            }
          });
          
          if (attack.output.length > 20) {
            addText(`     ... and ${attack.output.length - 20} more output entries`, margin + 5, 9);
          }
        }
        yPosition += 3;
      });

      // AI Analysis Section
      if (includeAIAnalysis && aiAnalysis) {
        addSection('AI Analysis');
        const analysisLines = this.splitTextIntoLines(aiAnalysis, 80);
        analysisLines.forEach((line) => {
          addText(line, margin + 5, 10);
        });
      }

      // Execution Logs
      if (includeLogs && execution.output && execution.output.length > 0) {
        addSection('Complete Execution Logs');
        execution.output.slice(0, 100).forEach((log) => { // Limit to first 100 logs
          const timestamp = new Date(log.timestamp).toLocaleTimeString();
          const logText = `[${timestamp}] [${log.type.toUpperCase()}] ${log.content}`;
          
          // Split long lines
          const maxLineLength = 80;
          if (logText.length > maxLineLength) {
            const lines = this.splitTextIntoLines(logText, maxLineLength);
            lines.forEach((line, index) => {
              addText(index === 0 ? line : `    ${line}`, margin + 5, 9);
            });
          } else {
            addText(logText, margin + 5, 9);
          }
        });
        
        if (execution.output.length > 100) {
          addText(`... and ${execution.output.length - 100} more log entries`, margin + 5, 9);
        }
      }

      // Summary
      addSection('Summary');
      const successfulAttacks = execution.attacks.filter(a => a.status === 'completed').length;
      const failedAttacks = execution.attacks.filter(a => a.status === 'failed').length;
      const totalAttacks = execution.attacks.length;
      
      addText(`Total Attacks: ${totalAttacks}`, margin + 5);
      addText(`Successful: ${successfulAttacks}`, margin + 5);
      addText(`Failed: ${failedAttacks}`, margin + 5);
      addText(`Success Rate: ${totalAttacks > 0 ? Math.round((successfulAttacks / totalAttacks) * 100) : 0}%`, margin + 5);

      // Attack Output Statistics
      const totalOutputs = execution.attacks.reduce((sum, attack) => sum + (attack.output?.length || 0), 0);
      const errorOutputs = execution.attacks.reduce((sum, attack) => 
        sum + (attack.output?.filter(o => o.type === 'error').length || 0), 0);
      const warningOutputs = execution.attacks.reduce((sum, attack) => 
        sum + (attack.output?.filter(o => o.type === 'warning').length || 0), 0);
      
      addText(`Total Output Messages: ${totalOutputs}`, margin + 5);
      addText(`Error Messages: ${errorOutputs}`, margin + 5);
      addText(`Warning Messages: ${warningOutputs}`, margin + 5);

      // Footer
      yPosition = pageHeight - 15;
      doc.setFontSize(8);
      doc.text(`Generated on ${new Date().toLocaleString()} by AI4SIM Dashboard`, margin, yPosition);

      // Save the PDF
      const fileName = `execution-report-${execution.scenarioName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      throw new Error('Failed to export PDF report');
    }
  }

  /**
   * Exporte plusieurs rapports en un seul PDF
   */
  async exportMultipleReports(
    executions: (ExecutionRecord & { projectName?: string; campaignName?: string })[]
  ): Promise<void> {
    try {
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const lineHeight = 7;

      // Helper function to add text with page break handling
      const addText = (text: string, x: number, fontSize: number = 12, style: 'normal' | 'bold' = 'normal') => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        
        doc.setFontSize(fontSize);
        if (style === 'bold') {
          doc.setFont(undefined, 'bold');
        } else {
          doc.setFont(undefined, 'normal');
        }
        
        doc.text(text, x, yPosition);
        yPosition += lineHeight;
      };

      // Title
      addText('Multiple Execution Reports', margin, 18, 'bold');
      addText(`Generated on ${new Date().toLocaleString()}`, margin, 12);
      yPosition += 10;

      // Summary table
      addText('Summary', margin, 14, 'bold');
      yPosition += 5;
      
      executions.forEach((execution, index) => {
        const duration = execution.endTime ? this.formatDuration(execution.startTime, execution.endTime) : 'Running...';
        const successRate = execution.attacks.length > 0 
          ? Math.round((execution.attacks.filter(a => a.status === 'completed').length / execution.attacks.length) * 100)
          : 0;
        
        addText(`${index + 1}. ${execution.scenarioName}`, margin + 5, 11, 'bold');
        addText(`   Status: ${this.translateStatus(execution.status)} | Duration: ${duration} | Success: ${successRate}%`, margin + 10, 10);
        addText(`   Project: ${execution.projectName || 'Unknown'} | Campaign: ${execution.campaignName || 'Unknown'}`, margin + 10, 10);
        yPosition += 2;
      });

      // Individual reports (simplified)
      executions.forEach((execution, index) => {
        doc.addPage();
        yPosition = margin;
        
        addText(`Report ${index + 1}: ${execution.scenarioName}`, margin, 16, 'bold');
        yPosition += 5;
        
        // Basic info only for multiple reports
        addText(`Status: ${this.translateStatus(execution.status)}`, margin + 5);
        addText(`Start: ${new Date(execution.startTime).toLocaleString()}`, margin + 5);
        if (execution.endTime) {
          addText(`End: ${new Date(execution.endTime).toLocaleString()}`, margin + 5);
        }
        addText(`Attacks: ${execution.attacks.length}`, margin + 5);
        addText(`Targets: ${execution.targets.length}`, margin + 5);
        
        yPosition += 5;
        
        // Attack summary
        addText('Attacks:', margin + 5, 12, 'bold');
        execution.attacks.forEach((attack, attackIndex) => {
          const toolDisplayName = getToolDisplayName(attack.tool);
          const attackDisplayName = getAttackDisplayNameFromParams(
            attack.tool,
            attack.parameters?.attackId,
            attack.parameters
          );
          
          addText(`${attackIndex + 1}. ${attackDisplayName} (${toolDisplayName}) - ${this.translateStatus(attack.status)}`, margin + 10, 10);
        });
      });

      // Save the PDF
      const fileName = `multiple-execution-reports-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error exporting multiple PDFs:', error);
      throw new Error('Failed to export multiple PDF reports');
    }
  }

  private translateStatus(status: string): string {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'running':
        return 'Running';
      case 'stopped':
        return 'Stopped';
      default:
        return status;
    }
  }

  private formatDuration(startTime: string | Date, endTime?: string | Date): string {
    if (!endTime) return 'Running...';
    
    const startDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const endDate = typeof endTime === 'string' ? new Date(endTime) : endTime;
    
    const duration = endDate.getTime() - startDate.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  private splitTextIntoLines(text: string, maxLength: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}

export const pdfExportService = PDFExportService.getInstance(); 