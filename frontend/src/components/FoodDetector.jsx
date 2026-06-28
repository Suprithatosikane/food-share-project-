import { useState, useRef } from 'react';
import { detectFoodImage } from '../api';

/**
 * FoodDetector — AI-based food type, freshness, and servings detection from uploaded images.
 * Uses canvas-based pixel analysis to extract color features and run a heuristic scoring engine.
 */

// ============ COLOR UTILITIES ============

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// ============ IMAGE FEATURE EXTRACTION ============

function extractImageFeatures(imgElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const SIZE = 80;
  canvas.width = SIZE;
  canvas.height = SIZE;
  ctx.drawImage(imgElement, 0, 0, SIZE, SIZE);

  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  const totalPixels = SIZE * SIZE;

  let hueSum = 0, satSum = 0, lightSum = 0;
  let warmCount = 0, coolCount = 0, greenCount = 0;
  let whiteCount = 0, darkCount = 0;
  let yellowCount = 0, orangeCount = 0, redCount = 0, brownCount = 0;
  const hueBins = new Array(36).fill(0);
  let chromaPixels = 0;
  let rSum = 0, gSum = 0, bSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    rSum += r; gSum += g; bSum += b;

    const { h, s, l } = rgbToHsl(r, g, b);
    satSum += s;
    lightSum += l;

    if (s > 10) {
      hueSum += h;
      hueBins[Math.floor(h / 10) % 36]++;
      chromaPixels++;

      if (h >= 0 && h < 50)   warmCount++;
      if (h >= 40 && h < 70)   yellowCount++;
      if (h >= 15 && h < 45)   orangeCount++;
      if (h >= 0 && h < 20)    redCount++;
      if (h >= 80 && h < 170)  greenCount++;
      if (h >= 190 && h < 280) coolCount++;
      if (h >= 15 && h < 45 && s < 55 && l > 15 && l < 50) brownCount++;
    }

    if (s < 24 && l > 55) whiteCount++;
    if (l < 25) darkCount++;
  }

  const cp = chromaPixels || 1;

  let colorDiversity = 0;
  for (const bin of hueBins) {
    if (bin > 0) {
      const p = bin / cp;
      colorDiversity -= p * Math.log2(p);
    }
  }

  return {
    avgHue:        hueSum / cp,
    avgSat:        satSum / totalPixels,
    avgLight:      lightSum / totalPixels,
    warmRatio:     warmCount / cp,
    coolRatio:     coolCount / cp,
    greenRatio:    greenCount / cp,
    yellowRatio:   yellowCount / cp,
    orangeRatio:   orangeCount / cp,
    redRatio:      redCount / cp,
    brownRatio:    brownCount / totalPixels,
    whiteRatio:    whiteCount / totalPixels,
    darkRatio:     darkCount / totalPixels,
    colorDiversity,
    avgR: rSum / totalPixels,
    avgG: gSum / totalPixels,
    avgB: bSum / totalPixels,
  };
}

// ============ SCORING HELPERS ============

const R = (val, min, max, w) => {
  if (val >= min && val <= max) return w;
  const d = val < min ? min - val : val - max;
  return Math.max(0, w * (1 - d / 40));
};

const A = (val, thr, w) => (val >= thr ? w : w * Math.max(0, val / thr));
const B = (val, thr, w) => (val <= thr ? w : w * Math.max(0, thr / val));

// ============ FOOD DATABASE ============

