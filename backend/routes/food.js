const express = require('express');
const FoodListing = require('../models/FoodListing');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/food
 * Donor creates a new food listing
 */
router.post('/', protect, authorize('donor'), async (req, res) => {
  try {
    const { foodType, quantity, description, expiryTime, location, image } = req.body;

    const food = await FoodListing.create({
      donorId: req.user._id,
      foodType,
      quantity,
      description: description || '',
      expiryTime,
      location,
      image: image || '',
    });

    res.status(201).json(food);
  } catch (error) {
    console.error('Create food error:', error);
    res.status(500).json({ message: 'Failed to create food listing' });
  }
});

/**
 * GET /api/food
 * Get all food listings. Donors see their own, receivers see available food.
 */
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'donor') {
      // Donors see only their own listings
      filter = { donorId: req.user._id };
    } else {
      // Receivers and volunteers see all available food
      filter = { status: 'available' };
    }

    const foods = await FoodListing.find(filter)
      .populate('donorId', 'name email phone location')
      .sort({ createdAt: -1 });

    res.json(foods);
  } catch (error) {
    console.error('Get food error:', error);
    res.status(500).json({ message: 'Failed to fetch food listings' });
  }
});

/**
 * GET /api/food/all
 * Get all food listings (for volunteers to see all statuses)
 */
router.get('/all', protect, authorize('volunteer'), async (req, res) => {
  try {
    const foods = await FoodListing.find({})
      .populate('donorId', 'name email phone location')
      .sort({ createdAt: -1 });
    res.json(foods);
  } catch (error) {
    console.error('Get all food error:', error);
    res.status(500).json({ message: 'Failed to fetch food listings' });
  }
});

/**
 * GET /api/food/:id
 * Get a single food listing by ID
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const food = await FoodListing.findById(req.params.id)
      .populate('donorId', 'name email phone location');

    if (!food) {
      return res.status(404).json({ message: 'Food listing not found' });
    }

    res.json(food);
  } catch (error) {
    console.error('Get food by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch food listing' });
  }
});

/**
 * PUT /api/food/:id
 * Update a food listing (donor only, own listings)
 */
router.put('/:id', protect, authorize('donor'), async (req, res) => {
  try {
    const food = await FoodListing.findById(req.params.id);
    if (!food) {
      return res.status(404).json({ message: 'Food listing not found' });
    }

    if (food.donorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this listing' });
    }

    const updated = await FoodListing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    console.error('Update food error:', error);
    res.status(500).json({ message: 'Failed to update food listing' });
  }
});

/**
 * DELETE /api/food/:id
 * Delete a food listing (donor only, own listings)
 */
router.delete('/:id', protect, authorize('donor'), async (req, res) => {
  try {
    const food = await FoodListing.findById(req.params.id);
    if (!food) {
      return res.status(404).json({ message: 'Food listing not found' });
    }

    if (food.donorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this listing' });
    }

    await FoodListing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Food listing deleted' });
  } catch (error) {
    console.error('Delete food error:', error);
    res.status(500).json({ message: 'Failed to delete food listing' });
  }
});

module.exports = router;
