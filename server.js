// server.js
// Student Information System + AI Chat with JSON persistence

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

// ----- CORS: allow VS Code Live Server -----
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:3000",
      "https://student-info-system.vercel.app" // future deployed frontend
    ],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  })
);

// ----- JSON persistence -----
const STUDENTS_FILE = "students.json";
let students = [];

function loadStudents() {
  try {
    const data = fs.readFileSync(STUDENTS_FILE, "utf8");
    students = JSON.parse(data);
    console.log(`Loaded ${students.length} students`);
  } catch {
    students = [];
    console.warn("No students.json found, starting empty.");
  }
}

function saveStudents() {
  fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2));
}

loadStudents();

// ----- Health check -----
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "student-backend", time: new Date().toISOString() });
});

// ----- Student CRUD -----
app.get("/students", (_req, res) => res.json(students));

app.post("/students", (req, res) => {
  const { studentID, fullName, program, yearLevel, gender, gmail, university } = req.body;
  if (!studentID || !fullName) return res.status(400).json({ error: "studentID and fullName required." });
  if (students.some((s) => s.studentID === studentID)) return res.status(409).json({ error: "Duplicate ID." });

  const student = { studentID, fullName, program, yearLevel, gender, gmail, university };
  students.push(student);
  saveStudents();
  res.status(201).json(student);
});

app.delete("/students/:id", (req, res) => {
  const index = students.findIndex((s) => s.studentID === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Student not found." });
  const removed = students.splice(index, 1)[0];
  saveStudents();
  res.json({ success: true, removed });
});

// ----- AI Chat -----
app.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required." });

  const studentSummary = JSON.stringify(students.slice(0, 200));
  const systemPrompt = `You are an assistant for a Student Information System. Use this data:\n${studentSummary}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5500",
        "X-Title": "Student Info Chat",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "AI error" });

    const content = data?.choices?.[0]?.message?.content || "No response.";
    res.json({ success: true, message: content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error communicating with AI." });
  }
});

// ----- 404 -----
app.use((_req, res) => res.status(404).json({ error: "Not Found" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
