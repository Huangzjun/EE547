const express = require('express');
const router = express.Router();
const searchService = require('../service/searchService');

router.get('/', async (req, res, next) => {
    try {
        const { query = '', limit = 10, offset = 0, orderBy = 'name' } = req.query;
        const proteins = await searchService.searchProteins(query, limit, offset, orderBy);
        res.json({ proteins });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
