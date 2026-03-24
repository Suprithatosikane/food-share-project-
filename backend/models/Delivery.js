const mongoose = require('mongoose');

/**
 * Delivery Schema
 * Created when a food request is approved and needs volunteer delivery.
 * Status: pending → accepted → picked → delivered
 */
const deliverySchema = new mongoose.Schema({
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodListing',
    required: true,
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true,
  },
  pickupLocation: {
    address: { type: String, default: '' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  dropLocation: {
    address: { type: String, default: '' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'picked', 'delivered'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
