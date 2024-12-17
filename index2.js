const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const xlsx = require('xlsx');
const fs = require('fs');
const { execSync } = require('child_process');

// Initialize the WhatsApp client
const client = new Client();

client.on('qr', (qr) => {
    // Generate and display the QR code
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');

    // Get user inputs using zenity
    getUserInputs().then(({ filePath, message, imagePath, interval }) => {
        startMessaging(filePath, message, imagePath, interval);
    });
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
async function sendMessages(numbers, message, imagePath, interval) {
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

    for (let i = 0; i < numbers.length; i++) {
        const number = numbers[i];
        const formattedNumber = `${number.phone}@c.us`; // Ensure number is in international format

        try {
            console.log(`Sending message to ${number.phone}`);
            if (media) {
                await client.sendMessage(formattedNumber, media, { caption: message });
            } else {
                await client.sendMessage(formattedNumber, message);
            }
            console.log(`Message sent to: ${number.phone}`);
        } catch (error) {
            console.error(`Failed to send message to ${number.phone}: ${error.message}`);
        }

        // Wait for the specified interval before sending the next message
        await new Promise((resolve) => setTimeout(resolve, interval));
    }

    console.log('Finished sending messages.');

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

// Function to get user inputs via zenity dialogs
async function getUserInputs() {
    try {
        // Get the Excel file path using zenity file chooser
        const filePath = execSync('zenity --file-selection --title="Select Excel File"').toString().trim();

        // Get the message using zenity text entry
        const message = execSync('zenity --entry --title="Message" --text="Enter the message to send:"').toString().trim();

        // Get the image path using zenity file chooser
        const imagePath = execSync('zenity --file-selection --title="Select Image File"').toString().trim();

        // Get the interval using zenity entry
        const intervalInput = execSync('zenity --entry --title="Interval" --text="Enter the interval in milliseconds:"').toString().trim();
        const interval = parseInt(intervalInput, 10);

        // Return the collected data
        return { filePath, message, imagePath, interval };
    } catch (err) {
        console.error('Error while taking input:', err.message);
        return null;
    }
}
