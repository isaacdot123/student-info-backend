// server.js
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // ensure installed: npm install node-fetch

const app = express();
app.use(cors());
app.use(express.json());

// --- Student CRUD Routes ---
// Example: replace with your actual student DB logic
let students = [];

// Get all students
app.get("/students", (req, res) => {
  res.json(students);
});

// Add student
app.post("/students", (req, res) => {
  const student = req.body;
  if (!student.studentID || !student.fullName) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  students.push(student);
  res.json(student);
});

// Delete student
app.delete("/students/:id", (req, res) => {
  const id = req.params.id;
  const index = students.findIndex(s => s.studentID === id);
  if (index === -1) {
    return res.status(404).json({ error: "Student not found." });
  }
  students.splice(index, 1);
  res.json({ success: true });
});

// --- AI Chat Route using OpenRouter ---
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, // use env var
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5500", // change to your frontend URL if deployed
        "X-Title": "Student Info Chat"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct", // free model
        messages: [
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error || "Failed to get response from AI." });
    }

    res.json(data);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Server error while communicating with AI." });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
