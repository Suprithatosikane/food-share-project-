const mongoose = require('mongoose');

/**
 * DailyRequest Schema
 * Created automatically by the cron scheduler on behalf of receivers
 * who have daily requirement enabled.
 * Status: pending → accepted
 */
const dailyRequestSchema = new mongoose.Schema({
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  mealType: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'accepted'],
    default: 'pending',
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  location: {
    address: { type: String, default: '' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.model('DailyRequest', dailyRequestSchema);
