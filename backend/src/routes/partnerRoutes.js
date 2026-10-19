const express = require('express');
const router = express.Router();
const {
  getPartners,
  getAllPartnersAdmin,
  createPartner,
  updatePartner,
  deletePartner
} = require('../controllers/partnerController');
const { protect, admin } = require('../middleware/auth');

router.get('/', getPartners);
router.get('/admin', protect, admin, getAllPartnersAdmin);
router.post('/', protect, admin, createPartner);
router.put('/:id', protect, admin, updatePartner);
router.delete('/:id', protect, admin, deletePartner);

module.exports = router;
