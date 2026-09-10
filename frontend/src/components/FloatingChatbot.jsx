import { useState, useEffect, useRef } from "react";
import { api } from "../services/api.js";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
];

const CROPS = [
  "General",
  "Wheat",
  "Soybean",
  "Cotton",
  "Rice",
  "Sugarcane",
  "Onion",
  "Tomato",
  "Maize",
];

const GREETINGS = {
  en: "Namaste! I am AgriMitra AI, your 24/7 smart farming advisor. Ask me anything about crop diseases, pest control, weather, fertilizers, or mandi prices!",
  hi: "नमस्ते! मैं एग्रीमित्र एआई हूँ, आपका 24/7 स्मार्ट कृषि मित्र। मुझसे फसल रोग, कीटनाशक, मौसम, खाद या मंडी भाव के बारे में कुछ भी पूछें!",
  mr: "नमस्कार! मी अॅग्रीमित्र एआय आहे, तुमचा २४/७ स्मार्ट शेती मार्गदर्शक. मला पिकांवरील रोग, कीड नियंत्रण, हवामान, खते किंवा बाजारभावाबद्दल काहीही विचारा!",
};

const SUGGESTIONS = {
  en: [
    "🌿 Why are my crop leaves turning yellow?",
    "🐛 How to prevent stem borer pest attacks?",
    "💧 When is the best time for irrigation this week?",
    "📈 How can I get the highest price at APMC mandi?",
  ],
  hi: [
    "🌿 मेरी फसल की पत्तियां पीली क्यों पड़ रही हैं?",
    "🐛 कीट और तना छेदक के लिए कौन सी दवा स्प्रे करें?",
    "💧 इस सप्ताह सिंचाई करने का सबसे सही समय क्या है?",
    "📈 नजदीकी मंडी में सबसे ज्यादा दाम कैसे पाएं?",
  ],
  mr: [
    "🌿 माझ्या पिकाची पाने पिवळी का पडत आहेत?",
    "🐛 खोडकिडीच्या नियंत्रणासाठी कोणती फवारणी करावी?",
    "💧 या आठवड्यात पिकाला पाणी देण्याची योग्य वेळ कोणती?",
    "📈 जवळच्या बाजार समितीत पिकाला चांगला भाव कसा मिळेल?",
  ],
};

