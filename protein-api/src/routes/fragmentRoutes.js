const express = require('express');
const router = express.Router();
const fragmentService = require('../service/fragmentService');

router.get('/:proteinId/fragments', async (req, res, next) => {
    try {
        const { proteinId } = req.params;
        const { limit = 10, offset = 0, orderBy = 'start' } = req.query;
        const fragments = await fragmentService.getFragments(proteinId, limit, offset, orderBy);
        res.json({ fragments });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
