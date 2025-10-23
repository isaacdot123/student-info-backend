const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;


app.use(cors());
app.use(express.json());

const dataPath = path.join(__dirname, 'students.json');

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

// GET /students - get all students
app.get('/students', (req, res) => {
  const students = readData();
  res.json(students);
});

// POST /students - add new student
app.post('/students', (req, res) => {
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
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Simple email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newStudent.gmail)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  // Read existing data
  const students = readData();

  // Check for duplicate studentID
  if (students.some(s => s.studentID === newStudent.studentID)) {
    return res.status(400).json({ error: 'Student ID must be unique.' });
  }

  students.push(newStudent);
  writeData(students);
  res.status(201).json({ message: 'Student added successfully.' });
});

// DELETE /students/:id - delete student by studentID
app.delete('/students/:id', (req, res) => {
  const id = req.params.id;
  let students = readData();

  const initialLength = students.length;
  students = students.filter(student => student.studentID !== id);

  if (students.length === initialLength) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  writeData(students);
  res.json({ message: 'Student deleted successfully.' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
