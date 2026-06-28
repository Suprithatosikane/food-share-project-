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

/**
 * POST /api/food/detect
 * Analyze food image using Gemini AI API (if key is set)
 */
router.post('/detect', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not configured in backend/.env. Falling back to local smart canvas heuristics.');
      return res.json({ useClientFallback: true });
    }

    // Extract raw base64 data and mime type
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    if (!mimeMatch) {
      return res.status(400).json({ message: 'Invalid image format' });
    }
    const mimeType = mimeMatch[1];
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Call Gemini 1.5 Flash API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `Identify the food item in the image. You must output ONLY a valid JSON object in this exact format:
{
  "type": "Upma" | "Biryani" | "Rice & Sambar" | "Chapathi & Dal" | "Dosa & Chutney" | "Idli & Vada" | "Mixed Fruits" | "Vegetable Curry" | "Bread & Bakery" | "Snacks & Sweets",
  "category": "South Indian Breakfast" | "Main Course" | "South Indian" | "North Indian" | "Fruits" | "Bakery" | "Snacks",
  "emoji": "🥣" | "🍛" | "🍚" | "🫓" | "🥞" | "🔵" | "🍎" | "🥘" | "🍞" | "🍪",
  "confidence": number (70-100),
  "freshness": number (0-100, calculate based on decay, bruising, oxidation, rot, bites, etc. If fruits are rotten/bitten/old, freshness must be below 40%),
  "servings": "1-2 servings" | "3-5 servings" | "6-10 servings" | "0-1 (Spoiled/Rotten)"
}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error details:', errText);
      return res.json({ useClientFallback: true, error: 'Gemini API call failed' });
    }

    const data = await response.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) {
      return res.json({ useClientFallback: true, error: 'Empty response from Gemini' });
    }

    // Safe JSON parser to strip any markdown block wraps
    let cleanText = textResult.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?/i, '').replace(/```$/s, '').trim();
    }

    const resultObj = JSON.parse(cleanText);
    res.json({ success: true, result: resultObj });

  } catch (error) {
    console.error('Gemini Detection Error:', error);
    res.json({ useClientFallback: true, error: error.message });
  }
});

module.exports = router;
