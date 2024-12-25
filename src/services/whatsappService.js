const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

class WhatsappService extends EventEmitter {
    constructor() {
        super();
        this.clients = new Map();
        this.qrCodes = new Map();
        this.initializingClients = new Map(); // Track initializing clients
    }

    isClientInitialized(userId) {
        const client = this.clients.get(userId);
        return client && client.info && client.info.wid; // Check if client exists and is properly connected
    }


    async initializeClient(userId, phoneNumber) {
        // Clear existing client if any
        await this.disconnectClient(userId);
        
        const sessionDir = path.join(__dirname, '../../sessions', userId);
        
        // Clear existing session
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
        
        fs.mkdirSync(sessionDir, { recursive: true });

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

        // Update user status to not authenticated initially
        await User.findByIdAndUpdate(userId, {
            isAuthenticated: false,
            lastActive: new Date()
        });

        this.setupClientEvents(client, userId, phoneNumber);
        
        await client.initialize();
        
        this.clients.set(userId, client);
        return client;
    }

    async restoreSession(userId, phoneNumber) {
        console.log(`Attempting to restore session for user ${userId}`);
        
        if (this.clients.get(userId)) {
            console.log('Client already exists, destroying old client...');
            await this.disconnectClient(userId);
        }

        const sessionDir = path.join(__dirname, '../../sessions', userId);
        
        if (!fs.existsSync(sessionDir)) {
            throw new Error('No session data found');
        }

        console.log('Creating new client with existing session...');
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

        return new Promise((resolve, reject) => {
            client.on('ready', async () => {
                console.log('Client restored and ready');
                await User.findByIdAndUpdate(userId, {
                    isAuthenticated: true,
                    lastActive: new Date()
                });
                resolve(client);
            });

            client.on('auth_failure', async () => {
                console.log('Auth failed during restoration');
                await this.disconnectClient(userId);
                reject(new Error('Authentication failed'));
            });

            client.initialize().catch(async (error) => {
                console.error('Failed to initialize client:', error);
                await this.disconnectClient(userId);
                reject(error);
            });

            // Set timeout for initialization
            setTimeout(async () => {
                if (!client.info) {
                    console.log('Client initialization timed out');
                    await this.disconnectClient(userId);
                    reject(new Error('Client initialization timed out'));
                }
            }, 30000); // 30 seconds timeout

            this.clients.set(userId, client);
        });
    }


    async setupClientEvents(client, userId, phoneNumber) {
        client.on('qr', async (qr) => {
            try {
                const qrDataURL = await qrcode.toDataURL(qr);
                this.qrCodes.set(userId, qrDataURL);
                // Update user in database to show QR was generated
                await User.findByIdAndUpdate(userId, {
                    isAuthenticated: false,
                    lastActive: new Date()
                });
                this.emit('qr', { userId, qrDataURL });
            } catch (error) {
                console.error('QR generation error:', error);
            }
        });

        client.on('ready', async () => {
            console.log(`Client ready for user ${userId}`);
            try {
                await User.findByIdAndUpdate(userId, {
                    isAuthenticated: true,
                    lastActive: new Date()
                });
                this.emit('ready', { userId, phoneNumber });
            } catch (error) {
                console.error('Error updating user ready status:', error);
            }
        });

        client.on('authenticated', async (session) => {
            console.log(`Client authenticated for user ${userId}`);
            try {
                await User.findByIdAndUpdate(userId, {
                    isAuthenticated: true,
                    lastActive: new Date(),
                    whatsappSessionData: JSON.stringify(session)
                });
                this.emit('authenticated', { userId, phoneNumber });
            } catch (error) {
                console.error('Error updating user authentication:', error);
            }
        });

        client.on('disconnected', async (reason) => {
            console.log(`Client disconnected for user ${userId}:`, reason);
            try {
                await User.findByIdAndUpdate(userId, {
                    isAuthenticated: false,
                    lastActive: new Date(),
                    whatsappSessionData: null
                });
                this.clients.delete(userId);
                this.qrCodes.delete(userId);
                this.emit('disconnected', { userId, reason });
            } catch (error) {
                console.error('Error updating user disconnection:', error);
            }
        });
    }

    async sendMessage(userId, recipientNumber, message) {
        const client = this.clients.get(userId);
        
        if (!client) {
            throw new Error('WhatsApp client not initialized. Please scan QR code first.');
        }

        // Verify client is ready
        if (!client.info) {
            throw new Error('WhatsApp client not ready. Please wait for client initialization.');
        }

        // Format phone number
        const formattedNumber = recipientNumber.includes('@c.us') 
            ? recipientNumber 
            : `${recipientNumber.replace(/[^\d]/g, '')}@c.us`;

        try {
            const response = await client.sendMessage(formattedNumber, message);
            // Update last active timestamp
            await User.findByIdAndUpdate(userId, {
                lastActive: new Date()
            });
            return response;
        } catch (error) {
            console.error('Message sending error:', error);
            throw error;
        }
    }

    getQRCode(userId) {
        const qrCode = this.qrCodes.get(userId);
        if (!qrCode) {
            throw new Error('QR code not found. Please initialize client first.');
        }
        return qrCode;
    }

    isClientInitialized(userId) {
        return this.clients.has(userId) && this.clients.get(userId).info != null;
    }

    async disconnectClient(userId) {
        const client = this.clients.get(userId);
        if (client) {
            try {
                await client.destroy();
            } catch (error) {
                console.error('Error destroying client:', error);
            }
            this.clients.delete(userId);
            this.qrCodes.delete(userId);
            
            // Update user status
            await User.findByIdAndUpdate(userId, {
                isAuthenticated: false,
                whatsappSessionData: null,
                lastActive: new Date()
            });
        }
    }

    isClientInitialized(userId) {
        const client = this.clients.get(userId);
        return client && client.info && client.info.wid && this.clients.has(userId);
    }
    
}

module.exports = new WhatsappService();