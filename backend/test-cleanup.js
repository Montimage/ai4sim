const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2N2I3MDJkZDRhYTRiM2I0YjcwYTNmM2QiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDg0NDI0MzEsImV4cCI6MTc0ODUyODgzMX0.409Qkk0ckG3nXAr16uvKl7FCTsRPa7LgdkVneWK4aUo';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TEST_USER_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testCleanup() {
  try {
    console.log('🧪 Test du système de nettoyage des exécutions...\n');

    // 1. Obtenir les statistiques actuelles
    console.log('📊 Statistiques avant nettoyage:');
    const statsBefore = await api.get('/api/executions/stats');
    console.log(JSON.stringify(statsBefore.data, null, 2));

    // 2. Lancer le nettoyage
    console.log('\n🧹 Lancement du nettoyage...');
    const cleanupResult = await api.post('/api/executions/cleanup/stale');
    console.log('Résultat du nettoyage:', cleanupResult.data);

    // 3. Obtenir les statistiques après nettoyage
    console.log('\n📊 Statistiques après nettoyage:');
    const statsAfter = await api.get('/api/executions/stats');
    console.log(JSON.stringify(statsAfter.data, null, 2));

    // 4. Lister toutes les exécutions
    console.log('\n📋 Liste des exécutions:');
    const executions = await api.get('/api/executions');
    console.log(`Total: ${executions.data.length} exécutions`);
    
    executions.data.forEach((exec, index) => {
      const startTime = new Date(exec.startTime);
      const duration = exec.endTime ? 
        Math.floor((new Date(exec.endTime) - startTime) / 60000) : 
        Math.floor((Date.now() - startTime) / 60000);
      
      console.log(`${index + 1}. ${exec.id.slice(-8)} - ${exec.status} - ${duration}min`);
    });

    console.log('\n✅ Test terminé avec succès!');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.response?.data || error.message);
  }
}

// Lancer le test
testCleanup(); 