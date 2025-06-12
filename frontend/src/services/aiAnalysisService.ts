import { ExecutionRecord } from './executionHistoryService';
import { wazuhService, WazuhSecurityMetrics } from './wazuhService';
import { useAISettingsStore, AIProvider } from '../store/aiSettingsStore';
import { TOOLS } from '../constants/tools';

interface AIAnalysisResult {
  summary: string;
  attacksAnalysis: {
    attackName: string;
    tool: string;
    status: 'success' | 'failed' | 'partial';
    analysis: string;
    recommendations?: string;
  }[];
  overallAssessment: string;
  securityImplications: string;
  nextSteps: string[];
  wazuhIntegration?: {
    alertsSummary: string;
    criticalFindings: string[];
    networkAnalysis: string;
    recommendations: string[];
  };
  timestamp: Date;
  provider: AIProvider;
  model: string;
}

interface CachedAnalysis {
  analysis: AIAnalysisResult;
  executionHash: string;
  createdAt: number;
  includeWazuh: boolean;
}

class AIAnalysisService {
  private cache: Map<string, { data: any; timestamp: number; size: number }> = new Map();
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 heures
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB max
  private readonly MAX_CACHE_ENTRIES = 1000; // Maximum 1000 entrées
  private readonly CACHE_KEY = 'ai-analysis-cache';
  private currentCacheSize = 0;
  private improvementsChecked = false; // Flag pour éviter de vérifier plusieurs fois par session

  constructor() {
    this.loadCacheFromStorage();
    // Invalider le cache si des améliorations ont été apportées (une seule fois par session)
    if (!this.improvementsChecked) {
      this.checkForImprovements();
      this.improvementsChecked = true;
    }
    // Nettoyer le cache toutes les heures
    setInterval(() => {
      this.cleanupCache();
    }, 60 * 60 * 1000);
  }

