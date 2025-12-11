const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '.env');
const configPath = path.join(__dirname, 'docs/site/js/config.js');

try {
    if (!fs.existsSync(envPath)) {
        console.error('Error: .env file not found!');
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=(.*)/);

    if (!match || !match[1]) {
        console.error('Error: GEMINI_API_KEY not found in .env');
        process.exit(1);
    }

    const apiKey = match[1].trim();
    const configContent = `// Generated from .env
const CONFIG = {
    GEMINI_API_KEY: "${apiKey}"
};
`;

    fs.writeFileSync(configPath, configContent);
    console.log('Successfully updated docs/site/js/config.js from .env');

} catch (err) {
    console.error('Error:', err.message);
}
