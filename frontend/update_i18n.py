import re
with open('src/i18n.js', 'r', encoding='utf-8') as f:
    content = f.read()

en_add = '''
    farm_detail: {
      back: "← Back to dashboard",
      map_title: "Farm Boundary & Satellite Field Map",
      loading_zones: "Loading satellite zones...",
      boundary_captured: "Boundary captured — area calculated dynamically.",
      good_vigor: "Good Vigor",
      moderate: "Moderate",
      low_vigor: "Low Vigor"
    },
    offers_page: {
      subtitle: "Offers you've sent to farmers on the marketplace.",
      no_offers: "You haven't sent any offers yet. Browse the marketplace to find crops to buy.",
      your_offer: "Your offer:",
      mark_paid: "Mark as Paid"
    },
    medicine: {
      title: "Medicine Assistant",
      subtitle: "General guidance on pests, disease, and nutrient issues — always confirm exact products with a local expert.",
      crop: "Crop",
      thinking: "Thinking...",
      ask_placeholder: "Ask your farming question...",
      greeting: "Hello Farmer! I'm the AgriTwin Medicine Assistant. Ask me about pests, diseases, or nutrient issues in your crop.",
      s1: "My leaves are turning yellow",
      s2: "I see white powdery spots on leaves",
      s3: "Pest holes appearing on leaves",
      s4: "Stunted growth this season"
    }
'''

hi_add = '''
    farm_detail: {
      back: "← डैशबोर्ड पर वापस जाएं",
      map_title: "खेत की सीमा और उपग्रह क्षेत्र का नक्शा",
      loading_zones: "उपग्रह क्षेत्र लोड हो रहे हैं...",
      boundary_captured: "सीमा कैप्चर की गई — क्षेत्र की गणना गतिशील रूप से की गई।",
      good_vigor: "अच्छा स्वास्थ्य",
      moderate: "मध्यम",
      low_vigor: "कमजोर स्वास्थ्य"
    },
    offers_page: {
      subtitle: "बाज़ार में किसानों को भेजे गए आपके ऑफर।",
      no_offers: "आपने अभी तक कोई ऑफर नहीं भेजा है। खरीदने के लिए फसलें खोजने के लिए बाज़ार ब्राउज़ करें।",
      your_offer: "आपका ऑफर:",
      mark_paid: "भुगतान किया गया चिह्नित करें"
    },
    medicine: {
      title: "चिकित्सा सहायक",
      subtitle: "कीटों, बीमारियों और पोषक तत्वों की समस्याओं पर सामान्य मार्गदर्शन — हमेशा किसी स्थानीय विशेषज्ञ से सटीक उत्पादों की पुष्टि करें।",
      crop: "फसल",
      thinking: "सोच रहा हूँ...",
      ask_placeholder: "अपना खेती का सवाल पूछें...",
      greeting: "नमस्ते किसान! मैं एग्रीट्विन चिकित्सा सहायक हूँ। मुझसे अपनी फसल में कीटों, बीमारियों या पोषक तत्वों की समस्याओं के बारे में पूछें।",
      s1: "मेरे पत्ते पीले हो रहे हैं",
      s2: "मुझे पत्तों पर सफेद पाउडर जैसे धब्बे दिख रहे हैं",
      s3: "पत्तों पर कीटों के छेद दिखाई दे रहे हैं",
      s4: "इस मौसम में वृद्धि रुक गई है"
    }
'''

mr_add = '''
    farm_detail: {
      back: "← डॅशबोर्डवर परत जा",
      map_title: "शेताची सीमा आणि उपग्रह नकाशा",
      loading_zones: "उपग्रह झोन लोड होत आहेत...",
      boundary_captured: "सीमा कॅप्चर केली — क्षेत्राची गणना डायनॅमिकपणे केली गेली.",
      good_vigor: "चांगले आरोग्य",
      moderate: "मध्यम",
      low_vigor: "कमकुवत आरोग्य"
    },
    offers_page: {
      subtitle: "तुम्ही बाजारपेठेत शेतकर्‍यांना पाठवलेले ऑफर.",
      no_offers: "तुम्ही अद्याप कोणतेही ऑफर पाठवले नाहीत. खरेदी करण्यासाठी पिके शोधण्यासाठी बाजारपेठ ब्राउझ करा.",
      your_offer: "तुमचा ऑफर:",
      mark_paid: "पैसे दिले म्हणून खूण करा"
    },
    medicine: {
      title: "वैद्यकीय सहाय्यक",
      subtitle: "कीड, रोग आणि पोषक तत्त्वांच्या समस्यांवर सामान्य मार्गदर्शन — नेहमी स्थानिक तज्ञाकडून अचूक उत्पादनांची पुष्टी करा.",
      crop: "पीक",
      thinking: "विचार करत आहे...",
      ask_placeholder: "तुमचा शेतीचा प्रश्न विचारा...",
      greeting: "नमस्कार शेतकरी! मी अॅग्रीट्विन वैद्यकीय सहाय्यक आहे. मला तुमच्या पिकातील कीड, रोग किंवा पोषक तत्त्वांच्या समस्यांबद्दल विचारा.",
      s1: "माझी पाने पिवळी पडत आहेत",
      s2: "मला पानांवर पांढरे पावडरसारखे डाग दिसत आहेत",
      s3: "पानांवर कीटकांची छिद्रे दिसत आहेत",
      s4: "या हंगामात वाढ खुंटली आहे"
    }
'''

def insert_lang(c, lang, add_str):
    pattern = r"(const\s+" + lang + r"\s*=\s*\{\s*translation\s*:\s*\{)(.*?)(\n  \},\n\};)"
    match = re.search(pattern, c, re.DOTALL)
    if match:
        new_block = match.group(1) + match.group(2) + ",\n" + add_str + match.group(3)
        return c[:match.start()] + new_block + c[match.end():]
    return c

content = insert_lang(content, 'en', en_add)
content = insert_lang(content, 'hi', hi_add)
content = insert_lang(content, 'mr', mr_add)

with open('src/i18n.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('i18n updated successfully!')
