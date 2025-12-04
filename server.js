// server.js
require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { OpenAI } = require("openai");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Student Information System Backend is running.");
});


// Path to student dataset
const dataPath = path.join(__dirname, "students.json");

// Helper: read data from JSON file
function readData() {
  try {
    const jsonData = fs.readFileSync(dataPath);
    return JSON.parse(jsonData);
  } catch (error) {
    return [];
  }
}

// Helper: write data to JSON file
function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// -------------------- CRUD ROUTES --------------------

// GET /students - get all students
app.get("/students", (req, res) => {
  const students = readData();
  res.json(students);
});

// POST /students - add new student
app.post("/students", (req, res) => {
  const newStudent = req.body;

  // Basic validation
  if (
    !newStudent.studentID ||
    !newStudent.fullName ||
    !newStudent.gender ||
    !newStudent.gmail ||
    !newStudent.program ||
    !newStudent.yearLevel ||
    !newStudent.university
  ) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // Simple email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newStudent.gmail)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  const students = readData();

  // Check for duplicate studentID
  if (students.some((s) => s.studentID === newStudent.studentID)) {
    return res.status(400).json({ error: "Student ID must be unique." });
  }

  students.push(newStudent);
  writeData(students);
  res.status(201).json({ message: "Student added successfully." });
});

// DELETE /students/:id - delete student by studentID
app.delete("/students/:id", (req, res) => {
  const id = req.params.id;
  let students = readData();

  const initialLength = students.length;
  students = students.filter((student) => student.studentID !== id);

  if (students.length === initialLength) {
    return res.status(404).json({ error: "Student not found." });
  }

  writeData(students);
  res.json({ message: "Student deleted successfully." });
});

// -------------------- LLM CHAT ROUTE --------------------

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Invalid question." });
  }

  const students = readData();
  if (!Array.isArray(students) || students.length === 0) {
    return res.json({
      messages: [
        { role: "user", content: message },
        { role: "assistant", content: "The student dataset is empty. No records to analyze." },
      ],
    });
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a data analysis assistant. Answer strictly based on the provided student JSON data.`,
        },
        {
          role: "user",
          content: `Here is the student dataset:\n${JSON.stringify(students, null, 2)}\n\nQuestion: ${message}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 600,
    });

    const answer = response.choices[0].message.content;

    res.json({
      messages: [
        { role: "user", content: message },
        { role: "assistant", content: answer || "No answer generated." },
      ],
    });
  } catch (err) {
    console.error("LLM error:", err);
    res.status(502).json({ error: "LLM API failed. Please try again later." });
  }
});

// -------------------- START SERVER --------------------

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
