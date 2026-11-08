const express = require('express');
const router = express.Router();
const {
  createShipmentFolder,
  getMyShipments,
  getShipmentById,
  updateWarehouseIntake,
  acceptShipmentQuote,
  updateShipmentStatus,
  addThreePartyMessage,
  uploadShipmentDocument,
  confirmShipmentDelivery
} = require('../controllers/shipmentController');
const { protect } = require('../middleware/auth');

// Toutes les actions de gestion de dossiers d'expédition sont protégées
router.use(protect);

router.post('/', createShipmentFolder);
router.get('/my-shipments', getMyShipments);
router.get('/:id', getShipmentById);

router.put('/:id/warehouse-intake', updateWarehouseIntake);
router.put('/:id/accept-quote', acceptShipmentQuote);
router.put('/:id/status', updateShipmentStatus);
router.post('/:id/messages', addThreePartyMessage);
router.post('/:id/documents', uploadShipmentDocument);
router.post('/:id/confirm-delivery', confirmShipmentDelivery);

module.exports = router;
