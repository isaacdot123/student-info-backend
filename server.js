// server.js
// Backend for Student Information System + AI Chat (OpenRouter + Mistral 7B Instruct)

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // npm i node-fetch@2 (if using Node 16/Render default)

const app = express();

// ----- Config -----
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5500",       // VS Code Live Server
      "http://localhost:3000",       // Local backend tests
      "https://your-frontend-url.com", // Replace with your deployed frontend URL
    ],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    credentials: false,
  })
);

// ----- In-memory student store (replace with DB in production) -----
let students = [
  // Example format:
  // { studentID: "2025-001", fullName: "Jane Doe", program: "BSIT", yearLevel: "3", gender: "Female" }
];

// ----- Health check -----
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "student-backend", time: new Date().toISOString() });
});

// ----- Student CRUD -----

// Get all students
app.get("/students", (_req, res) => {
  res.json(students);
});

// Add student
app.post("/students", (req, res) => {
  const { studentID, fullName, program, yearLevel, gender } = req.body;

  if (!studentID || !fullName) {
    return res.status(400).json({ error: "studentID and fullName are required." });
  }
  if (students.some((s) => s.studentID === studentID)) {
    return res.status(409).json({ error: "Student with this ID already exists." });
  }

  const student = { studentID, fullName, program, yearLevel, gender };
  students.push(student);
  res.status(201).json(student);
});

// Delete student by ID
app.delete("/students/:id", (req, res) => {
  const id = req.params.id;
  const index = students.findIndex((s) => s.studentID === id);
  if (index === -1) {
    return res.status(404).json({ error: "Student not found." });
  }
  const removed = students.splice(index, 1)[0];
  res.json({ success: true, removed });
});

// ----- AI Chat via OpenRouter -----

app.post("/chat", async (req, res) => {
  const { message, context } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required and must be a string." });
  }

  // Build a helpful system prompt using current student data for better answers
  const studentSummary = JSON.stringify(students.slice(0, 500)); // cap to avoid long payloads
  const systemPrompt = `
You are an assistant for a Student Information System. Answer questions using the provided student data when relevant.
Data (JSON array, may be partial):
${studentSummary}

If asked for counts, programs, year levels, or summaries, compute directly from the data above. If data is missing, say so clearly.
Be concise and accurate. If the user asks for a list, return short, readable bulleted items.
`;

  try {
    const orKey = process.env.OPENROUTER_API_KEY;
    if (!orKey) {
      return res.status(500).json({ error: "OPENROUTER_API_KEY is not set." });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${orKey}`,
        "Content-Type": "application/json",
        // Referer helps OpenRouter validate requests and leaderboard attribution
        "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5500",
        "X-Title": "Student Info Chat",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct",
        messages: [
          { role: "system", content: systemPrompt.trim() },
          ...(context && Array.isArray(context) ? context : []), // optional prior messages
          { role: "user", content: message },
        ],
        temperature: 0.2,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Normalize OpenRouter error messages
      const errMsg =
        (data && data.error && (data.error.message || data.error)) ||
        "Failed to get response from AI.";
      return res.status(response.status || 500).json({ error: errMsg });
    }

    // Return only relevant parts for frontend
    const content =
      data?.choices?.[0]?.message?.content ||
      "No content returned. Try rephrasing your question.";

    res.json({
      success: true,
      model: "mistralai/mistral-7b-instruct",
      message: content,
      raw: data, // keep raw for debugging; remove in production if you prefer
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Server error while communicating with AI." });
  }
});

// ----- 404 handler for unmatched routes -----
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ----- Start server -----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
