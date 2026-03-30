import { useState, useRef } from 'react';

/**
 * VoiceAssistant — Voice AI component for hands-free food donation.
 * Uses Web Speech API for speech-to-text recognition.
 * Parses spoken commands like "Add food – 10 meals – near bus stand"
 */
export default function VoiceAssistant({ onCommand }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const startListening = () => {
    setError('');
    setParsed(null);
    setTranscript('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice recognition not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const result = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('');
      setTranscript(result);

      // Parse on final result
      if (event.results[0].isFinal) {
        const command = parseVoiceCommand(result);
        setParsed(command);
        if (onCommand && command.action) {
          onCommand(command);
        }
      }
    };

    recognition.onerror = (e) => {
      setError(`Error: ${e.error}`);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Parse natural language commands
  const parseVoiceCommand = (text) => {
    const lower = text.toLowerCase();
    const result = { raw: text, action: null, foodType: null, quantity: null, location: null };

    // Detect action
    if (lower.includes('add food') || lower.includes('donate') || lower.includes('list food')) {
      result.action = 'add_food';
    } else if (lower.includes('request') || lower.includes('need food')) {
      result.action = 'request_food';
    } else if (lower.includes('deliver') || lower.includes('pickup') || lower.includes('pick up')) {
      result.action = 'delivery';
    } else if (lower.includes('status') || lower.includes('track')) {
      result.action = 'check_status';
    }

    // Extract quantity (number + meals/servings/plates)
    const qtyMatch = lower.match(/(\d+)\s*(meals?|servings?|plates?|portions?|kg|kilos?|boxes?)/);
    if (qtyMatch) {
      result.quantity = `${qtyMatch[1]} ${qtyMatch[2]}`;
    }

    // Extract location (after "near" or "at" or "from")
    const locMatch = lower.match(/(?:near|at|from|in)\s+(.+?)(?:\s*$|\s*and|\s*with)/);
    if (locMatch) {
      result.location = locMatch[1].trim();
    } else {
      const locMatch2 = lower.match(/(?:near|at|from|in)\s+(.+)/);
      if (locMatch2) result.location = locMatch2[1].trim();
    }

    // Extract food type
    const foodTypes = ['rice', 'biryani', 'meals', 'chapathi', 'roti', 'dal', 'sambar', 'dosa', 'idli', 'bread', 'curry', 'fruits', 'vegetables', 'snacks', 'sweets'];
    for (const ft of foodTypes) {
      if (lower.includes(ft)) {
        result.foodType = ft.charAt(0).toUpperCase() + ft.slice(1);
        break;
      }
    }

    // Fallback food type from quantity context
    if (!result.foodType && result.action === 'add_food') {
      result.foodType = 'Mixed Meals';
    }

    return result;
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'add_food': return '📝 Add Food Donation';
      case 'request_food': return '🙏 Request Food';
      case 'delivery': return '🚚 Delivery Task';
      case 'check_status': return '📊 Check Status';
      default: return '❓ Unknown Command';
    }
  };

  return (
    <div className="voice-assistant">
      <div className="voice-header">
        <span className="voice-icon">🎙️</span>
        <div>
          <h3>Voice AI Assistant</h3>
          <p>Speak naturally to add food, request, or manage deliveries</p>
        </div>
      </div>

      <div className="voice-examples">
        <span className="voice-example">"Add food – 10 meals – near bus stand"</span>
        <span className="voice-example">"Request rice from Koramangala"</span>
        <span className="voice-example">"Deliver 5 plates near MG Road"</span>
      </div>

      <div className="voice-controls">
        <button
          className={`voice-btn ${isListening ? 'listening' : ''}`}
          onClick={isListening ? stopListening : startListening}
        >
          <span className="voice-btn-icon">{isListening ? '⏹️' : '🎤'}</span>
          {isListening ? 'Listening...' : 'Start Speaking'}
        </button>
      </div>

      {error && <div className="voice-error">{error}</div>}

      {transcript && (
        <div className="voice-transcript">
          <span className="voice-transcript-label">You said:</span>
          <p>"{transcript}"</p>
        </div>
      )}

      {parsed && parsed.action && (
        <div className="voice-parsed">
          <h4>🤖 AI Understood:</h4>
          <div className="voice-parsed-grid">
            <div className="voice-parsed-item">
              <span className="voice-parsed-key">Action</span>
              <span className="voice-parsed-val">{getActionLabel(parsed.action)}</span>
            </div>
            {parsed.foodType && (
              <div className="voice-parsed-item">
                <span className="voice-parsed-key">Food Type</span>
                <span className="voice-parsed-val">🍛 {parsed.foodType}</span>
              </div>
            )}
            {parsed.quantity && (
              <div className="voice-parsed-item">
                <span className="voice-parsed-key">Quantity</span>
                <span className="voice-parsed-val">📦 {parsed.quantity}</span>
              </div>
            )}
            {parsed.location && (
              <div className="voice-parsed-item">
                <span className="voice-parsed-key">Location</span>
                <span className="voice-parsed-val">📍 {parsed.location}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
