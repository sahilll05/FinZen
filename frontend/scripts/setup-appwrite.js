const sdk = require('node-appwrite');

const PROJECT_ID = '69c80e85002b588face1';
const ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const DB_NAME = 'finzen';

// Setup CLI Argument
const apiKey = process.argv[2];

if (!apiKey) {
    console.error("❌ ERROR: Appwrite API Key is required.");
    console.log("👉 Usage: node setup-appwrite.js <YOUR_APPWRITE_API_KEY>");
    console.log("   (You can generate an API Key in your Appwrite Console under 'Overview' -> 'Integrate with your server' with 'databases.write' permission)");
    process.exit(1);
}

const client = new sdk.Client();
client
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(apiKey);

const databases = new sdk.Databases(client);

// Utility to sleep (Appwrite attribute creation needs time to build before creating indexes)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log("🚀 Starting FinZen Appwrite Database Bootstrapping...");

    // 1. Create Database
    let dbId = DB_NAME; // In Appwrite we can force the ID
    try {
        console.log(`\n⏳ Creating database '${DB_NAME}'...`);
        await databases.create(DB_NAME, 'FinZen');
        console.log(`✅ Database '${DB_NAME}' created.`);
    } catch (err) {
        if (err.code === 409) {
            console.log(`⚠️ Database '${DB_NAME}' already exists. Proceeding...`);
        } else {
            console.error(err);
            process.exit(1);
        }
    }

    // --- PORTFOLIOS COLLECTION ---
    try {
        console.log("\n⏳ Creating collection 'portfolios'...");
        await databases.createCollection(dbId, 'portfolios', 'Portfolios');
        
        console.log("⏳ Adding attributes to 'portfolios'...");
        await databases.createStringAttribute(dbId, 'portfolios', 'user_id', 36, true);
        await databases.createStringAttribute(dbId, 'portfolios', 'name', 100, true);
        await databases.createStringAttribute(dbId, 'portfolios', 'currency', 10, true);
        await databases.createDatetimeAttribute(dbId, 'portfolios', 'created_at', false);

        console.log("⏳ Yielding 5s for attributes to build...");
        await sleep(5000);

        console.log("⏳ Creating indexes for 'portfolios'...");
        await databases.createIndex(dbId, 'portfolios', 'idx_user_id', sdk.IndexType.Key, ['user_id'], ['ASC']);
        console.log("✅ 'portfolios' collection ready.");
    } catch (err) {
         if (err.code === 409) console.log(`⚠️ Collection 'portfolios' already exists or attributes duplicate. Proceeding...`);
         else console.error(err);
    }

    // --- HOLDINGS COLLECTION ---
    try {
        console.log("\n⏳ Creating collection 'holdings'...");
        await databases.createCollection(dbId, 'holdings', 'Holdings');
        
        console.log("⏳ Adding attributes to 'holdings'...");
        await databases.createStringAttribute(dbId, 'holdings', 'portfolio_id', 36, true);
        await databases.createStringAttribute(dbId, 'holdings', 'user_id', 36, true);
        await databases.createStringAttribute(dbId, 'holdings', 'ticker', 20, true);
        await databases.createStringAttribute(dbId, 'holdings', 'company_name', 200, false);
        await databases.createStringAttribute(dbId, 'holdings', 'sector', 100, false);
        await databases.createFloatAttribute(dbId, 'holdings', 'quantity', true);
        await databases.createFloatAttribute(dbId, 'holdings', 'avg_cost', true);
        await databases.createStringAttribute(dbId, 'holdings', 'country', 50, false);

        console.log("⏳ Yielding 5s for attributes to build...");
        await sleep(5000);

        console.log("⏳ Creating indexes for 'holdings'...");
        await databases.createIndex(dbId, 'holdings', 'idx_portfolio_id', sdk.IndexType.Key, ['portfolio_id'], ['ASC']);
        await databases.createIndex(dbId, 'holdings', 'idx_user_id', sdk.IndexType.Key, ['user_id'], ['ASC']);
        console.log("✅ 'holdings' collection ready.");
    } catch (err) {
         if (err.code === 409) console.log(`⚠️ Collection 'holdings' already exists or attributes duplicate. Proceeding...`);
         else console.error(err);
    }

    // --- TRANSACTIONS COLLECTION ---
    try {
        console.log("\n⏳ Creating collection 'transactions'...");
        await databases.createCollection(dbId, 'transactions', 'Transactions');
        
        console.log("⏳ Adding attributes to 'transactions'...");
        await databases.createStringAttribute(dbId, 'transactions', 'portfolio_id', 36, true);
        await databases.createStringAttribute(dbId, 'transactions', 'user_id', 36, true);
        await databases.createStringAttribute(dbId, 'transactions', 'ticker', 20, true);
        await databases.createStringAttribute(dbId, 'transactions', 'action', 20, true); // "buy" or "sell"
        await databases.createFloatAttribute(dbId, 'transactions', 'quantity', true);
        await databases.createFloatAttribute(dbId, 'transactions', 'price', true);
        await databases.createDatetimeAttribute(dbId, 'transactions', 'date', true);

        console.log("⏳ Yielding 5s for attributes to build...");
        await sleep(5000);

        console.log("⏳ Creating indexes for 'transactions'...");
        await databases.createIndex(dbId, 'transactions', 'idx_portfolio_id', sdk.IndexType.Key, ['portfolio_id'], ['ASC']);
        console.log("✅ 'transactions' collection ready.");
    } catch (err) {
         if (err.code === 409) console.log(`⚠️ Collection 'transactions' already exists or attributes duplicate. Proceeding...`);
         else console.error(err);
    }

    console.log("\n🎉 ALL DONE! Appwrite Schema Bootstrap Complete!");
}

main().catch(console.error);
