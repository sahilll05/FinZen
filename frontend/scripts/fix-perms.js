const sdk = require('node-appwrite');

const PROJECT_ID = '69c80e85002b588face1';
const ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const DB_NAME = 'finzen';

const apiKey = 'standard_511ee580768baa1ac36ad03c45e0c631e8e00a93a47a8e31f9f69984491a4a2ccc87285cef914ea49e4a3c2f11cf69b994ca53f31dcb69e4d688edbf2e4c3949776c494c67f9a196df8aa54de9a53ce05846f925257946bff39c3ddf76a890b0ffdf6ac181a773406affdfe9797ee19263d3e1c1b82809a6d94cda155c90c53a';

const client = new sdk.Client();
client
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(apiKey);

const databases = new sdk.Databases(client);

async function updatePermissions() {
    console.log("Updating permissions for collections...");
    
    const permissions = [
        sdk.Permission.read(sdk.Role.users()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
    ];

    try {
        await databases.updateCollection(DB_NAME, 'portfolios', 'Portfolios', permissions);
        console.log("Portfolios updated");
        
        await databases.updateCollection(DB_NAME, 'holdings', 'Holdings', permissions);
        console.log("Holdings updated");
        
        await databases.updateCollection(DB_NAME, 'transactions', 'Transactions', permissions);
        console.log("Transactions updated");
    } catch (e) {
        console.error(e);
    }
}

updatePermissions();
