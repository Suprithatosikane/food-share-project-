const express = require('express');
const Delivery = require('../models/Delivery');
const FoodListing = require('../models/FoodListing');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/deliveries
 * Volunteer sees available delivery tasks (pending) or their accepted tasks.
 * Receivers can also see deliveries for their food.
 */
router.get('/', protect, async (req, res) => {
  try {
    let deliveries;

    if (req.user.role === 'volunteer') {
      // Show pending deliveries (available to accept) + volunteer's own accepted tasks
      deliveries = await Delivery.find({
        $or: [
          { status: 'pending' },
          { volunteerId: req.user._id },
        ],
      })
        .populate({
          path: 'foodId',
          populate: { path: 'donorId', select: 'name email phone location' },
        })
        .populate('requestId')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'receiver') {
      // Receiver sees deliveries related to their requests
      const Request = require('../models/Request');
      const receiverRequests = await Request.find({ receiverId: req.user._id }).select('_id');
      const requestIds = receiverRequests.map(r => r._id);

      deliveries = await Delivery.find({ requestId: { $in: requestIds } })
        .populate({
          path: 'foodId',
          populate: { path: 'donorId', select: 'name email phone location' },
        })
        .populate('volunteerId', 'name phone')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'donor') {
      // Donor sees deliveries for their food
      const donorFoods = await FoodListing.find({ donorId: req.user._id }).select('_id');
      const foodIds = donorFoods.map(f => f._id);

      deliveries = await Delivery.find({ foodId: { $in: foodIds } })
        .populate('foodId')
        .populate('volunteerId', 'name phone')
        .sort({ createdAt: -1 });
    }

    res.json(deliveries);
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ message: 'Failed to fetch deliveries' });
  }
});

/**
 * PUT /api/deliveries/:id/accept
 * Volunteer accepts a pending delivery task
 */
router.put('/:id/accept', protect, authorize('volunteer'), async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.status !== 'pending') {
      return res.status(400).json({ message: 'Delivery is no longer available' });
    }

    delivery.volunteerId = req.user._id;
    delivery.status = 'accepted';
    await delivery.save();

    const populated = await Delivery.findById(delivery._id)
      .populate({
        path: 'foodId',
        populate: { path: 'donorId', select: 'name email phone location' },
      })
      .populate('volunteerId', 'name phone');

    res.json(populated);
  } catch (error) {
    console.error('Accept delivery error:', error);
    res.status(500).json({ message: 'Failed to accept delivery' });
  }
});

/**
 * PUT /api/deliveries/:id/picked
 * Volunteer marks food as picked up
 */
router.put('/:id/picked', protect, authorize('volunteer'), async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.volunteerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    delivery.status = 'picked';
    await delivery.save();

    // Update food listing status
    await FoodListing.findByIdAndUpdate(delivery.foodId, { status: 'picked' });

    const populated = await Delivery.findById(delivery._id)
      .populate({
        path: 'foodId',
        populate: { path: 'donorId', select: 'name email phone location' },
      })
      .populate('volunteerId', 'name phone');

    res.json(populated);
  } catch (error) {
    console.error('Pick delivery error:', error);
    res.status(500).json({ message: 'Failed to update delivery status' });
  }
});

/**
 * PUT /api/deliveries/:id/delivered
 * Volunteer marks food as delivered
 */
router.put('/:id/delivered', protect, authorize('volunteer'), async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    if (delivery.volunteerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    delivery.status = 'delivered';
    await delivery.save();

    // Update food listing status
    await FoodListing.findByIdAndUpdate(delivery.foodId, { status: 'delivered' });

    const populated = await Delivery.findById(delivery._id)
      .populate({
        path: 'foodId',
        populate: { path: 'donorId', select: 'name email phone location' },
      })
      .populate('volunteerId', 'name phone');

    res.json(populated);
  } catch (error) {
    console.error('Deliver error:', error);
    res.status(500).json({ message: 'Failed to update delivery status' });
  }
});

module.exports = router;
