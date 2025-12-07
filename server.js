// server.js
// Backend for Student Information System + AI Chat (OpenRouter + Mistral 7B Instruct)
// Now with JSON file persistence for students

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const fetch = require("node-fetch"); // npm i node-fetch@2

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://localhost:3000",
      "https://your-frontend-url.com", // replace with your deployed frontend
    ],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  })
);

// ----- Load students.json at startup -----
const STUDENTS_FILE = "students.json";
let students = [];

function loadStudents() {
  try {
    const data = fs.readFileSync(STUDENTS_FILE, "utf8");
    students = JSON.parse(data);
    console.log(`Loaded ${students.length} students from ${STUDENTS_FILE}`);
  } catch (err) {
    console.warn("No students.json found, starting with empty list.");
    students = [];
  }
}

function saveStudents() {
  try {
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2));
    console.log("Saved students.json");
  } catch (err) {
    console.error("Error saving students.json:", err);
  }
}

loadStudents();

// ----- Health check -----
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "student-backend", time: new Date().toISOString() });
});

// ----- Student CRUD -----
app.get("/students", (_req, res) => {
  res.json(students);
});

app.post("/students", (req, res) => {
  const { studentID, fullName, program, yearLevel, gender, gmail, university } = req.body;

  if (!studentID || !fullName) {
    return res.status(400).json({ error: "studentID and fullName are required." });
  }
  if (students.some((s) => s.studentID === studentID)) {
    return res.status(409).json({ error: "Student with this ID already exists." });
  }

  const student = { studentID, fullName, program, yearLevel, gender, gmail, university };
  students.push(student);
  saveStudents();
  res.status(201).json(student);
});

app.delete("/students/:id", (req, res) => {
  const id = req.params.id;
  const index = students.findIndex((s) => s.studentID === id);
  if (index === -1) {
    return res.status(404).json({ error: "Student not found." });
  }
  const removed = students.splice(index, 1)[0];
  saveStudents();
  res.json({ success: true, removed });
});

// ----- AI Chat via OpenRouter -----
app.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required and must be a string." });
  }

  const studentSummary = JSON.stringify(students.slice(0, 200));
  const systemPrompt = `
You are an assistant for a Student Information System. Use the provided student data when relevant.
Data (JSON array, may be partial):
${studentSummary}
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
        "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5500",
        "X-Title": "Student Info Chat",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct",
        messages: [
          { role: "system", content: systemPrompt.trim() },
          { role: "user", content: message },
        ],
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data?.error?.message || data?.error || "Failed to get response from AI.";
      return res.status(response.status || 500).json({ error: errMsg });
    }

    const content = data?.choices?.[0]?.message?.content || "No content returned.";
    res.json({ success: true, message: content });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Server error while communicating with AI." });
  }
});

// ----- 404 handler -----
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ----- Start server -----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
