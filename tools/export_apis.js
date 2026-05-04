const fs = require('fs');
const ExcelJS = require('exceljs');

const apis = [
  { category: 'Authentication', method: 'POST', endpoint: '/api/auth/login', description: 'User login' },
  { category: 'Authentication', method: 'POST', endpoint: '/api/auth/register', description: 'User registration' },
  { category: 'Authentication', method: 'PUT', endpoint: '/api/auth/change-password', description: 'Change password' },
  { category: 'Users', method: 'GET', endpoint: '/api/users/profile', description: 'Get own profile' },
  { category: 'Users', method: 'PUT', endpoint: '/api/users/profile', description: 'Update own profile' },
  { category: 'Users', method: 'PUT', endpoint: '/api/users/:userId/password', description: 'Change user password' },
  { category: 'Users', method: 'GET', endpoint: '/api/users', description: 'List all users' },
  { category: 'Users', method: 'GET', endpoint: '/api/users/stats', description: 'User statistics' },
  { category: 'Users', method: 'GET', endpoint: '/api/users/:userId', description: 'Get user by ID' },
  { category: 'Users', method: 'POST', endpoint: '/api/users', description: 'Create user' },
  { category: 'Users', method: 'PUT', endpoint: '/api/users/:userId', description: 'Update user' },
  { category: 'Users', method: 'DELETE', endpoint: '/api/users/:userId', description: 'Delete user' },
  { category: 'Users', method: 'POST', endpoint: '/api/users/:userId/reset-password', description: 'Reset password' },
  { category: 'Users', method: 'POST', endpoint: '/api/users/:userId/toggle-lock', description: 'Toggle user lock' },
  { category: 'Users', method: 'PUT', endpoint: '/api/users/:userId/permissions', description: 'Update permissions' },
  { category: 'Users', method: 'PUT', endpoint: '/api/users/:userId/custom-roles', description: 'Update custom roles' },
  { category: 'Users', method: 'GET', endpoint: '/api/users/roles/all', description: 'Get all roles' },
  { category: 'Users', method: 'POST', endpoint: '/api/users/roles', description: 'Create role' },
  { category: 'Users', method: 'GET', endpoint: '/api/users/audit/security-logs', description: 'Security audit logs' },
  { category: 'Users', method: 'GET', endpoint: '/api/users/check/:username', description: 'Check username exists' },
  { category: 'Users', method: 'GET', endpoint: '/api/users/info/:userId', description: 'Get user info by ID' },
  { category: 'Projects', method: 'GET', endpoint: '/api/projects', description: 'List projects' },
  { category: 'Projects', method: 'GET', endpoint: '/api/projects/:projectId', description: 'Get project' },
  { category: 'Projects', method: 'POST', endpoint: '/api/projects', description: 'Create project' },
  { category: 'Projects', method: 'PUT', endpoint: '/api/projects/:projectId', description: 'Update project' },
  { category: 'Projects', method: 'DELETE', endpoint: '/api/projects/:projectId', description: 'Delete project' },
  { category: 'Projects', method: 'POST', endpoint: '/api/projects/:projectId/share', description: 'Share project' },
  { category: 'Projects', method: 'DELETE', endpoint: '/api/projects/:projectId/users/:userId', description: 'Remove user' },
  { category: 'Projects', method: 'POST', endpoint: '/api/projects/:projectId/campaigns', description: 'Add campaign' },
  { category: 'Projects', method: 'PUT', endpoint: '/api/projects/:projectId/campaigns/:campaignId', description: 'Update campaign' },
  { category: 'Campaigns', method: 'GET', endpoint: '/api/projects/:projectId/campaigns', description: 'List campaigns' },
  { category: 'Campaigns', method: 'GET', endpoint: '/api/projects/:projectId/campaigns/:campaignId', description: 'Get campaign' },
  { category: 'Campaigns', method: 'POST', endpoint: '/api/projects/:projectId/campaigns', description: 'Create campaign' },
  { category: 'Campaigns', method: 'PUT', endpoint: '/api/projects/:projectId/campaigns/:campaignId', description: 'Update campaign' },
  { category: 'Campaigns', method: 'DELETE', endpoint: '/api/projects/:projectId/campaigns/:campaignId', description: 'Delete campaign' },
  { category: 'Campaigns', method: 'POST', endpoint: '/api/projects/:projectId/campaigns/:campaignId/schedule', description: 'Schedule campaign' },
  { category: 'Campaigns', method: 'POST', endpoint: '/api/projects/:projectId/campaigns/:campaignId/start', description: 'Start campaign' },
  { category: 'Campaigns', method: 'POST', endpoint: '/api/projects/:projectId/campaigns/:campaignId/stop', description: 'Stop campaign' },
  { category: 'Campaigns', method: 'POST', endpoint: '/api/projects/:projectId/campaigns/:campaignId/pause', description: 'Pause campaign' },
  { category: 'Campaigns', method: 'POST', endpoint: '/api/projects/:projectId/campaigns/:campaignId/resume', description: 'Resume campaign' },
  { category: 'Scenarios', method: 'GET', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios', description: 'List scenarios' },
  { category: 'Scenarios', method: 'GET', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId', description: 'Get scenario' },
  { category: 'Scenarios', method: 'POST', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios', description: 'Create scenario' },
  { category: 'Scenarios', method: 'PUT', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId', description: 'Update scenario' },
  { category: 'Scenarios', method: 'DELETE', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId', description: 'Delete scenario' },
  { category: 'Scenarios', method: 'POST', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/start', description: 'Start scenario' },
  { category: 'Scenarios', method: 'POST', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/stop', description: 'Stop scenario' },
  { category: 'Scenarios', method: 'POST', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/pause', description: 'Pause scenario' },
  { category: 'Scenarios', method: 'POST', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/resume', description: 'Resume scenario' },
  { category: 'Scenario Targets', method: 'GET', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/targets', description: 'Get targets' },
  { category: 'Scenario Targets', method: 'POST', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/targets', description: 'Add target' },
  { category: 'Scenario Targets', method: 'PUT', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/targets/:targetId', description: 'Update target' },
  { category: 'Scenario Targets', method: 'DELETE', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/targets/:targetId', description: 'Delete target' },
  { category: 'Scenario Attacks', method: 'GET', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/attacks', description: 'Get attacks' },
  { category: 'Scenario Attacks', method: 'POST', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/attacks', description: 'Add attack' },
  { category: 'Scenario Attacks', method: 'PUT', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/attacks/:attackId', description: 'Update attack' },
  { category: 'Scenario Attacks', method: 'DELETE', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/attacks/:attackId', description: 'Delete attack' },
  { category: 'Scenario History', method: 'GET', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/history', description: 'Get execution history' },
  { category: 'Scenario History', method: 'GET', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/history/:executionId', description: 'Get specific execution' },
  { category: 'Scenario History', method: 'DELETE', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/history/:executionId', description: 'Delete execution' },
  { category: 'Scenario History', method: 'DELETE', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/history', description: 'Clear history' },
  { category: 'Scenario Settings', method: 'GET', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/settings', description: 'Get settings' },
  { category: 'Scenario Settings', method: 'PUT', endpoint: '/api/projects/:projectId/campaigns/:campaignId/scenarios/:scenarioId/settings', description: 'Update settings' },
  { category: 'Executions', method: 'GET', endpoint: '/api/executions', description: 'List all executions' },
  { category: 'Executions', method: 'GET', endpoint: '/api/executions/scenario/:scenarioId', description: 'Executions for scenario' },
  { category: 'Executions', method: 'GET', endpoint: '/api/executions/:executionId', description: 'Get execution' },
  { category: 'Executions', method: 'POST', endpoint: '/api/executions', description: 'Create execution' },
  { category: 'Executions', method: 'PUT', endpoint: '/api/executions/:executionId', description: 'Update execution' },
  { category: 'Executions', method: 'DELETE', endpoint: '/api/executions/:executionId', description: 'Delete execution' },
  { category: 'Executions', method: 'POST', endpoint: '/api/executions/:executionId/output', description: 'Add output line' },
  { category: 'Executions', method: 'POST', endpoint: '/api/executions/:executionId/attacks/:attackId/output', description: 'Add attack output' },
  { category: 'Executions', method: 'PUT', endpoint: '/api/executions/:executionId/attacks/:attackId', description: 'Update attack status' },
  { category: 'Executions', method: 'DELETE', endpoint: '/api/executions/:executionId/attacks/:attackId/output', description: 'Clear attack output' },
  { category: 'Executions', method: 'DELETE', endpoint: '/api/executions/:executionId/attacks/output', description: 'Clear all outputs' },
  { category: 'Pentest Sessions', method: 'GET', endpoint: '/api/pentest/health', description: 'Health check' },
  { category: 'Pentest Sessions', method: 'POST', endpoint: '/api/pentest/execute', description: 'Execute pentest tool' },
  { category: 'Pentest Sessions', method: 'POST', endpoint: '/api/pentest/sessions', description: 'Create session' },
  { category: 'Pentest Sessions', method: 'GET', endpoint: '/api/pentest/sessions', description: 'List sessions' },
  { category: 'Pentest Sessions', method: 'GET', endpoint: '/api/pentest/sessions/:sessionId', description: 'Get session' },
  { category: 'Pentest Sessions', method: 'POST', endpoint: '/api/pentest/sessions/:sessionId/start', description: 'Start session' },
  { category: 'Pentest Sessions', method: 'POST', endpoint: '/api/pentest/sessions/:sessionId/execute-next', description: 'Execute next step' },
  { category: 'Pentest Sessions', method: 'POST', endpoint: '/api/pentest/sessions/:sessionId/approve-step', description: 'Approve step' },
  { category: 'Pentest Sessions', method: 'GET', endpoint: '/api/pentest/sessions/:sessionId/report', description: 'Generate report' },
  { category: 'Pentest Sessions', method: 'DELETE', endpoint: '/api/pentest/sessions/:sessionId', description: 'Delete session' },
  { category: 'Pentest Reports', method: 'POST', endpoint: '/api/pentest/reports', description: 'Save pentest report' },
  { category: 'Pentest Reports', method: 'GET', endpoint: '/api/pentest/reports', description: 'List all reports' },
  { category: 'Pentest Reports', method: 'GET', endpoint: '/api/pentest/:scanId/report', description: 'Get pentest summary report' },
  { category: 'Pentest Reports', method: 'GET', endpoint: '/api/pentest/:scanId/report/download', description: 'Download report (json|csv|pdf)' },
  { category: 'Pentest Reports', method: 'DELETE', endpoint: '/api/pentest/:scanId/report', description: 'Delete report' },
  { category: 'Vulnerabilities', method: 'GET', endpoint: '/api/pentest/:scanId/vulnerabilities', description: 'List all vulnerabilities' },
  { category: 'Vulnerabilities', method: 'GET', endpoint: '/api/pentest/:scanId/vulnerabilities/:vulnId', description: 'Get vulnerability details' },
  { category: 'Vulnerabilities', method: 'GET', endpoint: '/api/pentest/:scanId/vulnerabilities/:vulnId/download', description: 'Download vulnerability (json|md)' },
  { category: 'Vulnerabilities', method: 'GET', endpoint: '/api/pentest/:scanId/vulnerabilities/:vulnId/view', description: 'View vulnerability (HTML)' },
  { category: 'Agents', method: 'POST', endpoint: '/api/agents/chat', description: 'AI chat' },
  { category: 'Agents', method: 'POST', endpoint: '/api/agents/start-session', description: 'Start pentest session' },
  { category: 'Agents', method: 'POST', endpoint: '/api/agents/execute-tool', description: 'Execute specific tool' },
  { category: 'Agents', method: 'GET', endpoint: '/api/agents/session/:sessionId', description: 'Get session' },
  { category: 'Agents', method: 'POST', endpoint: '/api/agents/session/:sessionId/report', description: 'Generate report' },
  { category: 'Agents', method: 'GET', endpoint: '/api/agents/session/:sessionId/export', description: 'Export session' },
  { category: 'Agents', method: 'GET', endpoint: '/api/agents/session/:sessionId/chat-history', description: 'Get chat history' },
  { category: 'Agents', method: 'POST', endpoint: '/api/agents/session/:sessionId/chat-history', description: 'Save chat history' },
  { category: 'Agents', method: 'DELETE', endpoint: '/api/agents/session/:sessionId/chat-history', description: 'Delete chat history' },
  { category: 'Agents', method: 'GET', endpoint: '/api/agents/session/:sessionId/pdf', description: 'Download PDF report' },
  { category: 'Agents', method: 'GET', endpoint: '/api/agents/pentest-session/:sessionId', description: 'Get pentest session' },
  { category: 'Agents', method: 'GET', endpoint: '/api/agents/pentest-sessions', description: 'List pentest sessions' },
  { category: 'System', method: 'GET', endpoint: '/api/health', description: 'Server health' },
  { category: 'System', method: 'GET', endpoint: '/api/metrics', description: 'System metrics' },
  { category: 'System', method: 'GET', endpoint: '/api/check-port/:port', description: 'Check port status' },
  { category: 'System', method: 'GET', endpoint: '/api/system/status', description: 'System status' },
  { category: 'Configs', method: 'GET', endpoint: '/api/configs', description: 'Get configs' },
  { category: 'Configs', method: 'POST', endpoint: '/api/configs', description: 'Save config' },
  { category: 'Configs', method: 'DELETE', endpoint: '/api/configs/:exportDate', description: 'Delete config' },
  { category: 'Process Status', method: 'GET', endpoint: '/api/process-status/:processId', description: 'Check process status' },
  { category: 'Process Status', method: 'POST', endpoint: '/api/process-status/batch', description: 'Check batch processes' },
];

async function exportToExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI4SIM';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('API Endpoints');

  worksheet.columns = [
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Method', key: 'method', width: 10 },
    { header: 'Endpoint', key: 'endpoint', width: 80 },
    { header: 'Description', key: 'description', width: 40 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  apis.forEach((api, index) => {
    const row = worksheet.addRow(api);
    
    const methodColors = {
      'GET': 'FF70AD47',
      'POST': 'FF4472C4',
      'PUT': 'FFFFC000',
      'DELETE': 'FFED7D31',
      'PATCH': 'FFFF00FF'
    };
    
    row.getCell('method').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: methodColors[api.method] || 'FF808080' }
    };
    row.getCell('method').font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.getCell('method').alignment = { horizontal: 'center' };
  });

  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1 }
  ];

  await workbook.xlsx.writeFile('./API_Endpoints.xlsx');
  console.log('Excel file created: API_Endpoints.xlsx');
  console.log(`Total APIs: ${apis.length}`);
}

exportToExcel().catch(console.error);
