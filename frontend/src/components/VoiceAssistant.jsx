import { useState, useRef } from 'react';

/**
 * VoiceAssistant — Voice & Text Natural Language Parsing AI.
 * Uses Web Speech API for speech-to-text recognition, with a manual text input
 * fallback and quick-test templates to ensure 100% usability.
 */
export default function VoiceAssistant({ onCommand }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textCommand, setTextCommand] = useState('');
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const startListening = () => {
    setError('');
    setParsed(null);
    setTranscript('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice recognition not supported in this browser. Try Chrome or use the text input below.');
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
        handleParse(result);
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'network') {
        setError('Google Speech servers are temporarily unreachable. Please use the Text Input option below!');
      } else {
        setError(`Speech Error: ${e.error}`);
      }
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

  // Run the NLP parser and pass the command up
  const handleParse = (text) => {
    const command = parseVoiceCommand(text);
    setParsed(command);
    if (onCommand && command.action) {
      onCommand(command);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textCommand.trim()) return;
    setTranscript(textCommand);
    handleParse(textCommand);
    setTextCommand('');
  };

  const handleQuickTest = (phrase) => {
    setTranscript(phrase);
    handleParse(phrase);
  };

  // Parse natural language commands using regex NLP
  const parseVoiceCommand = (text) => {
    const lower = text.toLowerCase();
    const result = { raw: text, action: null, foodType: null, quantity: null, location: null };

    // Detect action
    if (lower.includes('add food') || lower.includes('donate') || lower.includes('list food') || lower.includes('give')) {
      result.action = 'add_food';
    } else if (lower.includes('request') || lower.includes('need food') || lower.includes('want food')) {
      result.action = 'request_food';
    } else if (lower.includes('deliver') || lower.includes('pickup') || lower.includes('pick up')) {
      result.action = 'delivery';
    } else if (lower.includes('status') || lower.includes('track')) {
      result.action = 'check_status';
    }

    // Extract quantity (number + meals/servings/plates/kg)
    const qtyMatch = lower.match(/(\d+)\s*(meals?|servings?|plates?|portions?|kg|kilos?|boxes?)/);
    if (qtyMatch) {
      result.quantity = `${qtyMatch[1]} ${qtyMatch[2]}`;
    }

    // Extract location (after "near" or "at" or "from" or "in")
    const locMatch = lower.match(/(?:near|at|from|in)\s+(.+?)(?:\s*$|\s*and|\s*with)/);
    if (locMatch) {
      result.location = locMatch[1].trim();
    } else {
      const locMatch2 = lower.match(/(?:near|at|from|in)\s+(.+)/);
      if (locMatch2) result.location = locMatch2[1].trim();
    }

    // Extract food type
    const foodTypes = ['rice', 'biryani', 'meals', 'chapathi', 'roti', 'dal', 'sambar', 'dosa', 'idli', 'bread', 'curry', 'fruits', 'vegetables', 'snacks', 'sweets', 'upma', 'poha', 'vada', 'paneer', 'puri', 'paratha', 'pulao', 'khichdi', 'curd rice', 'naan'];
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
          <h3>Voice &amp; Text AI Assistant</h3>
          <p>Speak or type naturally to manage listings, requests, or deliveries</p>
        </div>
      </div>

      {/* Interactive Quick-Test Actions */}
      <div className="voice-examples">
        <p style={{ margin: '0 0 6px 0', fontSize: '0.8rem', opacity: 0.8 }}>⚡ Click a sample command to test instantly:</p>
        <button className="voice-example-btn" onClick={() => handleQuickTest('Add food – 15 servings of Upma near MG Road')}>
          🍛 "Add food – 15 servings of Upma near MG Road"
        </button>
        <button className="voice-example-btn" onClick={() => handleQuickTest('Donate 50 meals of Biryani at Koramangala')}>
          🍛 "Donate 50 meals of Biryani at Koramangala"
        </button>
        <button className="voice-example-btn" onClick={() => handleQuickTest('Request 10 plates of Idli from Indiranagar')}>
          🍚 "Request 10 plates of Idli from Indiranagar"
        </button>
      </div>

      <div className="voice-controls" style={{ gap: '10px' }}>
        <button
          className={`voice-btn ${isListening ? 'listening' : ''}`}
          onClick={isListening ? stopListening : startListening}
          type="button"
        >
          <span className="voice-btn-icon">{isListening ? '⏹️' : '🎤'}</span>
          {isListening ? 'Listening...' : 'Start Speaking'}
        </button>
      </div>

      {error && (
        <div className="voice-error" style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', margin: '10px 0' }}>
          <strong>⚠️ {error}</strong>
        </div>
      )}

      {/* Text Command Fallback */}
      <form onSubmit={handleTextSubmit} className="voice-text-fallback" style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={textCommand}
          onChange={(e) => setTextCommand(e.target.value)}
          placeholder='Or type here, e.g., "Add food – 10 meals of Upma near Whitefield"'
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #ccc)',
            background: 'var(--bg-secondary, #fff)',
            color: 'var(--text-color, #000)',
            fontSize: '0.85rem'
          }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          Parse
        </button>
      </form>

      {transcript && (
        <div className="voice-transcript">
          <span className="voice-transcript-label">Processed Command:</span>
          <p style={{ fontWeight: '500', color: 'var(--text-color)' }}>"{transcript}"</p>
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