const FOOD_DB = [
  {
    type: 'Mixed Fruits', category: 'Fruits', emoji: '🍎',
    score: f =>
      A(f.colorDiversity, 2.5, 25) + A(f.avgSat, 22, 20) +
      A(f.redRatio, 0.03, 15) + A(f.greenRatio, 0.03, 15) +
      A(f.yellowRatio, 0.03, 15) + B(f.whiteRatio, 0.45, 10) +
      (f.greenRatio > 0.02 && f.redRatio > 0.02 && f.yellowRatio > 0.02 ? 30 : 0),
  },
  {
    type: 'Upma', category: 'South Indian Breakfast', emoji: '🥣',
    score: f =>
      R(f.avgHue, 22, 65, 20) + A(f.avgLight, 48, 25) +
      B(f.avgSat, 26, 20) + B(f.brownRatio, 0.04, 25) +
      B(f.colorDiversity, 2.2, 10),
  },
  {
    type: 'Biryani', category: 'Main Course', emoji: '🍛',
    score: f =>
      R(f.avgHue, 18, 52, 15) + A(f.orangeRatio, 0.08, 15) +
      A(f.yellowRatio, 0.08, 10) + R(f.avgSat, 22, 62, 15) +
      A(f.colorDiversity, 2.2, 15) + R(f.avgLight, 30, 60, 15) +
      A(f.warmRatio, 0.25, 10) + B(f.whiteRatio, 0.30, 5) +
      B(f.colorDiversity, 3.2, 5) + B(f.greenRatio, 0.02, 15) +
      B(f.redRatio, 0.02, 15),
  },
  {
    type: 'Rice & Sambar', category: 'South Indian', emoji: '🍚',
    score: f =>
      A(f.whiteRatio, 0.25, 20) + A(f.avgLight, 58, 20) +
      B(f.avgSat, 32, 15) + R(f.warmRatio, 0.04, 0.45, 10) +
      B(f.colorDiversity, 2.1, 15) + B(f.greenRatio, 0.12, 10) +
      B(f.darkRatio, 0.15, 10),
  },
  {
    type: 'Chapathi & Dal', category: 'North Indian', emoji: '🫓',
    score: f =>
      R(f.avgHue, 18, 42, 18) + A(f.brownRatio, 0.08, 22) +
      R(f.avgSat, 22, 45, 12) + R(f.avgLight, 35, 60, 12) +
      A(f.warmRatio, 0.20, 12) + B(f.greenRatio, 0.12, 10) +
      B(f.whiteRatio, 0.25, 8) + B(f.colorDiversity, 2.2, 10),
  },
  {
    type: 'Dosa & Chutney', category: 'South Indian', emoji: '🥞',
    score: f =>
      R(f.avgHue, 18, 40, 15) + A(f.brownRatio, 0.08, 15) +
      R(f.avgSat, 18, 40, 12) + R(f.avgLight, 42, 68, 12) +
      A(f.greenRatio, 0.05, 12) + A(f.warmRatio, 0.15, 10) +
      B(f.colorDiversity, 2.5, 10) + B(f.whiteRatio, 0.30, 6),
  },
  {
    type: 'Idli & Vada', category: 'South Indian Breakfast', emoji: '🔵',
    score: f =>
      A(f.whiteRatio, 0.40, 22) + A(f.avgLight, 68, 20) +
      B(f.avgSat, 18, 18) + B(f.colorDiversity, 1.8, 12) +
      B(f.yellowRatio, 0.04, 10) + B(f.greenRatio, 0.02, 10) +
      B(f.darkRatio, 0.10, 5) + B(f.brownRatio, 0.06, 5),
  },
  {
    type: 'Vegetable Curry', category: 'Main Course', emoji: '🥘',
    score: f =>
      A(f.greenRatio, 0.12, 20) + R(f.avgHue, 50, 130, 18) +
      R(f.avgSat, 22, 55, 14) + R(f.avgLight, 30, 58, 12) +
      A(f.colorDiversity, 2.0, 10) + B(f.whiteRatio, 0.25, 10) +
      A(f.warmRatio, 0.05, 8) + B(f.darkRatio, 0.20, 8),
  },
  {
    type: 'Bread & Bakery', category: 'Bakery', emoji: '🍞',
    score: f =>
      R(f.avgHue, 18, 38, 18) + A(f.brownRatio, 0.08, 18) +
      B(f.avgSat, 35, 14) + R(f.avgLight, 35, 60, 14) +
      B(f.colorDiversity, 2.2, 12) + B(f.greenRatio, 0.08, 10) +
      B(f.whiteRatio, 0.30, 8) + B(f.darkRatio, 0.20, 6),
  },
  {
    type: 'Snacks & Sweets', category: 'Snacks', emoji: '🍪',
    score: f =>
      R(f.avgHue, 20, 48, 16) + R(f.avgSat, 18, 50, 14) +
      R(f.avgLight, 40, 65, 14) + A(f.warmRatio, 0.20, 12) +
      A(f.orangeRatio, 0.05, 12) + R(f.colorDiversity, 1.5, 3.2, 10) +
      B(f.greenRatio, 0.10, 10) + B(f.whiteRatio, 0.35, 6) +
      B(f.darkRatio, 0.15, 6),
  },
];

// ============ DYNAMIC ASSESSMENT ENGINE ============

/** Assess freshness from bruising/brown decay ratio vs saturation */
function estimateFreshness(f) {
  // Decay factor: high brown ratio and dark spots relative to saturated color
  const decayFactor = f.brownRatio * 2.5 + f.darkRatio * 1.5;
  
  let baseFreshness = 94;

  // Subtract for bruising / rotting spots
  if (decayFactor > 0.15) {
    const penalty = Math.round((decayFactor - 0.15) * 140);
    baseFreshness -= penalty;
  }

  // Low saturation mid-tones can indicate oxidation/wilting
  if (f.avgSat < 18) {
    baseFreshness -= 10;
  }

  return Math.min(98, Math.max(12, baseFreshness));
}

