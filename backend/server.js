const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database('tasktracker.db');


// ==================================================
// MIDDLEWARE
// ==================================================

app.use(express.json());

app.use(
  session({
    secret: 'task-tracker-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60,
      httpOnly: true
    }
  })
);

app.use(express.static('public'));


// ==================================================
// DATABASE
// ==================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`);


db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);


// ==================================================
// AUTHENTICATION MIDDLEWARE
// ==================================================

function requireLogin(req, res, next) {

  if (!req.session.user) {

    return res.status(401).json({
      error: 'You must be logged in.'
    });

  }

  next();
}


// ==================================================
// REGISTER
// POST /register
// ==================================================

app.post('/register', async (req, res) => {

  try {

    const { username, password } = req.body;


    // Validate username

    if (!username || !username.trim()) {

      return res.status(400).json({
        error: 'Username is required.'
      });

    }


    // Validate password

    if (!password) {

      return res.status(400).json({
        error: 'Password is required.'
      });

    }


    if (password.length < 4) {

      return res.status(400).json({
        error: 'Password must be at least 4 characters.'
      });

    }


    const cleanUsername =
      username.trim().toLowerCase();


    // Check if username already exists

    const existingUser = db
      .prepare(
        'SELECT id FROM users WHERE username = ?'
      )
      .get(cleanUsername);


    if (existingUser) {

      return res.status(409).json({
        error: 'Username is already taken.'
      });

    }


    // Hash password

    const hashedPassword =
      await bcrypt.hash(password, 10);


    // Create user

    const result = db
      .prepare(`
        INSERT INTO users (username, password)
        VALUES (?, ?)
      `)
      .run(
        cleanUsername,
        hashedPassword
      );


    // Automatically log the user in

    req.session.user = {
      id: result.lastInsertRowid,
      username: cleanUsername
    };


    res.status(201).json({
      message: 'Account created successfully.',
      username: cleanUsername
    });


  } catch (error) {

    console.error(
      'Registration error:',
      error
    );


    res.status(500).json({
      error: 'Something went wrong while creating your account.'
    });

  }

});


// ==================================================
// LOGIN
// POST /login
// ==================================================

app.post('/login', async (req, res) => {

  try {

    const { username, password } = req.body;


    if (!username || !password) {

      return res.status(400).json({
        error: 'Username and password are required.'
      });

    }


    const cleanUsername =
      username.trim().toLowerCase();


    // Find user

    const user = db
      .prepare(`
        SELECT *
        FROM users
        WHERE username = ?
      `)
      .get(cleanUsername);


    if (!user) {

      return res.status(401).json({
        error: 'Invalid username or password.'
      });

    }


    // Check password

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password
      );


    if (!passwordMatches) {

      return res.status(401).json({
        error: 'Invalid username or password.'
      });

    }


    // Create session

    req.session.user = {
      id: user.id,
      username: user.username
    };


    res.status(200).json({
      message: 'Login successful.',
      username: user.username
    });


  } catch (error) {

    console.error(
      'Login error:',
      error
    );


    res.status(500).json({
      error: 'Something went wrong while logging in.'
    });

  }

});


// ==================================================
// AUTH STATUS
// GET /auth/status
// ==================================================

app.get('/auth/status', (req, res) => {

  if (!req.session.user) {

    return res.json({
      loggedIn: false
    });

  }


  res.json({
    loggedIn: true,
    username: req.session.user.username
  });

});


// ==================================================
// LOGOUT
// POST /logout
// ==================================================

app.post('/logout', (req, res) => {

  req.session.destroy(error => {

    if (error) {

      console.error(
        'Logout error:',
        error
      );

      return res.status(500).json({
        error: 'Unable to log out.'
      });

    }


    res.clearCookie('connect.sid');


    res.json({
      message: 'Logged out successfully.'
    });

  });

});


// ==================================================
// CREATE TASK
// POST /tasks
// ==================================================

app.post(
  '/tasks',
  requireLogin,
  (req, res) => {

    const { title } = req.body;


    if (!title || !title.trim()) {

      return res.status(400).json({
        error: 'Task title is required.'
      });

    }


    const result = db
      .prepare(`
        INSERT INTO tasks
        (title, completed, user_id)
        VALUES (?, ?, ?)
      `)
      .run(
        title.trim(),
        0,
        req.session.user.id
      );


    const task = db
      .prepare(`
        SELECT *
        FROM tasks
        WHERE id = ?
        AND user_id = ?
      `)
      .get(
        result.lastInsertRowid,
        req.session.user.id
      );


    res.status(201).json(task);

  }
);


// ==================================================
// READ TASKS
// GET /tasks
// ==================================================

app.get(
  '/tasks',
  requireLogin,
  (req, res) => {

    const tasks = db
      .prepare(`
        SELECT id, title, completed
        FROM tasks
        WHERE user_id = ?
        ORDER BY id DESC
      `)
      .all(
        req.session.user.id
      );


    res.json(tasks);

  }
);


// ==================================================
// UPDATE TASK
// PATCH /tasks/:id
// ==================================================

app.patch(
  '/tasks/:id',
  requireLogin,
  (req, res) => {

    const id =
      Number(req.params.id);


    const task = db
      .prepare(`
        SELECT *
        FROM tasks
        WHERE id = ?
        AND user_id = ?
      `)
      .get(
        id,
        req.session.user.id
      );


    if (!task) {

      return res.status(404).json({
        error: 'Task not found.'
      });

    }


    const {
      title,
      completed
    } = req.body;


    // Update title

    if (title !== undefined) {

      if (!title.trim()) {

        return res.status(400).json({
          error: 'Task title cannot be empty.'
        });

      }


      db.prepare(`
        UPDATE tasks
        SET title = ?
        WHERE id = ?
        AND user_id = ?
      `).run(
        title.trim(),
        id,
        req.session.user.id
      );

    }


    // Update completed status

    if (completed !== undefined) {

      const completedValue =
        completed ? 1 : 0;


      db.prepare(`
        UPDATE tasks
        SET completed = ?
        WHERE id = ?
        AND user_id = ?
      `).run(
        completedValue,
        id,
        req.session.user.id
      );

    }


    const updatedTask = db
      .prepare(`
        SELECT id, title, completed
        FROM tasks
        WHERE id = ?
        AND user_id = ?
      `)
      .get(
        id,
        req.session.user.id
      );


    res.json(updatedTask);

  }
);


// ==================================================
// DELETE TASK
// DELETE /tasks/:id
// ==================================================

app.delete(
  '/tasks/:id',
  requireLogin,
  (req, res) => {

    const id =
      Number(req.params.id);


    const task = db
      .prepare(`
        SELECT id
        FROM tasks
        WHERE id = ?
        AND user_id = ?
      `)
      .get(
        id,
        req.session.user.id
      );


    if (!task) {

      return res.status(404).json({
        error: 'Task not found.'
      });

    }


    db.prepare(`
      DELETE FROM tasks
      WHERE id = ?
      AND user_id = ?
    `).run(
      id,
      req.session.user.id
    );


    res.json({
      message: 'Task deleted successfully.'
    });

  }
);


// ==================================================
// START SERVER
// ==================================================

app.listen(PORT, () => {

  console.log(
    `Task Tracker running at http://localhost:${PORT}`
  );

});