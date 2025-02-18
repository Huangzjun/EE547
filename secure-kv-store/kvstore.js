const fs = require("fs");
const crypto = require("crypto");
const readline = require("readline-sync");

const STORE_FILE = "store.encjson";

function decryptStore() {
    if (!fs.existsSync(STORE_FILE)) return {};

    console.log("Enter the path to `private.pem` private key:");
    const privateKeyPath = readline.question("Path: ");

    if (!fs.existsSync(privateKeyPath)) {
        console.error("Error: Private key file not found.");
        process.exit(1);
    }

    try {
        const encryptedData = fs.readFileSync(STORE_FILE);
        const privateKey = fs.readFileSync(privateKeyPath, "utf8");

        const decrypted = crypto.privateDecrypt(
            { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
            encryptedData
        );

        return JSON.parse(decrypted.toString());
    } catch (error) {
        console.error("Error: Decryption failed. Ensure you are using the correct private key.");
        process.exit(2);
    }
}

function encryptStore(store) {
    console.log("🔐 Enter the path to `public.pem` public key:");
    const publicKeyPath = readline.question("Path: ");

    if (!fs.existsSync(publicKeyPath)) {
        console.error("Error: Public key file not found.");
        return;
    }

    try {
        const publicKey = fs.readFileSync(publicKeyPath, "utf8");
        const encryptedData = crypto.publicEncrypt(
            { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
            Buffer.from(JSON.stringify(store))
        );

        fs.writeFileSync(STORE_FILE, encryptedData);
        console.log("Data successfully encrypted and saved!");
    } catch (error) {
        console.error("Error: Encryption failed.");
    }
}

function addKeyValue(store) {
    const key = readline.question("Enter Key: ");
    const value = readline.question("Enter Value: ");
    store[key] = value;
    console.log(`✅ Key "${key}" added successfully!`);
}

function deleteKey(store) {
    const key = readline.question("Enter Key to delete: ");
    if (store[key]) {
        delete store[key];
        console.log(`Key "${key}" deleted successfully!`);
    } else {
        console.log("⚠️ Warning: Key does not exist!");
    }
}

function showStore(store) {
    console.log("\n📦 Current Store:", JSON.stringify(store, null, 2));
}

function mainMenu() {
    const store = decryptStore();

    while (true) {
        console.log("\n🔹 Menu:");
        console.log("(1) Add Key-Value");
        console.log("(2) Delete Key");
        console.log("(3) Show Current Store");
        console.log("(4) Encrypt and Save");
        console.log("(5) Exit");

        const choice = readline.question("Enter Option: ");

        switch (choice.trim()) {
            case "1":
                addKeyValue(store);
                break;
            case "2":
                deleteKey(store);
                break;
            case "3":
                showStore(store);
                break;
            case "4":
                encryptStore(store);
                break;
            case "5":
                console.log("Exiting program...");
                process.exit(0);
            default:
                console.log("Error: Invalid option. Please try again.");
        }
    }
}

mainMenu();
