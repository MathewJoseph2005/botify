// Quick test script to verify Supabase connection
import supabase from './config/database.js';

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  try {
    // Test 1: Check roles table
    console.log('Test 1: Fetching roles from database...');
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*');
    
    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError.message);
      process.exit(1);
    }
    
    console.log('✅ Roles table accessible');
    console.log(`   Found ${roles.length} roles:`, roles.map(r => r.role_name).join(', '));
    
    // Test 2: Check users table
    console.log('\nTest 2: Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count');
    
    if (usersError) {
      console.error('❌ Error accessing users table:', usersError.message);
      process.exit(1);
    }
    
    console.log('✅ Users table accessible');
    
    console.log('\n🎉 All tests passed! Supabase is connected and working properly.\n');
    console.log('Next steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Test signup: POST to http://localhost:5000/api/auth/signup');
    console.log('3. Test login: POST to http://localhost:5000/api/auth/login\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

testConnection();
