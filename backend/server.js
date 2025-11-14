const express = require('express');
const cors = require('cors');
require('dotenv').config();
const multer = require('multer');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');

const { saveFile, getFileInfoFromDb, uploadDir } = require('./utils/storageService');
const { User, Task, File, sequelize } = require('./models');
const { sendTaskChangeNotification } = require('./utils/emailService');


const app = express();
app.use(express.json());
app.use(cors());

const GOOGLE_CLIENT_ID = "939572655563-393g05o2ec4a8s1gg1s6mkd1u91bf1ge.apps.googleusercontent.com";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use('/uploads', express.static(uploadDir));

const upload = multer({ storage: multer.memoryStorage() });

// --- Database Connection ---
const connectToDb = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
        await sequelize.sync({ alter: true });
        console.log("All models were synchronized successfully.");
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};
connectToDb();

// --- Authentication ---

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required.' });
        }

        if (!email.toLowerCase().endsWith('@gmail.com')) {
            return res.status(400).json({ message: 'Registration is only permitted for @gmail.com addresses.' });
        }
        
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'User',
        });
        
        const { password: _, ...userWithoutPassword } = newUser.toJSON();
        res.status(201).json(userWithoutPassword);

    } catch(error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: 'An internal error occurred during signup.' });
    }
});


app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        
        const user = await User.findOne({ where: { email } });
        
        // Combine checks for a non-existent user or a user without a password (Google Sign-In)
        if (!user || !user.password) {
            return res.status(401).json({ 
                message: 'Invalid credentials. Please check your email and password, or sign up. If you registered with Google, please use the Google Sign-In button.' 
            });
        }
        
        // Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials. Please check your email and password.' });
        }
        
        // If credentials are correct, return user data (without password)
        const { password: _, ...userWithoutPassword } = user.toJSON();
        res.status(200).json(userWithoutPassword);
        
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'An internal error occurred during login.' });
    }
});


app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        if (!payload || !payload.email) {
            return res.status(401).json({ message: 'Invalid Google token.' });
        }

        const { name, email, picture } = payload;

        // Find or create the user in the database
        const [user, created] = await User.findOrCreate({
            where: { email: email },
            defaults: {
                name: name,
                email: email,
                avatarUrl: picture,
                role: 'User', // Default role for new users
            },
        });
        
        const { password: _, ...userWithoutPassword } = user.toJSON();
        res.status(200).json(userWithoutPassword);

    } catch (error) {
        console.error("Google auth error:", error);
        res.status(401).json({ message: 'Authentication failed.' });
    }
});


// --- Data Fetching ---

app.get('/api/data', async (req, res) => {
    try {
        const users = await User.findAll({ attributes: { exclude: ['password'] } });
        const tasks = await Task.findAll({
            include: [
                { model: File, as: 'submissionFile' },
                { model: User, as: 'assignee', attributes: { exclude: ['password'] } },
                { model: User, as: 'creator', attributes: { exclude: ['password'] } },
            ]
        });
        res.status(200).json({ users, tasks });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ message: "Failed to fetch data." });
    }
});


// --- Task Management ---

app.post('/api/tasks', async (req, res) => {
    try {
        const newTask = await Task.create(req.body);
        const taskWithAssociations = await Task.findByPk(newTask.id, {
            include: [
                { model: File, as: 'submissionFile' },
                { model: User, as: 'assignee', attributes: { exclude: ['password'] } },
                { model: User, as: 'creator', attributes: { exclude: ['password'] } },
            ]
        });
        
        // Notify assignee
        const assignee = await User.findByPk(taskWithAssociations.assigneeId);
        if (assignee) {
             sendTaskChangeNotification(taskWithAssociations.toJSON(), 'assigned', assignee.email);
        }

        res.status(201).json(taskWithAssociations);
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Failed to create task." });
    }
});

app.put('/api/tasks/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { updates, editorId } = req.body;
        
        const task = await Task.findByPk(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        const originalAssigneeId = task.assigneeId;
        const originalStatus = task.status;

        await task.update(updates);
        
        const updatedTaskWithFile = await Task.findByPk(taskId, {
             include: [
                { model: File, as: 'submissionFile' },
                { model: User, as: 'assignee', attributes: { exclude: ['password'] } },
                { model: User, as: 'creator', attributes: { exclude: ['password'] } },
             ]
        });
        
        const taskJson = updatedTaskWithFile.toJSON();

        // Notification Logic
        const newAssignee = await User.findByPk(taskJson.assigneeId);
        const creator = await User.findByPk(taskJson.creatorId);

        if (updates.assigneeId && updates.assigneeId !== originalAssigneeId) {
             if (newAssignee) sendTaskChangeNotification(taskJson, 'assigned', newAssignee.email);
        } else if (updates.status && updates.status === 'Done' && originalStatus !== 'Done') {
            if (creator) sendTaskChangeNotification(taskJson, 'completed', creator.email);
        } else if (updates.score && task.score) {
             if (newAssignee) sendTaskChangeNotification(taskJson, 'scored', newAssignee.email);
        } else {
            if (newAssignee && newAssignee.id !== editorId) { // Don't notify the person who made the change
                sendTaskChangeNotification(taskJson, 'updated', newAssignee.email);
            }
        }
        
        res.status(200).json(updatedTaskWithFile);
    } catch(error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Failed to update task." });
    }
});

// --- User Management ---

app.put('/api/users/:userId', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await user.update(req.body);
        const { password: _, ...userWithoutPassword } = user.toJSON();
        res.status(200).json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update user' });
    }
});

app.delete('/api/users/:userId', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await user.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// --- File Handling ---

app.post('/api/tasks/:taskId/submit', upload.single('submissionFile'), async (req, res) => {
    try {
        const { taskId } = req.params;
        const uploaderId = req.headers['x-user-id'];

        if (!req.file) return res.status(400).json({ message: 'No file was uploaded.' });
        if (!uploaderId) return res.status(400).json({ message: 'User ID is required.' });

        const task = await Task.findByPk(taskId);
        if (!task) return res.status(404).json({ message: 'Task not found.' });
        
        const { savedPath } = await saveFile(req.file.buffer, req.file.originalname);
        
        const newFile = await File.create({
            originalName: req.file.originalname,
            savedPath: savedPath,
            uploaderId: uploaderId,
        });

        task.submissionFileId = newFile.id;
        task.status = 'Done';
        task.submittedAt = new Date();
        await task.save();
        
        const taskWithAssociations = await Task.findByPk(taskId, { include: ['creator'] });
        if (taskWithAssociations && taskWithAssociations.creator) {
            sendTaskChangeNotification(task.toJSON(), 'completed', taskWithAssociations.creator.email);
        }

        res.status(200).json({ message: 'File submitted successfully.' });
    } catch (error) {
        console.error('File submission error:', error);
        res.status(500).json({ message: error.message || 'An internal error occurred.' });
    }
});

app.get('/api/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const fileInfo = await getFileInfoFromDb(fileId);

        if (!fileInfo) {
            return res.status(404).json({ message: 'File not found.' });
        }
        
        res.download(fileInfo.savedPath, fileInfo.originalName, (err) => {
            if (err) {
                console.error("Error sending file to client:", err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Could not download the file.' });
                }
            }
        });
    } catch (error) {
        console.error("File download error:", error);
        res.status(500).json({ message: "An internal server error occurred." });
    }
});


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});