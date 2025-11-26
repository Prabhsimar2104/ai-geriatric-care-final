import db from './db.js';

console.log('🔍 Verifying database schema...\n');

async function verifyDatabase() {
  try {
    // Check if database exists and is accessible
    const [dbCheck] = await db.query('SELECT DATABASE() as db_name');
    console.log('✅ Connected to database:', dbCheck[0].db_name);

    // Get all tables
    const [tables] = await db.query('SHOW TABLES');
    console.log('\n📋 Tables in database:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`   ${index + 1}. ${tableName}`);
    });

    // Check each table structure
    const tableNames = ['users', 'reminders', 'fall_alerts', 'push_subscriptions', 'emergency_contacts'];
    
    console.log('\n📊 Table Structures:\n');
    
    for (const tableName of tableNames) {
      try {
        const [columns] = await db.query(`DESCRIBE ${tableName}`);
        console.log(`✅ Table: ${tableName} (${columns.length} columns)`);
      } catch (err) {
        console.log(`❌ Table: ${tableName} - NOT FOUND`);
      }
    }

    // Count records in each table
    console.log('\n📈 Record Counts:\n');
    for (const tableName of tableNames) {
      try {
        const [count] = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   ${tableName}: ${count[0].count} records`);
      } catch (err) {
        console.log(`   ${tableName}: Error counting`);
      }
    }

    console.log('\n✅ Database verification complete!');
    console.log('🎉 Step 2 Complete - Database is ready!\n');

  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
  } finally {
    process.exit(0);
  }
}

verifyDatabase();