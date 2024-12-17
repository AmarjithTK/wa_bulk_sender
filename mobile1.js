const qrcode = require('qrcode-terminal');
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const xlsx = require('xlsx');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const PDFDocument = require('pdfkit');

// Define paths

const messageConfigFile = './message.json';
// const textLogFilePath = './assets/textlog'; // Persistent text log file

// Initialize the WhatsApp client with persistence
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: 'mobile1',
        clientId: "mobile-one"
    }),
    puppeteer: {
        headless: true, // Set to true for headless mode
    },
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', (session) => {
    console.log('Authenticated!');
});

client.on('auth_failure', (message) => {
    console.log('Authentication failed:', message);
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    getUserInput().then((filePath) => {
        const { firstMessage, thirdMessage, imagePath } = readMessageConfig();
        startMessaging(filePath, firstMessage, thirdMessage, imagePath);
    });
});

client.initialize();

// Function to read the message configuration from message.json
function readMessageConfig() {
    if (!fs.existsSync(messageConfigFile)) {
        throw new Error(`Message configuration file not found: ${messageConfigFile}`);
    }

    const config = JSON.parse(fs.readFileSync(messageConfigFile, 'utf-8'));
    if (!config.firstMessage || !config.thirdMessage) {
        throw new Error('Invalid message configuration. Ensure firstMessage and thirdMessage are defined.');
    }

    return {
        firstMessage: config.firstMessage,
        thirdMessage: config.thirdMessage,
        imagePath: config.imagePath,
    };
}

// Function to read numbers from an Excel file
function readExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(sheet);
}

// Function to send messages and log them to a text file and a PDF
async function sendMessages(numbers, firstMessage, thirdMessage, imagePath, logFilePath,textLogFilePath) {
    let media = null;

    if (imagePath && fs.existsSync(imagePath)) {
        try {
            media = MessageMedia.fromFilePath(imagePath);
        } catch (error) {
            console.error(`Failed to load image: ${error.message}`);
        }
    } else if (imagePath) {
        console.error(`Image file not found: ${imagePath}`);
    }

    // Check if text log file exists; create one if not
    if (!fs.existsSync(textLogFilePath)) {
        fs.writeFileSync(textLogFilePath, '', 'utf-8');
    }

    for (let i = 0; i < numbers.length; i++) {
        const number = numbers[i];
        const formattedNumber = `${number.Phone}@c.us`;

        try {
            // Log start
            let logMessage = `Sending messages to: ${number.Phone}\n`;

            if (media) {
                console.log(`Sending image to ${number.Phone}`);
                await client.sendMessage(formattedNumber, media);
            }

            // Send first message
            console.log(`Sending first message to ${number.Phone}`);
            await client.sendMessage(formattedNumber, firstMessage);

            // Send image if available
          

            // Send third message
            console.log(`Sending third message to ${number.Phone}`);
            await client.sendMessage(formattedNumber, thirdMessage);

            // Append log to text file
            fs.appendFileSync(textLogFilePath, logMessage + '\n');
            console.log(`Logged messages for ${number.Phone} to text file.`);
        } catch (error) {
            console.error(`Failed to send messages to ${number.Phone}: ${error.message}`);
            fs.appendFileSync(textLogFilePath, `Failed to send messages to ${number.Phone}: ${error.message}\n\n`);
        }

        // Wait before sending to the next number
        const randomTimeout = Math.floor(Math.random() * (115 - 40 + 1) + 10) * 1000;
        console.log(`Waiting for ${randomTimeout / 1000} seconds before sending to the next number...`);
        await new Promise((resolve) => setTimeout(resolve, randomTimeout));
    }

    console.log('Finished sending messages. Creating PDF log...');
    generatePDFLog(textLogFilePath, logFilePath);
    process.exit(0)
}

// Function to generate a PDF log from the text log file
function generatePDFLog(textLogFilePath, pdfLogFilePath) {
    if (!fs.existsSync(textLogFilePath)) {
        console.error(`Text log file not found: ${textLogFilePath}`);
        return;
    }

    const logContent = fs.readFileSync(textLogFilePath, 'utf-8');

    // Create a new PDF
    const doc = new PDFDocument();
    const pdfStream = fs.createWriteStream(pdfLogFilePath);

    doc.pipe(pdfStream);

    // Add title
    doc.fontSize(18).text('WhatsApp Message Sending Log', { align: 'center' });
    doc.moveDown();

    // Add log content
    doc.fontSize(12).text(logContent);

    // Finalize the PDF
    doc.end();

    console.log(`PDF log created at: ${pdfLogFilePath}`);
}

// Main function to start messaging
function startMessaging(filePath, firstMessage, thirdMessage, imagePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    const numbers = readExcel(filePath);

    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
    }

    const inputFileName = path.basename(filePath, path.extname(filePath));
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();


    const logFileName = `output-${inputFileName}-${month}-${year}.pdf`;
    const textLogFileName = `output-${inputFileName}-${month}-${year}.txt`;

    const logFilePath = path.join(logsDir, logFileName);
    const textLogFilePath = path.join(logsDir, textLogFileName);

    console.log(`Log files will be saved to: ${logFilePath} and ${textLogFilePath}`);
    sendMessages(numbers, firstMessage, thirdMessage, imagePath, logFilePath, textLogFilePath);



}

// Function to get user input for Excel file path
async function getUserInput() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

    try {
        const filePath = await askQuestion('Enter the path to the Excel file (e.g., ./assets/numbers.xlsx): ');
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
