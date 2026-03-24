const mongoose = require('mongoose');

/**
 * FoodListing Schema
 * Created by donors to list available food for redistribution.
 * Status tracks the lifecycle: available → requested → picked → delivered
 */
const foodListingSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  foodType: {
    type: String,
    required: [true, 'Food type is required'],
    trim: true,
  },
  quantity: {
    type: String,
    required: [true, 'Quantity is required'],
  },
  description: {
    type: String,
    default: '',
  },
  expiryTime: {
    type: Date,
    required: [true, 'Expiry time is required'],
  },
  location: {
    address: { type: String, required: true },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['available', 'requested', 'picked', 'delivered'],
    default: 'available',
  },
  image: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('FoodListing', foodListingSchema);