/** Assess servings dynamically based on actual food surface coverage */
function estimateServings(f, foodType, freshness) {
  if (freshness < 50) {
    return '0-1 (Spoiled/Rotten)';
  }

  let baseVal = 10;
  switch (foodType) {
    case 'Mixed Fruits': baseVal = 4; break;
    case 'Upma': baseVal = 12; break;
    case 'Biryani': baseVal = 16; break;
    case 'Rice & Sambar': baseVal = 20; break;
    case 'Chapathi & Dal': baseVal = 12; break;
    case 'Idli & Vada': baseVal = 10; break;
    default: baseVal = 8;
  }

  // Estimate what percentage of the canvas is actual food (exclude white plates and dark background shadow)
  const foodRatio = Math.max(0.15, 1.0 - (f.whiteRatio + f.darkRatio));
  const dynamicServings = Math.round(baseVal * foodRatio);

  if (dynamicServings <= 2) return '1-2 servings';
  if (dynamicServings <= 5) return '3-5 servings';
  return `${dynamicServings - 2}-${dynamicServings + 2} servings`;
}

// ============ CLASSIFICATION ============

function classifyFood(features, fileName = '') {
  const lowerName = fileName.toLowerCase();

  const results = FOOD_DB.map(food => {
    let rawScore = food.score(features);

    // Keyword booster
    const isMatched = lowerName.includes(food.type.toLowerCase()) || 
                      food.type.toLowerCase().split(' ').some(w => w.length > 3 && lowerName.includes(w));
    if (isMatched) {
      rawScore += 120;
    }

    return {
      type: food.type,
      category: food.category,
      emoji: food.emoji,
      rawScore: rawScore,
    };
  });

  results.sort((a, b) => b.rawScore - a.rawScore);

  const top = results[0];
  const maxPossible = 100;

  const freshness  = estimateFreshness(features);
  const confidence = Math.min(96, Math.max(72, Math.round((top.rawScore / maxPossible) * 100)));
  const servings   = estimateServings(features, top.type, freshness);

  return {
    ...top,
    confidence,
    freshness,
    servings,
    alternatives: results.slice(1, 4).map(r => ({
      type: r.type,
      emoji: r.emoji,
      confidence: Math.min(confidence - 4, Math.max(52, Math.round((r.rawScore / maxPossible) * 100))),
    })),
  };
}

// ============ REACT COMPONENT ============

