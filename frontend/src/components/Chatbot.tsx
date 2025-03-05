import React, { useState, useEffect } from 'react';

interface ChatMessage {
  text: string;
  isUser: boolean;
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { text: input, isUser: true };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming you store the token in localStorage
        },
        body: JSON.stringify({ query: input })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const botMessage: ChatMessage = { text: data.answer || "No answer received.", isUser: false };
      setMessages(prevMessages => [...prevMessages, botMessage]);

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = { text: `Error: ${error}`, isUser: false };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Scroll to bottom of chat window on new message
    const chatWindow = document.querySelector('.h-64');
    if (chatWindow) {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="bg-gray-100 rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4">Knowledge Base Chatbot</h2>
      <div className="h-64 overflow-y-auto mb-4">
        {messages.map((message, index) => (
          <div key={index} className={`mb-2 ${message.isUser ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded-lg ${message.isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {message.text}
            </span>
          </div>
        ))}
        {isLoading && <div className="text-left">Loading...</div>}
      </div>
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-l-lg"
          placeholder="Type your question..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
        />
        <button onClick={handleSendMessage} className="bg-blue-600 text-white py-2 px-4 rounded-r-lg hover:bg-blue-700 transition-colors" disabled={isLoading}>
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
