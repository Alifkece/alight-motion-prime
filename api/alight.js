const express = require('express');
const cors = require('cors');
const { alightPro } = require('../alightpro');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/alight', async (req, res) => {
    try {
        const { email, link } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }
        // link boleh null / undefined
        const result = await alightPro(email, link || null);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Untuk local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