  private loadCacheFromStorage(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsedCache: Record<string, CachedAnalysis> = JSON.parse(cached);
        const now = Date.now();
        
        // Load non-expired entries
        Object.entries(parsedCache).forEach(([key, cachedItem]) => {
          if (now - cachedItem.createdAt < this.CACHE_EXPIRY) {
            // Convert timestamp back to Date object
            cachedItem.analysis.timestamp = new Date(cachedItem.analysis.timestamp);
            this.cache.set(key, {
              data: cachedItem.analysis,
              timestamp: cachedItem.createdAt,
              size: this.calculateSize(cachedItem.analysis)
            });
            this.currentCacheSize += this.calculateSize(cachedItem.analysis);
          }
        });
        
        console.log(`Loaded ${this.cache.size} cached AI analyses from storage`);
      }
    } catch (error) {
      console.warn('Failed to load AI analysis cache from storage:', error);
    }
  }

  private saveCacheToStorage(): void {
    try {
      const cacheToSave: Record<string, CachedAnalysis> = {};
      
      this.cache.forEach((value, key) => {
        const [executionId, includeWazuhStr] = key.split('_');
        const includeWazuh = includeWazuhStr === 'true';
        
        cacheToSave[key] = {
          analysis: value.data,
          executionHash: this.generateExecutionHash({ id: executionId } as ExecutionRecord),
          createdAt: value.timestamp,
          includeWazuh
        };
      });
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheToSave));
      console.log(`Saved ${this.cache.size} AI analyses to storage`);
    } catch (error) {
      console.warn('Failed to save AI analysis cache to storage:', error);
    }
  }

  private generateExecutionHash(execution: ExecutionRecord): string {
    // Generate a hash based on execution content to detect changes
    const content = JSON.stringify({
      id: execution.id,
      status: execution.status,
      attacks: execution.attacks?.map(a => ({
        name: a.name,
        tool: a.tool,
        status: a.status,
        parameters: a.parameters
      })),
      targets: execution.targets?.map(t => ({
        name: t.name,
        host: t.host
      }))
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private getCacheKey(executionId: string, includeWazuh: boolean): string {
    return `${executionId}_${includeWazuh}`;
  }

  async analyzeExecution(execution: ExecutionRecord, includeWazuh = true): Promise<AIAnalysisResult> {
    const cacheKey = this.getCacheKey(execution.id, includeWazuh);
    
    const cachedAnalysis = this.getFromCache(cacheKey);
    if (cachedAnalysis) {
      console.log(`✅ Using cached AI analysis for execution ${execution.id} (includeWazuh: ${includeWazuh}) - Cache size: ${this.cache.size} entries`);
      // Ensure provider and model are up-to-date if they were 'error-fallback'
      if (cachedAnalysis.model === 'error-fallback' || cachedAnalysis.model === 'fallback') {
        cachedAnalysis.provider = useAISettingsStore.getState().settings.provider;
      }
      return cachedAnalysis;
    }

    console.log(`🔄 Generating new AI analysis for execution ${execution.id} (includeWazuh: ${includeWazuh}) - Cache size: ${this.cache.size} entries`);
    let wazuhMetrics: WazuhSecurityMetrics | null = null;

    try {
      if (includeWazuh) {
        try {
          wazuhMetrics = await wazuhService.getSecurityMetrics(execution);
        } catch (error) {
          console.warn('Failed to fetch Wazuh metrics:', error);
        }
      }

      const settings = useAISettingsStore.getState().settings;
      let prompt: string;
      let analysisText: string;
      let usedModel: string;

      if (settings.provider === 'ollama') {
        prompt = this.buildEnhancedAnalysisPrompt(execution, wazuhMetrics);
        const result = await this.analyzeWithOllama(prompt, settings);
        analysisText = result.text;
        usedModel = result.model;
      } else {
        prompt = this.buildEnhancedAnalysisPrompt(execution, wazuhMetrics);
        const result = await this.analyzeWithOpenRouter(prompt, settings);
        analysisText = result.text;
        usedModel = result.model;
      }
      
      const analysis = this.parseEnhancedAnalysisResponse(analysisText, execution, wazuhMetrics);
      
      // If parseEnhancedAnalysisResponse returned a basic error fallback, its provider/model are already set.
      // Otherwise, set them from the successful AI call.
      if (analysis.model !== 'error-fallback') {
        analysis.provider = settings.provider;
        analysis.model = usedModel;
      }
      
      this.setCachedAnalysis(execution.id, analysis, includeWazuh);
      return analysis;

    } catch (error) {
      console.error('Critical error during AI analysis pipeline:', error);
      // Utiliser le fallback basique défini plus haut
      const fallback = this.createBasicErrorAnalysis(execution, `AI analysis failed due to a critical error: ${error instanceof Error ? error.message : 'Unknown error'}.`, wazuhMetrics);
      
      this.setCachedAnalysis(execution.id, fallback, includeWazuh);
      return fallback;
    }
  }

  private async analyzeWithOpenRouter(prompt: string, settings: any): Promise<{text: string, model: string}> {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 300000); // 5 minutes timeout

    try {
      const response = await fetch(`${settings.openrouter.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.openrouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ai4sim-dashboard.local',
          'X-Title': 'AI4SIM Security Dashboard',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: settings.openrouter.model,
          messages: [
            {
              role: 'system',
              content: `You are a cybersecurity expert specialized in penetration testing and security attack analysis. 
              You analyze security test scenario execution results and provide detailed reports in English.
              Your analyses should be technical, precise and action-oriented. When Wazuh security monitoring data is available, 
              integrate it into your analysis to provide comprehensive security insights.
              
              CRITICAL: You MUST respond with a valid JSON object only. Follow this exact format:
              - Use proper JSON syntax with colons after keys: "key": "value"
              - All strings must be in double quotes
              - No trailing commas
              - Escape special characters in strings
              - Do not include any text before or after the JSON`
            },
            {
              role: 'user',
              content: `${prompt}

              IMPORTANT: Respond ONLY with a valid JSON object. No explanations, no markdown, just pure JSON.
              
              Required JSON structure:
              {
                "summary": "Brief overview of the security test execution",
                "attacksAnalysis": [
                  {
                    "attackName": "Name of the attack",
                    "tool": "Tool used",
                    "status": "success|failed|partial",
                    "analysis": "Detailed analysis",
                    "recommendations": "Specific recommendations"
                  }
                ],
                "overallAssessment": "Overall security assessment",
                "securityImplications": "Security implications",
                "nextSteps": ["Step 1", "Step 2", "Step 3"]
              }`
            }
          ],
          temperature: 0.3, // Réduire la température pour plus de consistance
          max_tokens: 2000,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error response:', errorText);
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const analysisText = data.choices[0]?.message?.content || '';
      
      if (!analysisText) {
        throw new Error('Empty response from OpenRouter');
      }
      
      return {
        text: analysisText,
        model: settings.openrouter.model
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('OpenRouter analysis error: Request timed out after 5 minutes');
        throw new Error('OpenRouter request timed out after 5 minutes. The model may be slow or overloaded.');
      }
      
      console.error('OpenRouter analysis error:', error);
      throw error instanceof Error ? error : new Error('Unknown OpenRouter error');
    }
  }

  private async analyzeWithOllama(prompt: string, settings: any): Promise<{text: string, model: string}> {
    console.log('Ollama analysis starting with model:', settings.ollama.selectedModel);
    console.log('Ollama URL:', settings.ollama.baseUrl);
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 600000); // Augmenté à 10 minutes pour les modèles plus complexes

    try {
      // Utiliser le prompt complet au lieu de le simplifier
      const ollamaPrompt = this.buildOllamaAnalysisPrompt(prompt);
      
      const response = await fetch(`${settings.ollama.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: settings.ollama.selectedModel,
          prompt: ollamaPrompt,
          stream: false,
          options: {
            temperature: 0.3, // Augmenté pour plus de créativité
            num_predict: 2000, // Augmenté pour des réponses plus complètes
            num_ctx: 4096, // Contexte plus large
            top_p: 0.9,
            repeat_penalty: 1.1,
            stop: ["\n\n---", "Human:", "Assistant:"] // Arrêter sur certains patterns
          }
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama API error response:', errorText);
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Ollama response received successfully');
      
      const analysisText = data.response || '';
      
      if (!analysisText) {
        throw new Error('Empty response from Ollama');
      }
      
      return {
        text: analysisText,
        model: settings.ollama.selectedModel
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Ollama analysis error: Request timed out after 10 minutes');
        throw new Error('Ollama request timed out after 10 minutes. The model may be slow or overloaded.');
      }
      
      console.error('Ollama analysis error:', error);
      throw error instanceof Error ? error : new Error('Unknown Ollama error');
    }
  }

  // Nouvelle méthode pour créer un prompt optimisé pour Ollama
  private buildOllamaAnalysisPrompt(originalPrompt: string): string {
    return `You are a cybersecurity expert specialized in penetration testing analysis. 
Analyze the following security test execution and provide a detailed JSON response.

${originalPrompt}

CRITICAL FORMATTING REQUIREMENTS:
1. Respond ONLY with a valid JSON object
2. Use proper JSON syntax: "key": "value" (note the colon after the key)
3. All strings must be in double quotes
4. No trailing commas
5. Escape special characters in strings with backslashes
6. Do not include any text before or after the JSON

Example of correct JSON format:
{
  "summary": "This is a proper JSON string",
  "attacksAnalysis": [
    {
      "attackName": "Example Attack",
      "tool": "Example Tool",
      "status": "success",
      "analysis": "Detailed analysis here"
    }
  ]
}

Begin your JSON response now:`;
  }

  // Méthode pour obtenir les informations d'attaque enrichies
  private getEnrichedAttackInfo(attack: any) {
    const toolDisplayName = this.getToolDisplayName(attack.tool);
    
    // Essayer de trouver l'attaque spécifique dans l'outil
    const tool = TOOLS.find(t => t.id === attack.tool);
    let attackDisplayName = attack.name;
    
    if (tool && tool.attacks && tool.attacks.length > 0) {
      // Si on a des paramètres, essayer de matcher l'attaque spécifique
      if (attack.parameters && Object.keys(attack.parameters).length > 0) {
        const matchingAttack = tool.attacks.find(a => {
          // Logique de matching basée sur les paramètres ou autres critères
          return a.parameters && Object.keys(a.parameters).some(param => 
            attack.parameters.hasOwnProperty(param)
          );
        });
        if (matchingAttack) {
          attackDisplayName = matchingAttack.name;
        }
      } else {
        // Utiliser la première attaque par défaut
        attackDisplayName = tool.attacks[0].name;
      }
    }
    
    return {
      toolDisplayName,
      attackDisplayName,
      originalTool: attack.tool,
      originalName: attack.name
    };
  }

  private buildEnhancedAnalysisPrompt(execution: ExecutionRecord, wazuhMetrics?: WazuhSecurityMetrics | null): string {
    let prompt = `
Analyze this security test scenario and provide a detailed report in English.

**Scenario Information:**
- Execution ID: ${execution.id}
- Global Status: ${execution.status}
- Duration: ${this.calculateDuration(execution.startTime, execution.endTime)}
- Number of attacks: ${execution.attacks.length}
- Number of targets: ${execution.targets.length}

**Tested Targets:**
${execution.targets.map(target => `- ${target.name} (${target.host})`).join('\n')}

**Attack Details:**
${execution.attacks.map((attack, index) => {
  const enrichedInfo = this.getEnrichedAttackInfo(attack);
  
  // Analyser les erreurs spécifiques dans l'output
  const errorAnalysis = this.analyzeAttackErrors(attack);
  
  return `
Attack ${index + 1}: ${enrichedInfo.attackDisplayName}
- Tool: ${enrichedInfo.toolDisplayName}
- Status: ${attack.status}
- Parameters: ${JSON.stringify(attack.parameters)}
- Complete Output: ${attack.output.map(line => `[${line.type}] ${line.content}`).join('; ')}
${errorAnalysis ? `- Error Analysis: ${errorAnalysis}` : ''}
`;
}).join('\n')}`;

    // Add Wazuh security monitoring data if available
    if (wazuhMetrics) {
      prompt += `

**Security Monitoring Data (Wazuh):**
- Total Security Alerts: ${wazuhMetrics.totalAlerts}
- Critical Alerts: ${wazuhMetrics.criticalAlerts}
- High Priority Alerts: ${wazuhMetrics.highAlerts}
- Medium Priority Alerts: ${wazuhMetrics.mediumAlerts}
- Low Priority Alerts: ${wazuhMetrics.lowAlerts}

**Top Security Rules Triggered:**
${wazuhMetrics.topRules.slice(0, 5).map(rule => 
  `- Rule ${rule.ruleId}: ${rule.description} (${rule.count} times, Level ${rule.level})`
).join('\n')}

**Attack Patterns Detected:**
${wazuhMetrics.attackPatterns.slice(0, 5).map(pattern => 
  `- ${pattern.pattern}: ${pattern.count} occurrences (${pattern.severity})`
).join('\n')}

**Network Activity Analysis:**
${wazuhMetrics.networkActivity.slice(0, 5).map(activity => 
  `- ${activity.sourceIp} → ${activity.destinationIp} (${activity.protocol}): ${activity.count} connections${activity.suspicious ? ' [SUSPICIOUS]' : ''}`
).join('\n')}`;
    }

    prompt += `

Please provide a comprehensive analysis in the following JSON format:
{
  "summary": "Executive summary of the security assessment",
  "attacksAnalysis": [
    {
      "attackName": "Use descriptive attack name, not 'Attack N'",
      "tool": "Use full tool name (e.g., 'GAN-Based Fuzzer' not '5greplay')",
      "status": "success/failed/partial",
      "analysis": "Detailed analysis of this specific attack",
      "recommendations": "Specific recommendations for this attack"
    }
  ],
  "overallAssessment": "Overall security assessment and risk evaluation",
  "securityImplications": "Security implications and potential impact",
  "nextSteps": ["List of recommended next steps"],
  ${wazuhMetrics ? `"wazuhIntegration": {
    "alertsSummary": "Summary of security alerts and their significance",
    "criticalFindings": ["List of critical security findings from monitoring"],
    "networkAnalysis": "Analysis of network activity and suspicious patterns",
    "recommendations": ["Wazuh-specific security recommendations"]
  },` : ''}
  "timestamp": "${new Date().toISOString()}"
}

CRITICAL INSTRUCTIONS:
1. In the attacksAnalysis array, ALWAYS use the descriptive tool names provided in the attack details above (e.g., "GAN-Based Fuzzer", "AI-Based KNX Fuzzer")
2. NEVER use technical IDs like "5greplay", "aiknxfuzzer", etc.
3. Use meaningful attack names, not generic "Attack 1", "Attack 2"
4. Copy the exact tool names from the "Tool:" field in the attack details section above
5. If "Error Analysis" is provided for an attack, MENTION the specific technical errors (Docker, network, permissions, etc.) in your analysis
6. For Docker-related failures, specifically mention Docker daemon issues, image access problems, or authentication requirements

Example correct format:
- attackName: "Standard GAN Fuzzing" (not "Attack 1")
- tool: "GAN-Based Fuzzer" (not "5greplay")
- analysis: "Attack failed due to Docker daemon not being accessible. The tool could not execute because..."`;

    return prompt;
  }

  private parseEnhancedAnalysisResponse(analysisText: string, execution: ExecutionRecord, wazuhMetrics?: WazuhSecurityMetrics | null): AIAnalysisResult {
    console.log('🔍 [DEBUG] Raw AI response:', analysisText);
    console.log('🔍 [DEBUG] Response length:', analysisText.length);
    console.log('🔍 [DEBUG] First 500 chars:', analysisText.substring(0, 500));
    console.log('🔍 [DEBUG] Last 500 chars:', analysisText.substring(Math.max(0, analysisText.length - 500)));
    
    // Try to extract JSON from the response
    let jsonString = analysisText.trim();
    
    // Remove markdown code blocks if present
    if (jsonString.includes('```')) {
      const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
        console.log('🔍 [DEBUG] Extracted from markdown:', jsonString);
      }
    }

    console.log('🔍 [DEBUG] Attempting to parse JSON:', jsonString);

    try {
      // Try direct parsing first
      const parsed = JSON.parse(jsonString);
      console.log('✅ [DEBUG] Direct JSON parse successful:', parsed);
      return this.validateAndProcessAnalysis(parsed, execution);
    } catch (directError) {
      console.log('❌ [DEBUG] Direct parse failed:', directError);
      console.log('🔄 [DEBUG] Trying balanced JSON extraction...');
      
      // Try to find balanced JSON
      const findBalancedJson = (text: string): string | null => {
        let braceCount = 0;
        let start = -1;
        
        for (let i = 0; i < text.length; i++) {
          if (text[i] === '{') {
            if (start === -1) start = i;
            braceCount++;
          } else if (text[i] === '}') {
            braceCount--;
            if (braceCount === 0 && start !== -1) {
              const extracted = text.substring(start, i + 1);
              console.log('🔍 [DEBUG] Balanced JSON found:', extracted);
              return extracted;
            }
          }
        }
        return null;
      };

      const balancedJson = findBalancedJson(jsonString);
      if (balancedJson) {
        try {
          const parsed = JSON.parse(balancedJson);
          console.log('✅ [DEBUG] Balanced JSON parse successful:', parsed);
          return this.validateAndProcessAnalysis(parsed, execution);
        } catch (balancedError) {
          console.log('❌ [DEBUG] Balanced JSON parse failed:', balancedError);
        }
      }

      console.log('🔧 [DEBUG] Trying JSON repair...');
      
      // Try to repair the JSON
      try {
        const repairedJson = this.repairMalformedJson(jsonString);
        console.log('🔍 [DEBUG] Repaired JSON:', repairedJson);
        
        const parsed = JSON.parse(repairedJson);
        console.log('✅ [DEBUG] Repaired JSON parse successful:', parsed);
        return this.validateAndProcessAnalysis(parsed, execution);
      } catch (repairError) {
        console.log('❌ [DEBUG] Repaired JSON parse failed:', repairError);
        console.log('🚨 [DEBUG] Using fallback analysis...');
        
        // Create fallback analysis
        return this.createBasicErrorAnalysis(
          execution, 
          `Failed to parse AI response. Original error: ${directError instanceof Error ? directError.message : String(directError)}. Raw response: ${analysisText.substring(0, 200)}...`,
          wazuhMetrics
        );
      }
    }
  }

  /**
   * Répare les JSON malformés courants de manière plus robuste
   */
  private repairMalformedJson(jsonString: string): string {
    let repaired = jsonString.trim();
    
    // Supprimer les préfixes markdown restants
    repaired = repaired.replace(/^```(?:json)?\s*/i, '');
    repaired = repaired.replace(/```\s*$/, '');
    repaired = repaired.replace(/^json\s+/i, '');
    
    // Supprimer les caractères de contrôle invisibles
    repaired = repaired.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // PATTERN PRINCIPAL : "key" "value" -> "key": "value"
    // Ce pattern est très fréquent avec OpenRouter et Ollama
    repaired = repaired.replace(/"([^"]+)"\s+"([^"]+)"/g, '"$1": "$2"');
    
    // PATTERN : "key" value (sans guillemets sur la valeur) -> "key": "value"
    repaired = repaired.replace(/"([^"]+)"\s+([^",\[\]{}:]+?)(\s*[,}\]])/g, '"$1": "$2"$3');
    
    // PATTERN : "key" { -> "key": {
    repaired = repaired.replace(/"([^"]+)"\s+(\{)/g, '"$1": $2');
    
    // PATTERN : "key" [ -> "key": [
    repaired = repaired.replace(/"([^"]+)"\s+(\[)/g, '"$1": $2');
    
    // PATTERN SPÉCIAL : gérer les mots collés comme "attacksnalysis" -> "attacksAnalysis"
    const keyMappings = {
      'attacksnalysis': 'attacksAnalysis',
      'attackame': 'attackName',
      'verallssessment': 'overallAssessment',
      'uritymplications': 'securityImplications',
      'extteps': 'nextSteps',
      'ummary': 'summary',
      'nalysis': 'analysis',
      'ecommendations': 'recommendations',
      'ool': 'tool',
      'tatus': 'status'
    };
    
    // Appliquer les corrections de clés
    Object.entries(keyMappings).forEach(([wrong, correct]) => {
      const regex = new RegExp(`"${wrong}"`, 'g');
      repaired = repaired.replace(regex, `"${correct}"`);
    });
    
    // Réparer les clés sans guillemets : key "value" -> "key": "value"
    repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s+"([^"]+)"/g, '$1"$2": "$3"');
    
    // Réparer les clés sans guillemets et sans deux-points : key value -> "key": "value"
    repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s+([^",\[\]{}:]+?)(\s*[,}\]])/g, '$1"$2": "$3"$4');
    
    // Ajouter les deux-points manquants après les clés quotées
    repaired = repaired.replace(/"([^"]+)"\s+(?!:)(["{[])/g, '"$1": $2');
    
    // Réparer les valeurs non quotées (sauf true, false, null, numbers)
    repaired = repaired.replace(/:\s*([^",\[\]{}0-9\-][^",\[\]{}]*?)(\s*[,}\]])/g, (_, value, ending) => {
      const trimmedValue = value.trim();
      
      // Ne pas quoter true, false, null, ou les nombres
      if (trimmedValue === 'true' || trimmedValue === 'false' || trimmedValue === 'null' || 
          /^-?\d+(\.\d+)?$/.test(trimmedValue)) {
        return `: ${trimmedValue}${ending}`;
      }
      
      // Quoter les autres valeurs et échapper les guillemets internes
      const escapedValue = trimmedValue.replace(/"/g, '\\"');
      return `: "${escapedValue}"${ending}`;
    });
    
    // Réparer les virgules en fin d'objet/tableau
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    
    // Gérer les cas où des mots sont collés sans séparateur approprié
    // Pattern pour détecter des mots collés comme "summaryThe" -> "summary": "The"
    repaired = repaired.replace(/"([a-z]+)([A-Z][^"]*?)"/g, (match, firstPart, secondPart) => {
      // Vérifier si le premier part est une clé JSON connue
      const knownKeys = ['summary', 'attacksAnalysis', 'overallAssessment', 'securityImplications', 'nextSteps', 'attackName', 'tool', 'status', 'analysis', 'recommendations'];
      if (knownKeys.includes(firstPart)) {
        return `"${firstPart}": "${secondPart}"`;
      }
      return match;
    });
    
    // Réparer les guillemets non échappés dans les chaînes
    repaired = repaired.replace(/"([^"]*)"([^"]*)"([^"]*?)"/g, (match, p1, p2, p3) => {
      if (p2.includes(':') || p2.includes(',') || p2.includes('{') || p2.includes('}')) {
        return match; // Probablement une structure JSON valide
      }
      return `"${p1}\\"${p2}\\"${p3}"`;
    });
    
    // Fermer les objets/tableaux non fermés
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') openBraces++;
        else if (char === '}') openBraces--;
        else if (char === '[') openBrackets++;
        else if (char === ']') openBrackets--;
      }
    }
    
    // Ajouter les fermetures manquantes
    while (openBrackets > 0) {
      repaired += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      repaired += '}';
      openBraces--;
    }
    
    // Nettoyer les espaces multiples
    repaired = repaired.replace(/\s+/g, ' ');
    
    console.log('🔧 JSON repair attempt:', {
      original: jsonString.substring(0, 300) + (jsonString.length > 300 ? '...' : ''),
      repaired: repaired.substring(0, 300) + (repaired.length > 300 ? '...' : ''),
      changes: jsonString !== repaired ? 'Applied fixes' : 'No changes needed'
    });
    
    return repaired;
  }

  /**
   * Crée une analyse d'erreur basique en cas d'échec complet.
   */
  private createBasicErrorAnalysis(execution: ExecutionRecord, errorMessage: string, wazuhMetrics?: WazuhSecurityMetrics | null): AIAnalysisResult {
    const genericErrorText = `${errorMessage} Please review execution logs.`;
    return {
      summary: `AI Analysis Failed: ${errorMessage}`,
      attacksAnalysis: execution.attacks.map(attack => {
        const enrichedInfo = this.getEnrichedAttackInfo(attack);
        return {
          attackName: enrichedInfo.attackDisplayName,
          tool: enrichedInfo.toolDisplayName,
          status: attack.status === 'completed' || attack.status === 'running' || attack.status === 'pending' ? 'partial' : attack.status === 'stopped' || attack.status === 'error' ? 'failed' : attack.status,
          analysis: `Attack ${attack.status}. ${genericErrorText}`,
          recommendations: 'Review tool output and system logs for this attack.'
        };
      }),
      overallAssessment: `AI analysis could not be performed. ${genericErrorText}`,
      securityImplications: `Security posture could not be determined via AI. ${genericErrorText}`,
      nextSteps: ['Manually review execution logs', 'Check AI provider status', 'Retry analysis later'],
      wazuhIntegration: wazuhMetrics ? {
        alertsSummary: "Wazuh data was available but AI analysis failed.",
        criticalFindings: [],
        networkAnalysis: "Review Wazuh for details.",
        recommendations: ["Correlate Wazuh alerts with execution logs manually."]
      } : undefined,
      timestamp: new Date(),
      provider: useAISettingsStore.getState().settings.provider,
      model: 'error-fallback'
    };
  }

  private calculateDuration(start: Date | string, end?: Date | string): string {
    if (!end) return 'In progress...';
    
    try {
      const startTime = typeof start === 'string' ? new Date(start) : start;
      const endTime = typeof end === 'string' ? new Date(end) : end;
      
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return 'Invalid duration';
      }
      
      const durationMs = endTime.getTime() - startTime.getTime();
      const seconds = Math.floor(durationMs / 1000);
      
      if (seconds < 60) return `${seconds} seconds`;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      
      if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    } catch (error) {
      return 'Invalid duration';
    }
  }

  async getCachedAnalysis(executionId: string, includeWazuh = true): Promise<AIAnalysisResult | null> {
    const cacheKey = this.getCacheKey(executionId, includeWazuh);
    return this.getFromCache(cacheKey);
  }

  setCachedAnalysis(executionId: string, analysis: AIAnalysisResult, includeWazuh: boolean): void {
    const cacheKey = this.getCacheKey(executionId, includeWazuh);
    this.addToCache(cacheKey, analysis);
    this.saveCacheToStorage();
  }

  clearCache(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
    this.saveCacheToStorage();
    console.log('AI Analysis cache cleared');
  }

  // Nouvelle méthode pour invalider le cache d'une exécution spécifique
  invalidateExecutionCache(executionId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.startsWith(`${executionId}_`)
    );
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.saveCacheToStorage();
    
    console.log(`Invalidated cache for execution ${executionId} (${keysToDelete.length} entries)`);
  }

  /**
   * Méthode pour invalider tout le cache (utile après des améliorations)
   */
  invalidateAllCache(): void {
    this.cache.clear();
    localStorage.removeItem(this.CACHE_KEY);
    console.log('All AI analysis cache invalidated due to improvements');
  }

  /**
   * Méthode publique pour forcer l'invalidation du cache et réinitialiser les vérifications
   */
  forceInvalidateCache(): void {
    this.cache.clear();
    localStorage.removeItem(this.CACHE_KEY);
    localStorage.removeItem('ai-analysis-improvements-version');
    localStorage.removeItem('ai-analysis-last-check');
    this.improvementsChecked = false;
    console.log('🗑️ Cache forcibly invalidated and improvement checks reset');
  }

  /**
   * Méthode de test pour valider le parsing JSON (utile pour le débogage)
   */
  testJsonParsing(jsonString: string): { success: boolean; result?: any; error?: string; repaired?: string } {
    try {
      // Test direct parsing first
      const directResult = JSON.parse(jsonString);
      return { success: true, result: directResult };
    } catch (directError) {
      try {
        // Try repair
        const repaired = this.repairMalformedJson(jsonString);
        const repairedResult = JSON.parse(repaired);
        return { 
          success: true, 
          result: repairedResult, 
          repaired: repaired 
        };
      } catch (repairError) {
        return { 
          success: false, 
          error: repairError instanceof Error ? repairError.message : 'Unknown error',
          repaired: this.repairMalformedJson(jsonString)
        };
      }
    }
  }

  // Méthode de test pour les patterns courants
  testCommonPatterns(): void {
    console.log('🧪 Testing common malformed JSON patterns...');
    
    const testCases = [
      {
        name: 'OpenRouter pattern: missing colons',
        json: '{\n  "summary" "Security test execution summary",\n  "attacksAnalysis" [\n    {\n      "attackName" "Shennina Full Assessment"\n    }\n  ]\n}'
      },
      {
        name: 'Ollama pattern: truncated keys',
        json: '{\n  "ummary" "Test summary",\n  "attacksnalysis" [\n    {\n      "attackame" "Test attack",\n      "ool" "shennina"\n    }\n  ]\n}'
      },
      {
        name: 'Mixed pattern: some colons missing',
        json: '{\n  "summary": "Good summary",\n  "attacksAnalysis" [\n    {\n      "attackName" "Bad attack name",\n      "tool": "good tool"\n    }\n  ]\n}'
      }
    ];

    testCases.forEach(testCase => {
      console.log(`\n📝 Testing: ${testCase.name}`);
      const result = this.testJsonParsing(testCase.json);
      console.log(`✅ Success: ${result.success}`);
      if (result.success && result.repaired) {
        console.log('🔧 Repair was needed and successful');
      } else if (!result.success) {
        console.log(`❌ Failed: ${result.error}`);
      }
    });
  }

  // Méthode pour obtenir des statistiques du cache
  getCacheStats(): { totalEntries: number; cacheSize: string; oldestEntry?: Date; hitRate?: number } {
    let oldestTimestamp = Date.now();
    
    this.cache.forEach(entry => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    });

    return {
      totalEntries: this.cache.size,
      cacheSize: this.formatBytes(this.currentCacheSize),
      oldestEntry: this.cache.size > 0 ? new Date(oldestTimestamp) : undefined
    };
  }

  // Méthode pour mapper les noms d'outils vers leurs vrais noms
  private getToolDisplayName(toolId: string): string {
    const tool = TOOLS.find(t => t.id === toolId);
    return tool ? tool.name : toolId;
  }

  // Fonction de post-traitement pour corriger les noms d'outils dans la réponse IA
  private postProcessAttacksAnalysis(attacksAnalysis: any[], execution: ExecutionRecord): { attackName: string; tool: string; status: 'success' | 'failed' | 'partial'; analysis: string; recommendations?: string }[] {
    return attacksAnalysis.map((attack, index) => {
      // Essayer de mapper l'attaque avec l'exécution réelle
      const executionAttack = execution.attacks[index];
      let correctedAttackName = attack.attackName;
      let correctedToolName = attack.tool;
      
      if (executionAttack) {
        const enrichedInfo = this.getEnrichedAttackInfo(executionAttack);
        
        // Si l'IA a utilisé des noms génériques ou incorrects, les corriger
        if (attack.attackName === `Attack ${index + 1}` || attack.attackName.includes('Attack ')) {
          correctedAttackName = enrichedInfo.attackDisplayName;
        }
        
        // Corriger le nom de l'outil s'il contient des IDs techniques
        if (attack.tool === executionAttack.tool || attack.tool.includes('5greplay') || attack.tool.includes('aiknx')) {
          correctedToolName = enrichedInfo.toolDisplayName;
        }
      }
      
      // Normaliser le status
      let normalizedStatus: 'success' | 'failed' | 'partial' = 'partial';
      if (typeof attack.status === 'string') {
        const statusLower = attack.status.toLowerCase();
        if (statusLower.includes('success') || statusLower.includes('completed')) {
          normalizedStatus = 'success';
        } else if (statusLower.includes('fail') || statusLower.includes('error')) {
          normalizedStatus = 'failed';
        } else {
          normalizedStatus = 'partial';
        }
      }
      
      return {
        attackName: correctedAttackName,
        tool: correctedToolName,
        status: normalizedStatus,
        analysis: attack.analysis || 'Analysis not provided',
        recommendations: attack.recommendations
      };
    });
  }

  // Vérifier si des améliorations ont été apportées et invalider le cache si nécessaire
  private checkForImprovements(): void {
    const IMPROVEMENTS_VERSION = '1.4'; // Incrémenter à chaque amélioration majeure
    const lastVersion = localStorage.getItem('ai-analysis-improvements-version');
    const lastCheck = localStorage.getItem('ai-analysis-last-check');
    const now = Date.now();
    
    // Ne vérifier qu'une fois par heure maximum
    if (lastCheck && (now - parseInt(lastCheck)) < 60 * 60 * 1000) {
      console.log('AI Analysis improvements check skipped (checked recently)');
      return;
    }
    
    if (lastVersion !== IMPROVEMENTS_VERSION) {
      console.log(`AI Analysis improvements detected (v${lastVersion} → v${IMPROVEMENTS_VERSION}). Invalidating cache...`);
      this.invalidateAllCache();
      localStorage.setItem('ai-analysis-improvements-version', IMPROVEMENTS_VERSION);
    } else {
      console.log(`AI Analysis version ${IMPROVEMENTS_VERSION} already applied, cache preserved`);
    }
    
    // Marquer la dernière vérification
    localStorage.setItem('ai-analysis-last-check', now.toString());
  }

  // Nouvelle méthode pour analyser les erreurs spécifiques dans l'output d'une attaque
  private analyzeAttackErrors(attack: any): string | null {
    if (!attack.output || attack.output.length === 0) {
      return null;
    }

    const errorMessages: string[] = [];
    
    // Analyser les erreurs dans l'output
    attack.output.forEach((line: any) => {
      if (line.type === 'error' && line.content) {
        const content = line.content.toLowerCase();
        
        // Erreurs Docker spécifiques
        if (content.includes('cannot connect to docker daemon')) {
          errorMessages.push('Docker daemon not running or not accessible');
        } else if (content.includes('pull access denied')) {
          errorMessages.push('Docker image access denied - authentication or repository issue');
        } else if (content.includes('repository does not exist')) {
          errorMessages.push('Docker repository not found or private');
        } else if (content.includes('docker login')) {
          errorMessages.push('Docker authentication required');
        } else if (content.includes('process exited with code 125')) {
          errorMessages.push('Docker command execution failed (code 125)');
        } else if (content.includes('unable to find image')) {
          errorMessages.push('Docker image not available locally');
        }
        // Erreurs réseau
        else if (content.includes('connection refused') || content.includes('network unreachable')) {
          errorMessages.push('Network connectivity issue to target');
        }
        // Erreurs de permissions
        else if (content.includes('permission denied')) {
          errorMessages.push('Permission denied - check file/directory access');
        }
        // Erreurs de timeout
        else if (content.includes('timeout') || content.includes('timed out')) {
          errorMessages.push('Operation timed out');
        }
      }
    });

    // Retourner un résumé des erreurs trouvées
    if (errorMessages.length > 0) {
      const uniqueErrors = Array.from(new Set(errorMessages));
      return uniqueErrors.join('; ');
    }

    return null;
  }

  private calculateSize(data: any): number {
    // Estimation approximative de la taille en bytes
    return JSON.stringify(data).length * 2; // UTF-16 = 2 bytes par caractère
  }

  private cleanupCache(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];
    
    // Supprimer les entrées expirées
    this.cache.forEach((value, key) => {
      if (now - value.timestamp > this.CACHE_EXPIRY) {
        entriesToDelete.push(key);
      }
    });

    // Si on dépasse encore les limites, supprimer les plus anciennes
    if (this.cache.size > this.MAX_CACHE_ENTRIES || this.currentCacheSize > this.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Supprimer les plus anciennes jusqu'à atteindre 80% des limites
      const targetEntries = Math.floor(this.MAX_CACHE_ENTRIES * 0.8);
      const targetSize = Math.floor(this.MAX_CACHE_SIZE * 0.8);
      
      while ((this.cache.size > targetEntries || this.currentCacheSize > targetSize) && sortedEntries.length > 0) {
        const [key] = sortedEntries.shift()!;
        entriesToDelete.push(key);
      }
    }

    // Supprimer les entrées marquées
    entriesToDelete.forEach(key => {
      const entry = this.cache.get(key);
      if (entry) {
        this.currentCacheSize -= entry.size;
        this.cache.delete(key);
      }
    });

    if (entriesToDelete.length > 0) {
      console.log(`Cache cleanup: removed ${entriesToDelete.length} entries, current size: ${this.formatBytes(this.currentCacheSize)}`);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private addToCache(key: string, data: any): void {
    const size = this.calculateSize(data);
    
    // Vérifier si l'entrée est trop grande pour le cache
    if (size > this.MAX_CACHE_SIZE * 0.1) { // Pas plus de 10% du cache pour une seule entrée
      console.warn(`Cache entry too large (${this.formatBytes(size)}), skipping cache for ${key}`);
      return;
    }

    // Nettoyer le cache si nécessaire
    this.cleanupCache();

    // Ajouter la nouvelle entrée
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size
    });
    
    this.currentCacheSize += size;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_EXPIRY) {
      this.currentCacheSize -= cached.size;
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private validateAndProcessAnalysis(parsed: any, execution: ExecutionRecord): AIAnalysisResult {
    // Valider que l'objet parsé a la structure attendue
    if (typeof parsed === 'object' && parsed !== null) {
      const aiResult: AIAnalysisResult = {
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Analysis completed',
        attacksAnalysis: Array.isArray(parsed.attacksAnalysis) ? 
          this.postProcessAttacksAnalysis(parsed.attacksAnalysis, execution) : [],
        overallAssessment: typeof parsed.overallAssessment === 'string' ? parsed.overallAssessment : 'Assessment completed',
        securityImplications: typeof parsed.securityImplications === 'string' ? parsed.securityImplications : 'Security implications analyzed',
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : ['Review results', 'Implement recommendations'],
        wazuhIntegration: parsed.wazuhIntegration && typeof parsed.wazuhIntegration === 'object' ? parsed.wazuhIntegration : undefined,
        timestamp: new Date(),
        provider: 'openrouter' as AIProvider, // Will be overridden
        model: 'unknown' // Will be overridden
      };
      return aiResult;
    }
    
    throw new Error('Invalid parsed object structure');
  }

  // Méthode pour exporter le rapport en PDF
  async exportToPDF(analysis: any, scenario: any): Promise<void> {
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();
      
      let yPosition = 20;
      
      const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        if (isBold) {
          doc.setFont(undefined, 'bold');
        } else {
          doc.setFont(undefined, 'normal');
        }
        
        const lines = doc.splitTextToSize(text, 170);
        lines.forEach((line: string) => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += fontSize * 0.5;
        });
        yPosition += 5;
      };

      // En-tête
      addText('AI Security Analysis Report', 20, true);
      addText(`Scenario: ${scenario.name}`, 14, true);
      addText(`Generated: ${new Date().toLocaleString()}`, 10);
      yPosition += 10;

      // Résumé exécutif
      if (analysis.summary) {
        addText('Executive Summary', 16, true);
        addText(analysis.summary, 11);
        yPosition += 5;
      }

      // Analyse des attaques
      if (analysis.attacksAnalysis && analysis.attacksAnalysis.length > 0) {
        addText('Attack Analysis', 16, true);
        analysis.attacksAnalysis.forEach((attack: any, index: number) => {
          addText(`${index + 1}. ${attack.attackName} (${attack.tool})`, 12, true);
          addText(`Status: ${attack.status}`, 10);
          if (attack.analysis) {
            addText(attack.analysis, 10);
          }
          if (attack.recommendations) {
            addText('Recommendations:', 10, true);
            addText(attack.recommendations, 10);
          }
          yPosition += 5;
        });
      }

      // Évaluation globale
      if (analysis.overallAssessment) {
        addText('Overall Assessment', 16, true);
        addText(analysis.overallAssessment, 11);
        yPosition += 5;
      }

      // Implications de sécurité
      if (analysis.securityImplications) {
        addText('Security Implications', 16, true);
        addText(analysis.securityImplications, 11);
        yPosition += 5;
      }

      // Prochaines étapes
      if (analysis.nextSteps && analysis.nextSteps.length > 0) {
        addText('Next Steps', 16, true);
        analysis.nextSteps.forEach((step: string, index: number) => {
          addText(`${index + 1}. ${step}`, 10);
        });
      }

      // Intégration Wazuh
      if (analysis.wazuhIntegration) {
        yPosition += 10;
        addText('Wazuh Security Analysis', 16, true);
        
        if (analysis.wazuhIntegration.alertsSummary) {
          addText('Alerts Summary:', 12, true);
          addText(analysis.wazuhIntegration.alertsSummary, 10);
        }
        
        if (analysis.wazuhIntegration.criticalFindings && analysis.wazuhIntegration.criticalFindings.length > 0) {
          addText('Critical Findings:', 12, true);
          analysis.wazuhIntegration.criticalFindings.forEach((finding: string) => {
            addText(`• ${finding}`, 10);
          });
        }
        
        if (analysis.wazuhIntegration.networkAnalysis) {
          addText('Network Analysis:', 12, true);
          addText(analysis.wazuhIntegration.networkAnalysis, 10);
        }
        
        if (analysis.wazuhIntegration.recommendations && analysis.wazuhIntegration.recommendations.length > 0) {
          addText('Wazuh Recommendations:', 12, true);
          analysis.wazuhIntegration.recommendations.forEach((rec: string) => {
            addText(`• ${rec}`, 10);
          });
        }
      }

      // Métadonnées
      yPosition += 10;
      addText('Analysis Metadata', 14, true);
      addText(`Provider: ${analysis.provider}`, 10);
      addText(`Model: ${analysis.model}`, 10);
      addText(`Timestamp: ${new Date(analysis.timestamp).toLocaleString()}`, 10);

      // Sauvegarde
      const fileName = `ai-analysis-${scenario.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  }
}

export default new AIAnalysisService();
export type { AIAnalysisResult };

// Exposer les méthodes de test sur l'objet window pour le débogage
if (typeof window !== 'undefined') {
  (window as any).testAIJsonParsing = () => {
    const service = new AIAnalysisService();
    service.testCommonPatterns();
    return service;
  };
} 