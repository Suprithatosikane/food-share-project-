const express = require('express');
const Request = require('../models/Request');
const FoodListing = require('../models/FoodListing');
const Delivery = require('../models/Delivery');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/requests
 * Receiver requests a specific food listing
 */
router.post('/', protect, authorize('receiver'), async (req, res) => {
  try {
    const { foodId, message } = req.body;

    // Check if food exists and is available
    const food = await FoodListing.findById(foodId);
    if (!food) {
      return res.status(404).json({ message: 'Food listing not found' });
    }
    if (food.status !== 'available') {
      return res.status(400).json({ message: 'Food is no longer available' });
    }

    // Check if receiver already requested this food
    const existingRequest = await Request.findOne({
      receiverId: req.user._id,
      foodId,
      status: 'pending',
    });
    if (existingRequest) {
      return res.status(400).json({ message: 'You already requested this food' });
    }

    const request = await Request.create({
      receiverId: req.user._id,
      foodId,
      message: message || '',
    });

    // Update food status to 'requested'
    food.status = 'requested';
    await food.save();

    // Create a delivery task (pending volunteer acceptance)
    await Delivery.create({
      foodId: food._id,
      requestId: request._id,
      pickupLocation: food.location,
      dropLocation: req.user.location,
      status: 'pending',
    });

    const populated = await Request.findById(request._id)
      .populate('foodId')
      .populate('receiverId', 'name email phone location');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ message: 'Failed to create request' });
  }
});

/**
 * GET /api/requests
 * Get requests based on user role:
 *  - Receiver: sees their own requests
 *  - Donor: sees requests for their food listings
 */
router.get('/', protect, async (req, res) => {
  try {
    let requests;

    if (req.user.role === 'receiver') {
      requests = await Request.find({ receiverId: req.user._id })
        .populate({
          path: 'foodId',
          populate: { path: 'donorId', select: 'name email phone location' },
        })
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'donor') {
      // Find all food IDs belonging to this donor
      const donorFoods = await FoodListing.find({ donorId: req.user._id }).select('_id');
      const foodIds = donorFoods.map(f => f._id);

      requests = await Request.find({ foodId: { $in: foodIds } })
        .populate('foodId')
        .populate('receiverId', 'name email phone location')
        .sort({ createdAt: -1 });
    } else {
      requests = [];
    }

    res.json(requests);
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
});

/**
 * PUT /api/requests/:id/approve
 * Donor approves a request
 */
router.put('/:id/approve', protect, authorize('donor'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate('foodId');
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify the donor owns this food
    if (request.foodId.donorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = 'approved';
    await request.save();

    res.json(request);
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ message: 'Failed to approve request' });
  }
});

/**
 * PUT /api/requests/:id/reject
 * Donor rejects a request
 */
router.put('/:id/reject', protect, authorize('donor'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate('foodId');
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.foodId.donorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = 'rejected';
    await request.save();

    // Revert food status to available
    await FoodListing.findByIdAndUpdate(request.foodId._id, { status: 'available' });

    res.json(request);
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Failed to reject request' });
  }
});

module.exports = router;
