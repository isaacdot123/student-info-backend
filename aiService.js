// aiservice.js
// Handles communication with backend AI chat route

const CHAT_URL = "https://student-info-backend2-0.onrender.com/chat"; 
// ^ Replace with your actual Render backend URL

/**
 * Send a message to the backend AI service
 * @param {string} message - The user’s question or prompt
 * @returns {Promise<string>} - The AI’s reply
 */
export async function askAI(message) {
  try {
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error communicating with AI");
    }

    // Our backend returns { success, message, raw }
    return data.message || "No response from AI.";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "Error communicating with AI service.";
  }
}
