import express from 'express';
import {
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact
} from '../controllers/emergencyContacts.js';
import { verifyToken } from '../middleware/authJwt.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

router.get('/', getEmergencyContacts);
router.post('/', addEmergencyContact);
router.put('/:id', updateEmergencyContact);
router.delete('/:id', deleteEmergencyContact);

export default router;