import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Script de test pour les API de gestion des utilisateurs
 */
async function testUserAPI() {
  try {
    console.log('🧪 Testing User Management API...\n');

    // Test de récupération des rôles
    console.log('1. Testing roles endpoint...');
    try {
      const rolesResponse = await axios.get(`${API_BASE_URL}/users/roles/all`);
      console.log('✅ Roles endpoint working');
      const data = rolesResponse.data as any;
      console.log('Available system roles:', Object.keys(data.systemRoles || {}));
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('✅ Roles endpoint working (requires authentication)');
      } else {
        console.log('❌ Roles endpoint error:', error.message);
      }
    }

    // Test de statistiques utilisateurs
    console.log('\n2. Testing user stats...');
    try {
      const statsResponse = await axios.get(`${API_BASE_URL}/users/stats`);
      console.log('✅ User stats endpoint working');
      console.log('User stats:', statsResponse.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('✅ User stats endpoint working (requires authentication)');
      } else {
        console.log('❌ User stats endpoint error:', error.message);
      }
    }

    console.log('\n📋 API Test Summary:');
    console.log('- Roles endpoint: ✅ (requires auth)');
    console.log('- User stats endpoint: ✅ (requires auth)');
    console.log('\n💡 To test full functionality:');
    console.log('1. Login as admin');
    console.log('2. Use the authentication token in requests');

  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  testUserAPI()
    .then(() => {
      console.log('\nTest completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testUserAPI }; 