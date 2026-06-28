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

    // Call Gemini 3.5 Flash API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `You are an expert Food Recognition and Freshness Analysis AI designed for a real-world food donation platform. Your responses must be accurate, conservative, and evidence-based.

You must output ONLY a valid JSON object in this exact format:
{
  "isFood": boolean,
  "isClearAndWellLit": boolean,
  "rejectionReason": "not_food" | "blurry_or_poor_lighting" | "none",
  "foodDetected": string,
  "confidence": number,
  "freshness": number,
  "freshnessStatus": "Fresh" | "Moderately Fresh" | "Stale" | "Rotten",
  "recommendation": "Safe for donation" | "Donate immediately" | "Consume soon" | "Not recommended for donation",
  "reason": string,
  "errorMessage": string
}

Step 1: Validate the Image
- Determine whether the uploaded image contains food.
- If the image contains a car, bike, laptop, mobile phone, human, building, pet, scenery, furniture, document, or any non-food object, set "isFood" to false, "rejectionReason" to "not_food", "confidence" to 0, "foodDetected" to "", and "errorMessage" to "❌ Invalid image. Please upload a clear image containing only food."

Step 2: Check Image Quality
- Reject the image if it is blurry, too dark, too bright, low resolution, or food is partially visible.
- If rejected for quality, set "isClearAndWellLit" to false, "rejectionReason" to "blurry_or_poor_lighting", "confidence" to 0, "foodDetected" to "", and "errorMessage" to "⚠️ Image quality is insufficient. Please upload a clear, well-lit image of the food."

Step 3: Identify the Exact Food
- Carefully analyze the image. Return the exact food name (e.g. "Upma", "Chapati", "Dal", "Idli", "Dosa", "Pongal", "Lemon Rice", "Tomato Rice", "Biryani", "Puliyogare", "Curd Rice", "Sambar Rice", "Poha", "Apple", "Banana", "Orange", "Mango", etc.). Never label every rice dish as Biryani.
- If the image is not food or quality is rejected, set "foodDetected" to "".

Step 4: Confidence Validation
- If confidence is below 90%, set "errorMessage" to "⚠️ Unable to confidently identify the food. Please upload a clearer image from the top or front angle."

Step 5: Freshness Analysis
- If food is detected, analyze colour, texture, moisture, mold, spots, damage, and sign of spoilage. Set "freshness" as percentage (0-100) and "freshnessStatus" as one of: "Fresh", "Moderately Fresh", "Stale", "Rotten".

Step 6: Recommendation
- Provide one recommendation (e.g., "Safe for donation", "Donate immediately", "Consume soon", "Not recommended for donation").

Step 7: Never Hallucinate
- Accuracy is more important than providing an answer. If uncertain, set confidence < 90.`;

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
    console.log('Raw Gemini Response:', JSON.stringify(data, null, 2));

    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) {
      console.warn('Empty textResult in Gemini response');
      return res.json({ useClientFallback: true, error: 'Empty response from Gemini' });
    }

    // Safe JSON parser to strip any markdown block wraps
    let cleanText = textResult.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?/i, '').replace(/```$/s, '').trim();
    }

    const resultObj = JSON.parse(cleanText);

    // Map fields for client compatibility
    resultObj.type = resultObj.foodDetected;
    
    // Add emojis to status strings if they don't already have them
    if (resultObj.freshnessStatus && !resultObj.freshnessStatus.match(/[✅⚠️❌🛑]/)) {
      if (resultObj.freshnessStatus === 'Fresh') resultObj.freshnessStatus = 'Fresh ✅';
      else if (resultObj.freshnessStatus === 'Moderately Fresh') resultObj.freshnessStatus = 'Moderately Fresh ⚠️';
      else if (resultObj.freshnessStatus === 'Stale') resultObj.freshnessStatus = 'Stale ⚠️';
      else if (resultObj.freshnessStatus === 'Rotten') resultObj.freshnessStatus = 'Rotten ❌';
    }

    resultObj.servings = resultObj.servings || '3-5 servings';

    res.json({ success: true, result: resultObj });

  } catch (error) {
    console.error('Gemini Detection Error:', error);
    res.json({ useClientFallback: true, error: error.message });
  }
});

module.exports = router;
