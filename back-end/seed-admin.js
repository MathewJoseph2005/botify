import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedAdmin() {
  const adminEmail = 'admin@botify.com';
  const adminPassword = 'Admin@123';
  const adminName = 'Admin User';

  try {
    // Check if admin already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .maybeSingle();

    if (existingUser) {
      console.log('Admin user already exists!');
      console.log('Email:', adminEmail);
      console.log('Password:', adminPassword);
      return;
    }

    // Get admin role_id
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('role_id')
      .eq('role_name', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('Admin role not found. Please run the database migration first.');
      return;
    }

    // Hash password
    const password_hash = await bcrypt.hash(adminPassword, 10);

    // Insert admin user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          name: adminName,
          email: adminEmail,
          password_hash: password_hash,
          role_id: roleData.role_id
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('=== ADMIN CREDENTIALS ===');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('=========================');

  } catch (error) {
    console.error('Error creating admin:', error.message);
  }
}

seedAdmin();
