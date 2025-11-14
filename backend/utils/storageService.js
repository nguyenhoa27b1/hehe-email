const fs = require('fs').promises;
const path = require('path');
const { File } = require('../models'); // Use the Sequelize File model

// Define the uploads directory relative to the backend folder
const uploadDir = path.join(__dirname, '..', 'uploads');

// Asynchronously ensure the uploads directory exists
const ensureUploadDirExists = async () => {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
        console.error("Fatal: Could not create uploads directory.", error);
    }
};
ensureUploadDirExists();


/**
 * Saves a file buffer to the local 'uploads' directory. This function
 * only handles the file system operation.
 *
 * @param {Buffer} buffer - The file buffer from multer's memoryStorage.
 * @param {string} originalname - The original name of the file.
 * @returns {Promise<{savedPath: string}>} A promise that resolves with the absolute path of the saved file.
 */
const saveFile = async (buffer, originalname) => {
    // Sanitize filename to prevent path traversal issues and other vulnerabilities.
    const decodedOriginalName = decodeURIComponent(originalname).replace(/[^a-zA-Z0-9.\-_]/g, '_');
    
    // Create a unique filename to prevent overwrites.
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `submission-${uniqueSuffix}-${decodedOriginalName}`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, buffer);
    
    return { savedPath: filePath };
};

/**
 * Retrieves a file's metadata from the database by its ID.
 * @param {string} fileId - The unique ID of the file.
 * @returns {Promise<object|null>} A promise that resolves with the file's metadata object or null if not found.
 */
const getFileInfoFromDb = async (fileId) => {
    try {
        const file = await File.findByPk(fileId);
        return file ? file.toJSON() : null;
    } catch (error) {
        console.error("Error retrieving file info from DB:", error);
        return null;
    }
};


module.exports = { saveFile, getFileInfoFromDb, uploadDir };