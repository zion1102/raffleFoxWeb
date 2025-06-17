import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import '../styles/ChatWidget.css';

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async (uid) => {
    try {
      const q = query(
        collection(db, 'chatLogs'),
        where('uid', '==', uid),
        orderBy('timestamp', 'asc')
      );
      const snapshot = await getDocs(q);
      const history = snapshot.docs.flatMap((docSnap) => {
        const data = docSnap.data();
        return [
          { sender: 'user', text: data.message },
          { sender: 'bot', text: data.reply },
        ];
      });
      setMessages(history);
    } catch (err) {
      console.error('Error loading chat history:', err.message);
    }
  };

  const handleToggle = async () => {
    const currentUser = auth.currentUser;
    const uid = currentUser?.uid;

    if (!open && uid) {
      await loadChatHistory(uid);
    } else if (!open) {
      setMessages([{ sender: 'bot', text: 'Hi! I’m RaffleBot. Ask me anything about the app.' }]);
    }

    setOpen(!open);
  };

  const checkForCommand = (input) => {
    const cmd = input.trim().toLowerCase();

    const commandMap = {
      '/topup': 'You can top up coins through your profile or the Top-Up page. Coins are used to submit guesses.',
      '/profile': 'You can edit your profile info or password from the Profile section.',
      '/guesses': 'To view your guesses, go to your profile and click on “My Guesses”.',
      '/like': 'You can like/bookmark any raffle by clicking the heart icon on the raffle card.',
      '/rules': 'Each raffle has a missing item in the image. The closest guess (within 10 pixels) wins!',
      '/coins': 'Coins are used to submit guesses. You can top up using real money via Stripe.',
      '/help': 'Available commands: /topup, /profile, /guesses, /like, /rules, /coins, /winners, /raffles',
      '/winners': 'After a raffle closes, the system picks the closest guess (within 10px) as the winner.',
      '/raffles': 'You can browse and join raffles on the Home screen. Tap on any card to view details.'
    };

    return commandMap[cmd] || null;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    const commandResponse = checkForCommand(input);
    if (commandResponse) {
      setMessages((prev) => [...prev, { sender: 'bot', text: commandResponse }]);
      return;
    }

    try {
      setTyping(true);
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid;

      let userData = null;
      if (uid) {
        const docSnap = await getDoc(doc(db, 'users', uid));
        userData = docSnap.exists() ? docSnap.data() : null;
      }

      const res = await fetch('https://us-central1-rafflefox-23872.cloudfunctions.net/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: {
            isLoggedIn: !!uid,
            uid,
            coinBalance: userData?.coinBalance || 0,
          }
        })
      });

      const data = await res.json();
      setTyping(false);

      if (typeof data === 'string') {
        setMessages((prev) => [...prev, { sender: 'bot', text: data }]);
      } else if (data?.error) {
        setMessages((prev) => [...prev, { sender: 'bot', text: `⚠️ ${data.error}` }]);
      } else {
        setMessages((prev) => [...prev, { sender: 'bot', text: '⚠️ Unexpected response from server.' }]);
      }

    } catch (error) {
      setTyping(false);
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Something went wrong.' }]);
    }
  };

  return (
    <div className="chat-widget-container">
      <button className="chat-toggle-btn" onClick={handleToggle}>💬</button>
      {open && (
        <div className="chat-box">
          <div className="chat-header">RaffleBot</div>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-msg ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            {typing && <div className="chat-msg bot">RaffleBot is typing...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me something..."
            />
            <button onClick={sendMessage}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
