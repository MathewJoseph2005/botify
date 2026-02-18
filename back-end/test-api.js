// Test signup and login endpoints
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

async function testAPI() {
  console.log('🧪 Testing Botify API Endpoints\n');
  
  // Generate a unique email for testing
  const timestamp = Date.now();
  const testUser = {
    name: 'Test User',
    email: `test${timestamp}@example.com`,
    password: 'password123',
    phone: '1234567890',
    role: 'buyer'
  };
  
  try {
    // Test Signup
    console.log('Test 1: User Signup');
    console.log(`Registering user: ${testUser.email}`);
    
    const signupResponse = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    const signupData = await signupResponse.json();
    
    if (!signupData.success) {
      console.error('❌ Signup failed:', signupData.message);
      return;
    }
    
    console.log('✅ Signup successful!');
    console.log(`   User ID: ${signupData.user.user_id}`);
    console.log(`   Token received: ${signupData.token.substring(0, 20)}...`);
    
    // Test Login
    console.log('\nTest 2: User Login');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.message);
      return;
    }
    
    console.log('✅ Login successful!');
    console.log(`   Welcome ${loginData.user.name}!`);
    console.log(`   Role: ${loginData.user.role_name}`);
    
    // Test Token Verification
    console.log('\nTest 3: Token Verification');
    const verifyResponse = await fetch(`${API_URL}/auth/verify`, {
      headers: { 
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    const verifyData = await verifyResponse.json();
    
    if (!verifyData.success) {
      console.error('❌ Token verification failed:', verifyData.message);
      return;
    }
    
    console.log('✅ Token verification successful!');
    console.log(`   Verified user: ${verifyData.user.email}`);
    
    console.log('\n🎉 All API tests passed! Your backend is fully functional!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nNote: Make sure the server is running first with: npm start\n');
  }
}

testAPI();
