const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const xlsx = require('xlsx');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const PDFDocument = require('pdfkit');

// Define the session file path
const sessionFile = './assets/whatsapp-session.json';

// Initialize the WhatsApp client with persistence
const client = new Client({
    puppeteer: {
        headless: true, // Set to true for headless mode
    },
    session: loadSession() // Load session from file if exists
});

client.on('qr', (qr) => {
    // Generate and display the QR code
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');

    // Example parameters for testing
    getUserInput().then((filePath) => {
        const message = `നിങ്ങൾ ഒരു യോഗ ട്രെയിനർ ആണോ, അല്ലെങ്കിൽ ട്രെയിനർ ആവാൻ ആഗ്രഹമൊണ്ടോ? ഒരു ഗവൺമെൻറ് സർട്ടിഫൈഡ് ട്രെയിനർ ആവൂ
Become a Certified Yoga Professional from Ministry of AYUSH, Govt.of India 
ഇന്ത്യാ ഗവൺമൻ്റിനു കീഴിൽ ആയുഷ് മന്ത്രാലയത്തിൻ്റെ യോഗ സർട്ടിഫിക്കേഷൻ നേടാൻ അവസരം.
Never miss the chance to get internationally certified as  Yoga Trainer from Government of India
താല്പര്യമുള്ളവർ വാട്സാപ്പിൽ ജോയിൻ ചെയ്യുക 
 WhatsApp group link provided below
സർട്ടിഫിക്കേഷൻ, പരീക്ഷാ ഫീസ്, സിലബസ്, മറ്റെല്ലാ വിവരങ്ങളും അറിയാൻ ഉടനടി വാട്സാപ്പിൽ ജോയിൻ ചെയ്യുക. 
ശ്രദ്ധിക്കുക 
#  Level 1, Level 2 and Level 3 സർട്ടിഫിക്കേഷൻസ്.
#  ഓൺലൈൻ പരീക്ഷകൾ (തിയറി/ പ്രാക്ടിക്കൽ)
# പൂർണ്ണമായും മലയാളത്തിൽ അറ്റൻഡ് ചെയ്യാം
#  പരീക്ഷയ്ക്ക് വേണ്ടിയുള്ള സ്പെഷ്യൽ ട്രെയിനിംഗ് സെഷനിൽ പങ്കെടുക്കാം.
# സീറ്റുകൾ പരിമിതം`; // Example first message
        const imagePath = './assets/image.jpg'; // Default image path if needed

        startMessaging(filePath, message, imagePath);
    });
});

client.on('authenticated', (session) => {
    console.log('Authenticated!');
    // Save the session for future use
    if (session) {
        saveSession(session);
    }
});

client.initialize();

// Function to read numbers and messages from an Excel file
function readExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Assuming the first sheet
    const sheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(sheet); // Convert sheet data to JSON
}

// Function to send messages periodically with an optional image and third message
async function sendMessages(numbers, message, imagePath, logFilePath) {
    let media = null;

    // Load the image if a valid image path is provided
    if (imagePath && fs.existsSync(imagePath)) {
        try {
            media = MessageMedia.fromFilePath(imagePath);
        } catch (error) {
            console.error(`Failed to load image: ${error.message}`);
        }
    } else if (imagePath) {
        console.error(`Image file not found: ${imagePath}`);
    }

    // Initialize the PDF document for logging
    const logStream = fs.createWriteStream(logFilePath);
    const doc = new PDFDocument();
    doc.pipe(logStream);

    doc.fontSize(18).text('WhatsApp Message Sending Log', { align: 'center' });
    doc.fontSize(12).moveDown();

    for (let i = 0; i < numbers.length; i++) {
        const number = numbers[i];
        const formattedNumber = `${number.Phone}@c.us`;

        try {
            // Send first message
            console.log(`Sending first message to ${number.Phone}`);
            await client.sendMessage(formattedNumber, message);
            console.log(`First message sent to: ${number.Phone}`);

            // Log success for the first message
            doc.text(`First message sent to: ${number.Phone}`);

            // Send second message (image if available)
            if (media) {
                console.log(`Sending image to ${number.Phone}`);
                await client.sendMessage(formattedNumber, media);
                console.log(`Image sent to: ${number.Phone}`);

                // Log success for the second message
                doc.text(`Image sent to: ${number.Phone}`);
            }

            // Send third message
            console.log(`Sending third message to ${number.Phone}`);
            const thirdMessage = "https://chat.whatsapp.com/HLiXu7CtsGECDvom1iNIDe";
            await client.sendMessage(formattedNumber, thirdMessage);
            console.log(`Third message sent to: ${number.Phone}`);

            // Log success for the third message
            doc.text(`Third message sent to: ${number.Phone}`);
        } catch (error) {
            console.error(`Failed to send messages to ${number.Phone}: ${error.message}`);

            // Log failure to the PDF
            doc.text(`Failed to send messages to ${number.Phone}: ${error.message}`);
        }

        // Calculate a random timeout between 10 and 35 seconds
        const randomTimeout = Math.floor(Math.random() * (35 - 10 + 1) + 10) * 1000; // Random interval in milliseconds
        console.log(`Waiting for ${randomTimeout / 1000} seconds before sending to the next number...`);

        // Wait for the random timeout before sending to the next number
        await new Promise((resolve) => setTimeout(resolve, randomTimeout));
    }

    console.log('Finished sending messages.');

    // Finalize the PDF document
    doc.end();

    // Logout after sending all messages
    client.logout().then(() => {
        console.log('Client has logged out successfully.');
    }).catch((err) => {
        console.error('Failed to logout:', err.message);
    });
}

// Main function to start messaging
function startMessaging(filePath, message, imagePath) {
    // Check if the Excel file exists
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    // Read numbers from the Excel file
    const numbers = readExcel(filePath);

    // Create logs folder if it doesn't exist
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
    }

    // Extract the Excel file name (without extension) and create a log file path
    const inputFileName = path.basename(filePath, path.extname(filePath));
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const year = now.getFullYear();
    const logFileName = `output-${inputFileName}-${month}-${year}.pdf`;
    const logFilePath = path.join(logsDir, logFileName);

    console.log(`Log file will be saved to: ${logFilePath}`);

    // Send messages with the provided parameters
    sendMessages(numbers, message, imagePath, logFilePath);
}

// Function to get user input for Excel file path
async function getUserInput() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

    try {
        const filePath = await askQuestion('Enter the path to the Excel file (e.g., ./assets/numbers.xlsx): ');

        // Convert to absolute path using realpathSync
        const absoluteFilePath = fs.realpathSync(filePath);
        console.log(`Using file path: ${absoluteFilePath}`);

        rl.close();
        return absoluteFilePath;
    } catch (err) {
        console.error('Error while taking input or resolving path:', err.message);
        rl.close();
    }
}

// Function to save session to a file
function saveSession(session) {
    try {
        fs.writeFileSync(sessionFile, JSON.stringify(session));
        console.log('Session saved successfully.');
    } catch (error) {
        console.error('Failed to save session:', error.message);
    }
}

// Function to load session from a file
function loadSession() {
    try {
        if (fs.existsSync(sessionFile)) {
            const session = require(sessionFile);
            console.log('Session loaded successfully.');
            return session;
        }
    } catch (error) {
        console.error('Failed to load session:', error.message);
    }
    return null;
}