export default function FloatingChatbot({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState(user?.language || "en");
  const [crop, setCrop] = useState("General");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: GREETINGS[user?.language || "en"] || GREETINGS.en,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (user?.language && (user.language === "hi" || user.language === "mr" || user.language === "en")) {
      setLanguage(user.language);
    }
  }, [user]);

  // Listen for external open+send requests (e.g. from Disease Detection page)
  useEffect(() => {
    const handler = (e) => {
      setIsOpen(true);
      if (e.detail?.question) {
        setTimeout(() => handleSend(e.detail.question), 300);
      }
    };
    window.addEventListener("agrimitra:open", handler);
    return () => window.removeEventListener("agrimitra:open", handler);
  }, []);

  // Setup Web Speech API for Speech-to-Text
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
    }
  }, [language]);

  // Update recognition language when language changes
  useEffect(() => {
    if (recognitionRef.current) {
      const localeMap = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };
      recognitionRef.current.lang = localeMap[language] || "en-US";
    }
  }, [language]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const speakText = (text, lang) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    if (!isSpeaking) {
      const localeMap = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = localeMap[lang] || "en-US";
      utterance.rate = 0.95;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 100);
    } else {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    const greetingMsg = {
      role: "assistant",
      text: GREETINGS[newLang],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, greetingMsg]);
  };

  const handleSend = async (textToSend) => {
    const query = (typeof textToSend === "string" ? textToSend : input).trim();
    if (!query || loading) return;

    window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    const userMsg = {
      role: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const activeCrop = crop === "General" ? undefined : crop;
      const res = await api.askMedicineAssistant(query, activeCrop, language);
      const botAnswer = res.answer || "I received your question and am preparing advice.";
      
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: botAnswer,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      
      speakText(botAnswer, language);
    } catch (err) {
      const errorMsg =
        language === "mr"
          ? "क्षमस्व, सर्व्हरशी संपर्क साधण्यात अडचण येत आहे. कृपया पुन्हा प्रयत्न करा."
          : language === "hi"
          ? "क्षमा करें, सर्वर से कनेक्ट करने में समस्या हुई। कृपया पुनः प्रयास करें।"
          : "I'm having trouble connecting right now. Please try again in a moment.";
        
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: errorMsg,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        },
      ]);
      speakText(errorMsg, language);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setMessages([
      {
        role: "assistant",
        text: GREETINGS[language],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const activeSuggestions = SUGGESTIONS[language] || SUGGESTIONS.en;

  return (
    <>
      {/* Floating Action Container */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "10px",
        }}
      >
        {/* Chat Window */}
        {isOpen && (
          <div
            style={{
              width: "380px",
              maxWidth: "calc(100vw - 32px)",
              height: "560px",
              maxHeight: "calc(100vh - 110px)",
              background: "#fffdf8",
              borderRadius: "18px",
              boxShadow: "0 12px 40px rgba(47, 42, 32, 0.22), 0 2px 10px rgba(0,0,0,0.08)",
              border: "1px solid #e2dac7",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "agriSlideUp 0.25s ease-out forwards",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #2b4425 0%, #3e6335 100%)",
                color: "#fff",
                padding: "1rem 1.15rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <img
                  src="/chatbot-logo.png"
                  alt="AgriMitra AI"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    objectFit: "contain",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.4)",
                  }}
                />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <h4 style={{ margin: 0, fontSize: "1.05rem", color: "#fff", fontFamily: "Fraunces, serif" }}>
                      AgriMitra AI
                    </h4>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#5efc82",
                        boxShadow: "0 0 8px #5efc82",
                        display: "inline-block",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#c8dfc1", marginTop: "1px" }}>
                    Smart Farming Companion
                  </div>
                </div>
              </div>

              {/* Header Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={clearChat}
                  title="Reset conversation"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    padding: "4px 8px",
                    fontSize: "0.76rem",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    borderRadius: "50%",
                    width: 28,
                    height: 28,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Context Filters (Crop & Language) */}
            <div
              style={{
                background: "#f7f2e7",
                borderBottom: "1px solid #e7dfcf",
                padding: "0.5rem 1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.8rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "#776e5d", fontWeight: 500 }}>Crop:</span>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  style={{
                    padding: "2px 6px",
                    fontSize: "0.78rem",
                    borderRadius: "6px",
                    border: "1px solid #d4cab5",
                    background: "#fff",
                    color: "#2f2a20",
                    cursor: "pointer",
                  }}
                >
                  {CROPS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => handleLanguageChange(l.code)}
                    style={{
                      background: language === l.code ? "#35502f" : "transparent",
                      color: language === l.code ? "#fff" : "#5d5444",
                      border: language === l.code ? "none" : "1px solid transparent",
                      borderRadius: "5px",
                      padding: "2px 6px",
                      fontSize: "0.74rem",
                      cursor: "pointer",
                      fontWeight: language === l.code ? 600 : 400,
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
                background: "#fcfaf4",
              }}
            >
              {messages.map((m, idx) => {
                const isBot = m.role === "assistant";
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      flexDirection: isBot ? "row" : "row-reverse",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    {isBot && (
                      <img
                        src="/chatbot-logo.png"
                        alt="AgriMitra AI"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          objectFit: "contain",
                          marginTop: "2px",
                          flexShrink: 0,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                        }}
                      />
                    )}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: isBot ? "flex-start" : "flex-end", maxWidth: "84%" }}>
                      <div
                        style={{
                          padding: "0.65rem 0.9rem",
                          borderRadius: isBot ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                          background: isBot ? "#ffffff" : "#35502f",
                          color: isBot ? "#2a241b" : "#ffffff",
                          fontSize: "0.88rem",
                          lineHeight: "1.42",
                          border: isBot ? "1px solid #e7dfcf" : "none",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {m.text}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "3px" }}>
                        <span style={{ fontSize: "0.68rem", color: "#9c9380", padding: "0 2px" }}>
                          {m.time}
                        </span>
                        {isBot && (
                          <button
                            onClick={() => speakText(m.text, language)}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              padding: "0 2px",
                              color: isSpeaking ? "#1c64f2" : "#9c9380",
                            }}
                            title="Read aloud"
                          >
                            🔊
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6b6455", fontSize: "0.82rem" }}>
                  <img
                    src="/chatbot-logo.png"
                    alt="AgriMitra AI"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      objectFit: "contain",
                      animation: "agriPulse 1.2s infinite",
                    }}
                  />
                  <span>AgriMitra is thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            {messages.length <= 3 && (
              <div
                style={{
                  padding: "0.5rem 0.8rem",
                  background: "#f7f2e7",
                  borderTop: "1px solid #eae2d3",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "#776e5d", fontWeight: 600 }}>Suggested Questions:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {activeSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s)}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #ded5c2",
                        borderRadius: "12px",
                        padding: "3px 8px",
                        fontSize: "0.73rem",
                        color: "#35502f",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              style={{
                padding: "0.75rem",
                background: "#ffffff",
                borderTop: "1px solid #e7dfcf",
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=""
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "0.6rem 0.85rem",
                  borderRadius: "22px",
                  border: "1px solid #dcd2bd",
                  background: "#fcfaf4",
                  fontSize: "0.85rem",
                  outline: "none",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.03)",
                }}
              />
              <button
                type="button"
                onClick={toggleListening}
                disabled={loading}
                title={isListening ? "Listening... click to stop" : "Voice input"}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "none",
                  background: isListening ? "#e02424" : "#f0ece4",
                  color: isListening ? "#fff" : "#6b6455",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: loading ? "default" : "pointer",
                  flexShrink: 0,
                  transition: "background 0.2s ease",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="22"></line>
                </svg>
              </button>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "none",
                  background: input.trim() && !loading ? "#35502f" : "#b4ae9f",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  transition: "background 0.2s ease",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* Floating Bubble Button */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Open AgriMitra AI Chat"
          style={{
            width: "62px",
            height: "62px",
            borderRadius: "50%",
            background: "#ffffff",
            color: "#ffffff",
            border: "none",
            boxShadow: "0 6px 22px rgba(47, 74, 40, 0.35), 0 2px 8px rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
            padding: 0,
            transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {isOpen ? (
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#2f4a28", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#fff" }}>✕</span>
            </div>
          ) : (
            <img
              src="/chatbot-logo.png"
              alt="AgriMitra AI"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          )}

          {/* Unread badge / pulse indicator */}
          {!isOpen && unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-2px",
                right: "-2px",
                background: "#d9a441",
                color: "#2f2a20",
                fontSize: "0.72rem",
                fontWeight: "bold",
                borderRadius: "50%",
                width: "22px",
                height: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
              }}
            >
              1
            </span>
          )}
        </button>
      </div>

      <style>{`
        @keyframes agriSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes agriPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
      `}</style>
    </>
  );
}
