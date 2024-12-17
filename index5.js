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
        const message = `
        
        നിങ്ങൾ ഒരു യോഗ ട്രെയിനർ ആണോ, അല്ലെങ്കിൽ ട്രെയിനർ ആവാൻ ആഗ്രഹമൊണ്ടോ? ഒരു ഗവൺമെൻറ് സർട്ടിഫൈഡ് ട്രെയിനർ ആവൂ
Become a Certified Yoga Professional from Ministry of AYUSH, Govt.of India 
ഇന്ത്യാ ഗവൺമൻ്റിനു കീഴിൽ ആയുഷ് മന്ത്രാലയത്തിൻ്റെ യോഗ സർട്ടിഫിക്കേഷൻ നേടാൻ അവസരം.
Never miss the chance to get internationally certified as  Yoga Trainer from Government of India
താല്പര്യമുള്ളവർ വാട്സാപ്പിൽ ജോയിൻ ചെയ്യുക 
 WhatsApp group: https://chat.whatsapp.com/HLiXu7CtsGECDvom1iNIDe
സർട്ടിഫിക്കേഷൻ, പരീക്ഷാ ഫീസ്, സിലബസ്, മറ്റെല്ലാ വിവരങ്ങളും അറിയാൻ ഉടനടി വാട്സാപ്പിൽ ജോയിൻ ചെയ്യുക. 
ശ്രദ്ധിക്കുക 
#  Level 1, Level 2 and Level 3 സർട്ടിഫിക്കേഷൻസ്.
#  ഓൺലൈൻ പരീക്ഷകൾ (തിയറി/ പ്രാക്ടിക്കൽ)
# പൂർണ്ണമായും മലയാളത്തിൽ അറ്റൻഡ് ചെയ്യാം
#  പരീക്ഷയ്ക്ക് വേണ്ടിയുള്ള സ്പെഷ്യൽ ട്രെയിനിംഗ് സെഷനിൽ പങ്കെടുക്കാം.
# സീറ്റുകൾ പരിമിതം
        
        
        
        
        `;
        const imagePath = './assets/image.jpg'; // Default image path if needed
        const interval = 7000; // Interval in milliseconds (e.g., 30000ms = 30 seconds)

        startMessaging(filePath, message, imagePath, interval);
    });
});

client.on('authenticated', (session) => {
    console.log('Authenticated!');
    // Save the session for future use
    if (session) {
        saveSession(session);  // Ensure session is valid
    } else {
        console.error('Received invalid session data.');
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

// Function to send messages periodically with an optional image
// Function to send messages periodically with an optional image
async function sendMessages(numbers, message, imagePath) {
    let media = null;
    let logs = []; // Array to store log entries

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

    for (let i = 0; i < numbers.length; i++) {
        const number = numbers[i];
        const formattedNumber = `${number.phone}@c.us`; // Ensure number is in international format

        try {
            console.log(`Sending image to ${number.phone}`);
            if (media) {
                await client.sendMessage(formattedNumber, media); // Send the image without a caption
            } else {
                console.log('No image to send');
            }

            console.log(`Sending message to ${number.phone}`);
            await client.sendMessage(formattedNumber, message); // Send the message separately
            console.log(`Message sent to: ${number.phone}`);

            logs.push(`Message sent to: ${number.phone}`);
        } catch (error) {
            console.error(`Failed to send message to ${number.phone}: ${error.message}`);
            logs.push(`Failed to send message to ${number.phone}: ${error.message}`);
        }

        // Calculate a random timeout between 10 and 35 seconds
        const randomTimeout = Math.floor(Math.random() * (35 - 10 + 1) + 10) * 1000; // Random interval in milliseconds
        console.log(`Waiting for ${randomTimeout / 1000} seconds before sending the next message...`);

        // Wait for the random timeout before sending the next message
        await new Promise((resolve) => setTimeout(resolve, randomTimeout));
    }

    console.log('Finished sending messages.');

    // Create log PDF with a datetime-based filename
    createLogPDF(logs);

    // Logout after sending all messages
    client.logout().then(() => {
        console.log('Client has logged out successfully.');
    }).catch((err) => {
        console.error('Failed to logout:', err.message);
    });
}

// Main function to start messaging
function startMessaging(filePath, message, imagePath, interval) {
    // Check if the Excel file exists
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    // Read numbers from the Excel file
    const numbers = readExcel(filePath);

    // Send messages with the provided parameters
    sendMessages(numbers, message, imagePath, interval);
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
        // Ensure session is a valid object before attempting to save
        if (session && typeof session === 'object') {
            fs.writeFileSync(sessionFile, JSON.stringify(session));
            console.log('Session saved successfully.');
        } else {
            console.error('Invalid session data to save.');
        }
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
    return null; // Return null if no session is found
}

// Function to create log PDF with datetime-based filename
// Function to create log PDF with datetime-based filename in ddmmyy-hh-mm format
function createLogPDF(logs) {
    const doc = new PDFDocument();

    // Get the current date and time for unique filename in ddmmyy-hh-mm format
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const year = String(now.getFullYear()).slice(-2); // Last two digits of the year
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    // Format the filename as ddmmyy-hh-mm
    const timestamp = `${day}${month}${year}-${hours}-${minutes}`;
    const logFilePath = `log-${timestamp}.pdf`; // Log filename based on timestamp

    // Create a write stream for the PDF file
    const writeStream = fs.createWriteStream(logFilePath);
    doc.pipe(writeStream);

    // Add a title and log entries
    doc.fontSize(18).text('WhatsApp Message Sending Log', { align: 'center' });
    doc.fontSize(12).moveDown();

    logs.forEach(log => {
        doc.text(log);
    });

    // Finalize the PDF document
    doc.end();

    console.log(`Log saved to ${logFilePath}`);
}
