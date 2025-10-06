// test-connection.js
import axios from 'axios';

const REMOTE_API_URL = 'http://127.0.0.1:5002/api/v0/id';

async function runTest() {
    console.log(`Attempting to connect to remote node at ${REMOTE_API_URL}...`);
    
    try {
        // We use a POST request, as required by the IPFS API
        const response = await axios.post(REMOTE_API_URL);
        
        console.log("✅ SUCCESS! Connection is working.");
        console.log("Response data:", response.data);
    } catch (error) {
        console.error("❌ FAILURE! The connection failed.");
        if (error.code) {
            console.error(`Error Code: ${error.code}`);
        }
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error("Data:", error.response.data);
        } else {
            console.error("Error Message:", error.message);
        }
    }
}

runTest();