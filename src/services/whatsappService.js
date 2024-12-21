const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

class WhatsappService extends EventEmitter {
    constructor() {
        super();
        this.clients = new Map();
        this.qrCodes = new Map();
    }

    async initializeClient(userId, phoneNumber) {
        const sessionDir = path.join(__dirname, '../../sessions', userId);
        
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: userId,
                dataPath: sessionDir
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            }
        });

        this.setupClientEvents(client, userId, phoneNumber);
        
        await client.initialize();
        
        this.clients.set(userId, client);
        return client;
    }

    setupClientEvents(client, userId, phoneNumber) {
        client.on('qr', async (qr) => {
            try {
                const qrDataURL = await qrcode.toDataURL(qr);
                this.qrCodes.set(userId, qrDataURL);
                this.emit('qr', { userId, qrDataURL });
            } catch (error) {
                console.error('QR generation error:', error);
            }
        });

        client.on('ready', () => {
            console.log(`Client ready for user ${userId}`);
            this.emit('ready', { userId, phoneNumber });
        });

        client.on('authenticated', () => {
            console.log(`Client authenticated for user ${userId}`);
            this.emit('authenticated', { userId, phoneNumber });
        });

        client.on('disconnected', async (reason) => {
            console.log(`Client disconnected for user ${userId}:`, reason);
            this.clients.delete(userId);
            this.qrCodes.delete(userId);
            this.emit('disconnected', { userId, reason });
        });
    }

    async sendMessage(userId, recipientNumber, message) {
        const client = this.clients.get(userId);
        
        if (!client) {
            throw new Error('Client not initialized');
        }

        // Format phone number
        const formattedNumber = recipientNumber.includes('@c.us') 
            ? recipientNumber 
            : `${recipientNumber.replace(/[^\d]/g, '')}@c.us`;

        try {
            const response = await client.sendMessage(formattedNumber, message);
            return response;
        } catch (error) {
            console.error('Message sending error:', error);
            throw error;
        }
    }

    getQRCode(userId) {
        return this.qrCodes.get(userId);
    }

    isClientInitialized(userId) {
        return this.clients.has(userId);
    }

    disconnectClient(userId) {
        const client = this.clients.get(userId);
        if (client) {
            client.destroy();
            this.clients.delete(userId);
            this.qrCodes.delete(userId);
        }
    }
}

module.exports = new WhatsappService();