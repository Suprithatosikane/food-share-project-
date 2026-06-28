const express = require('express');
const Request = require('../models/Request');
const FoodListing = require('../models/FoodListing');
const Delivery = require('../models/Delivery');
const DailyRequest = require('../models/DailyRequest');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * Utility helper to parse numbers and units from a quantity string
 * Handles ranges (e.g. "3-5 servings" -> 5 servings) and decimals (e.g. "1.5 kg")
 */
function parseQuantityString(qtyStr) {
  if (!qtyStr) return { value: 0, unit: '' };
  const cleanStr = qtyStr.trim();

  // Range matching: e.g. "3-5 servings" or "3 to 5 servings"
  const rangeMatch = cleanStr.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(.*)$/) ||
                     cleanStr.match(/^(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)\s*(.*)$/);
  if (rangeMatch) {
    const value = parseFloat(rangeMatch[2]) || 0;
    const unit = rangeMatch[3] ? rangeMatch[3].trim() : '';
    return { value, unit };
  }

  // Single value matching: e.g. "50 plates", "1.5 kg" or "10"
  const match = cleanStr.match(/^([\d.]+)\s*(.*)$/);
  if (!match) {
    return { value: 0, unit: '' };
  }
  const value = parseFloat(match[1]) || 0;
  const unit = match[2] ? match[2].trim() : '';
  return { value, unit };
}

/**
 * POST /api/requests
 * Receiver requests a specific food listing
 */
router.post('/', protect, authorize('receiver'), async (req, res) => {
  try {
    const { foodId, message, requestedQuantity } = req.body;

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

    // Parse food quantity and requested quantity
    const foodQtyInfo = parseQuantityString(food.quantity);
    const requestedQtyInfo = parseQuantityString(requestedQuantity ? requestedQuantity.toString() : '');

    const availableVal = foodQtyInfo.value;
    const requestedVal = requestedQtyInfo.value;
    const unit = foodQtyInfo.unit;

    if (requestedVal <= 0) {
      return res.status(400).json({ message: 'Requested quantity must be greater than zero' });
    }

    if (requestedVal > availableVal) {
      return res.status(400).json({ message: `Requested quantity exceeds available quantity (${food.quantity})` });
    }

    const remainingVal = availableVal - requestedVal;
    
    // Format quantities with preservation of decimal/integer presentation and original unit
    const remainingQtyStr = remainingVal > 0
      ? (Number.isInteger(remainingVal) ? remainingVal : remainingVal.toFixed(2)) + (unit ? ' ' + unit : '')
      : '0' + (unit ? ' ' + unit : '');

    const reqQtyStr = (Number.isInteger(requestedVal) ? requestedVal : requestedVal.toFixed(2)) + (unit ? ' ' + unit : '');

    // Deduct quantity and save
    food.quantity = remainingQtyStr;
    food.status = remainingVal === 0 ? 'requested' : 'available';
    await food.save();

    // Create the Request
    const request = await Request.create({
      receiverId: req.user._id,
      foodId,
      message: message || '',
      requestedQuantity: reqQtyStr,
    });

    // Create a delivery task (pending volunteer acceptance)
    await Delivery.create({
      foodId: food._id,
      requestId: request._id,
      pickupLocation: food.location,
      dropLocation: req.user.location,
      status: 'pending',
      requestedQuantity: reqQtyStr,
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

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    request.status = 'rejected';
    await request.save();

    // Revert food status to available and refund quantity
    const food = await FoodListing.findById(request.foodId._id);
    if (food) {
      const foodQtyInfo = parseQuantityString(food.quantity);
      const reqQtyInfo = parseQuantityString(request.requestedQuantity);
      
      const newAvailableVal = foodQtyInfo.value + reqQtyInfo.value;
      const unit = foodQtyInfo.unit || reqQtyInfo.unit;
      
      const newQtyStr = (Number.isInteger(newAvailableVal) ? newAvailableVal : newAvailableVal.toFixed(2)) + (unit ? ' ' + unit : '');
      
      food.quantity = newQtyStr;
      food.status = 'available';
      await food.save();
    }

    // Delete corresponding Delivery task from the volunteer pool
    await Delivery.deleteOne({ requestId: request._id });

    res.json(request);
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Failed to reject request' });
  }
});

/**
 * GET /api/requests/daily-requirements
 * Get all active pending daily food requirements
 */
router.get('/daily-requirements', protect, async (req, res) => {
  try {
    const dailyRequests = await DailyRequest.find({ status: 'pending' })
      .populate('receiverId', 'name email phone location')
      .sort({ createdAt: -1 });
    res.json(dailyRequests);
  } catch (error) {
    console.error('Get daily requirements error:', error);
    res.status(500).json({ message: 'Failed to fetch daily food requirements' });
  }
});

/**
 * PUT /api/requests/daily-requirements/:id/accept
 * Donor accepts/fulfills a daily food requirement
 */
router.put('/daily-requirements/:id/accept', protect, authorize('donor'), async (req, res) => {
  try {
    const dailyRequest = await DailyRequest.findById(req.params.id);
    if (!dailyRequest) {
      return res.status(404).json({ message: 'Daily request requirement not found' });
    }

    if (dailyRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Daily request has already been fulfilled' });
    }

    // Mark daily request as accepted
    dailyRequest.status = 'accepted';
    dailyRequest.acceptedBy = req.user._id;
    await dailyRequest.save();

    // 1. Create a FoodListing on behalf of the accepting donor
    // It is immediately requested since the receiver asked for it
    const expiryTime = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours default expiry
    const food = await FoodListing.create({
      donorId: req.user._id,
      foodType: dailyRequest.mealType || 'Meals',
      quantity: `${dailyRequest.quantity} meals`,
      description: 'Fulfillment of auto-generated daily requirement request',
      expiryTime,
      location: {
        address: req.user.location?.address || 'Donor Location',
        lat: req.user.location?.lat || 0,
        lng: req.user.location?.lng || 0,
      },
      status: 'requested' // Immediately requested since it's matched
    });

    // 2. Create the Request on behalf of the receiver, immediately approved
    const request = await Request.create({
      receiverId: dailyRequest.receiverId,
      foodId: food._id,
      status: 'approved',
      message: 'Fulfillment of daily requirement request',
      requestedQuantity: `${dailyRequest.quantity} meals`
    });

    // 3. Create the Delivery task for volunteer pool
    await Delivery.create({
      foodId: food._id,
      requestId: request._id,
      pickupLocation: food.location,
      dropLocation: dailyRequest.location,
      status: 'pending',
      requestedQuantity: `${dailyRequest.quantity} meals`
    });

    res.json(dailyRequest);
  } catch (error) {
    console.error('Accept daily requirement error:', error);
    res.status(500).json({ message: 'Failed to accept daily food requirement' });
  }
});

module.exports = router;
