/**
 * Script de test pour valider les améliorations du parsing JSON
 * Utilisé pour tester les cas d'erreur courants rencontrés avec les réponses IA
 */

// Exemples de JSON malformés typiques des réponses IA
const testCases = [
  {
    name: "JSON avec virgule en fin d'objet",
    json: `{
      "summary": "Test analysis",
      "attacksAnalysis": [],
      "overallAssessment": "Good",
    }`
  },
  {
    name: "JSON avec virgule en fin de tableau",
    json: `{
      "summary": "Test analysis",
      "nextSteps": [
        "Step 1",
        "Step 2",
      ]
    }`
  },
  {
    name: "JSON tronqué",
    json: `{
      "summary": "Test analysis",
      "attacksAnalysis": [
        {
          "attackName": "Test attack",
          "status": "success"
    `
  },
  {
    name: "JSON avec clés non quotées",
    json: `{
      summary: "Test analysis",
      attacksAnalysis: [],
      overallAssessment: "Good"
    }`
  },
  {
    name: "JSON avec valeurs non quotées",
    json: `{
      "summary": Test analysis,
      "status": success,
      "count": 5
    }`
  }
];

/**
 * Fonction de test pour valider le parsing JSON amélioré
 */
export function testJsonParsing() {
  console.log('🧪 Test du parsing JSON amélioré...\n');
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log('JSON original:', testCase.json);
    
    try {
      // Test du JSON original
      JSON.parse(testCase.json);
      console.log('✅ JSON original valide');
    } catch (error) {
      console.log('❌ JSON original invalide:', error instanceof Error ? error.message : 'Unknown error');
      
      // Test avec réparation (simulation de la méthode repairMalformedJson)
      try {
        const repaired = repairMalformedJson(testCase.json);
        JSON.parse(repaired);
        console.log('✅ JSON réparé avec succès');
        console.log('JSON réparé:', repaired);
      } catch (repairError) {
        console.log('❌ Échec de la réparation:', repairError instanceof Error ? repairError.message : 'Unknown error');
      }
    }
    
    console.log('---\n');
  });
}

/**
 * Simulation de la méthode repairMalformedJson pour les tests
 */
function repairMalformedJson(jsonString: string): string {
  let repaired = jsonString
    // Supprimer les virgules en fin d'objet ou de tableau
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    // Supprimer les caractères de contrôle
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Réparer les guillemets manquants pour les clés
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    // Réparer les valeurs de chaîne non quotées (simple heuristique)
    .replace(/:\s*([^",\[\]{}]+)(?=\s*[,}])/g, (_, value) => {
      const trimmed = value.trim();
      // Ne pas quoter les nombres, booléens, null
      if (/^(true|false|null|\d+\.?\d*)$/.test(trimmed)) {
        return `: ${trimmed}`;
      }
      return `: "${trimmed}"`;
    });

  // Tenter de fermer les objets/tableaux non fermés
  let braceCount = 0;
  let bracketCount = 0;
  
  for (const char of repaired) {
    if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
    else if (char === '[') bracketCount++;
    else if (char === ']') bracketCount--;
  }
  
  // Ajouter les fermetures manquantes
  while (bracketCount > 0) {
    repaired += ']';
    bracketCount--;
  }
  while (braceCount > 0) {
    repaired += '}';
    braceCount--;
  }
  
  return repaired;
}

// Exporter pour utilisation dans la console du navigateur
if (typeof window !== 'undefined') {
  (window as any).testJsonParsing = testJsonParsing;
} 