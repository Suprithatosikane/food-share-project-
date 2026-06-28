const mongoose = require('mongoose');

/**
 * Request Schema
 * Created when a receiver requests a specific food listing.
 * Status: pending → approved → rejected
 */
const requestSchema = new mongoose.Schema({
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodListing',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  message: {
    type: String,
    default: '',
  },
  requestedQuantity: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);
