const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

async function queryCategories() {
  const url = `${envConfig.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/transaction_categories?select=id,category_code,name,type`;
  const response = await fetch(url, {
    headers: {
      'apikey': envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    console.error('Error fetching data:', await response.text());
    return;
  }
  
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

queryCategories();