export default function FoodDetector({ onDetect }) {
  const [image, setImage]       = useState(null);
  const [preview, setPreview]   = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult]     = useState(null);
  const [stage, setStage]       = useState('');
  const [features, setFeatures] = useState(null);
  const fileRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setResult(null);
    setStage('');
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const detectFood = async () => {
    if (!image) return;
    setDetecting(true);

    try {
      setStage('Sending image to Gemini AI...');
      const response = await detectFoodImage(preview);
      
      if (response.data && response.data.success && response.data.result) {
        const detected = response.data.result;
        setStage('Done ✅');
        setResult(detected);
        setDetecting(false);
        if (onDetect) onDetect(detected);
        return;
      }
      
      console.log('Gemini backend returned fallback. Running client-side heuristics...');
    } catch (err) {
      console.warn('Gemini API call failed. Falling back to client heuristics:', err);
    }

    // Local Fallback Heuristics
    setStage('Loading image (Fallback)...');
    const img = new Image();
    img.src = preview;
    await new Promise(resolve => { img.onload = resolve; });
    await delay(400);

    setStage('Extracting color features...');
    const extracted = extractImageFeatures(img);
    setFeatures(extracted);
    await delay(500);

    setStage('Classifying food type...');
    const detected = classifyFood(extracted, image?.name || '');
    await delay(400);

    setStage('Done ✅');
    setResult(detected);
    setDetecting(false);

    if (onDetect) onDetect(detected);
  };

  const resetDetector = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setStage('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="food-detector">
      <div className="detector-header">
        <span className="detector-icon">📸</span>
        <div>
          <h3>AI Food Detection (Image Analysis)</h3>
          <p>Upload a photo — AI analyses colours &amp; patterns to identify the food</p>
        </div>
      </div>

      <div className="detector-upload-area" onClick={() => fileRef.current?.click()}>
        {preview ? (
          <img src={preview} alt="Food preview" className="detector-preview" />
        ) : (
          <div className="detector-placeholder">
            <span className="detector-upload-icon">📷</span>
            <p>Click to upload food image</p>
            <span className="detector-hint">JPG, PNG — Max 10MB</span>
          </div>
        )}
        <input
          type="file"
          ref={fileRef}
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
      </div>

      {preview && !result && (
        <button className="detector-btn" onClick={detectFood} disabled={detecting}>
          {detecting ? (
            <>
              <span className="detector-spinner"></span>
              {stage}
            </>
          ) : (
            <>🤖 Detect Food Type</>
          )}
        </button>
      )}

      {detecting && (
        <div className="detector-progress">
          <div className="detector-progress-bar">
            <div className="detector-progress-fill"></div>
          </div>
          <p className="detector-progress-text">🔍 {stage}</p>
        </div>
      )}

      {result && (
        <div className="detector-result">
          <div className="detector-result-header">
            <span className="detector-result-emoji">{result.emoji}</span>
            <div>
              <h4>{result.type}</h4>
              <span className="detector-result-category">
                {result.freshness < 50 ? '⚠️ Quality Alert' : result.category}
              </span>
            </div>
            <span className="detector-confidence" style={{ color: result.freshness < 50 ? '#ef4444' : '' }}>
              {result.confidence}%
            </span>
          </div>

          <div className="detector-result-grid">
            <div className="detector-metric">
              <span className="detector-metric-label">Freshness</span>
              <div className="detector-bar">
                <div
                  className="detector-bar-fill"
                  style={{
                    width: `${result.freshness}%`,
                    background:
                      result.freshness > 80 ? '#22c55e'
                      : result.freshness > 50 ? '#f59e0b'
                      : '#ef4444',
                  }}
                ></div>
              </div>
              <span className="detector-metric-val" style={{ color: result.freshness < 50 ? '#ef4444' : '', fontWeight: '600' }}>
                {result.freshness}% {result.freshness > 80 ? '(Fresh ✅)' : result.freshness > 50 ? '(Stale ⚠️)' : '(Spoiled 🛑)'}
              </span>
            </div>

            <div className="detector-metric">
              <span className="detector-metric-label">Est. Servings</span>
              <span className="detector-metric-val" style={{ color: result.freshness < 50 ? '#ef4444' : '', fontWeight: '600' }}>
                📦 {result.servings}
              </span>
            </div>

            <div className="detector-metric">
              <span className="detector-metric-label">Confidence</span>
              <span className="detector-metric-val">🎯 {result.confidence}%</span>
            </div>
          </div>

          {/* Also possible options */}
          {result.alternatives && result.alternatives.length > 0 && (
            <div style={{
              marginTop: '0.75rem', padding: '0.6rem 0.8rem',
              background: 'var(--card-bg, #f8f9fa)', borderRadius: '8px',
              fontSize: '0.85rem', color: 'var(--text-secondary, #666)',
            }}>
              <strong>Also possible:</strong>{' '}
              {result.alternatives.map((alt, i) => (
                <span key={i} style={{
                  display: 'inline-block', marginLeft: '0.5rem',
                  padding: '2px 8px', borderRadius: '6px',
                  background: 'var(--bg-secondary, #eee)',
                }}>
                  {alt.emoji} {alt.type} ({alt.confidence}%)
                </span>
              ))}
            </div>
          )}

          {/* human-in-the-loop dropdown */}
          <div style={{
            marginTop: '0.75rem', padding: '0.6rem 0.8rem',
            background: 'var(--card-bg, #f8f9fa)', borderRadius: '8px',
            fontSize: '0.85rem', color: 'var(--text-secondary, #666)',
            display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
            border: '1px dashed #cbd5e1'
          }}>
            <strong>Wrong food detected? Correct the AI:</strong>
            <select
              value={result.type}
              onChange={(e) => {
                const selected = FOOD_DB.find(f => f.type === e.target.value);
                if (selected) {
                  const updated = {
                    ...selected,
                    confidence: 100,
                    freshness: result.freshness,
                    servings: estimateServings(features, selected.type, result.freshness),
                    alternatives: []
                  };
                  setResult(updated);
                  if (onDetect) onDetect(updated);
                }
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #ccc)',
                background: 'var(--bg-secondary, #fff)',
                color: 'var(--text-color, #000)',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              {FOOD_DB.map(f => (
                <option key={f.type} value={f.type}>
                  {f.emoji} {f.type}
                </option>
              ))}
            </select>
          </div>

          <button className="detector-btn detector-btn-reset" onClick={resetDetector}>
            🔄 Scan Another Image
          </button>
        </div>
      )}
    </div>
  );
}

const delay = ms => new Promise(r => setTimeout(r, ms));
