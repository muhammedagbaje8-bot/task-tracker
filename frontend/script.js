// ==================================================
// ELEMENTS
// ==================================================

const taskForm =
  document.getElementById('taskForm');

const taskTitle =
  document.getElementById('taskTitle');

const uncompletedList =
  document.getElementById(
    'uncompletedList'
  );

const completedList =
  document.getElementById(
    'completedList'
  );

const uncompletedCount =
  document.getElementById(
    'uncompletedCount'
  );

const completedCount =
  document.getElementById(
    'completedCount'
  );

const statusMessage =
  document.getElementById(
    'statusMessage'
  );

const logoutButton =
  document.getElementById(
    'logoutButton'
  );

const usernameDisplay =
  document.getElementById(
    'usernameDisplay'
  );


// ==================================================
// STATUS MESSAGE
// ==================================================

function showMessage(message) {

  statusMessage.textContent =
    message;

  statusMessage.classList.add(
    'show'
  );


  setTimeout(() => {

    statusMessage.classList.remove(
      'show'
    );

  }, 2500);

}


// ==================================================
// CHECK LOGIN
// ==================================================

async function checkLogin() {

  try {

    const response =
      await fetch('/auth/status');


    const data =
      await response.json();


    if (!data.loggedIn) {

      window.location.href =
        '/login.html';

      return false;

    }


    usernameDisplay.textContent =
      `@${data.username}`;


    return true;


  } catch (error) {

    console.error(
      'Authentication error:',
      error
    );


    window.location.href =
      '/login.html';

    return false;

  }

}


// ==================================================
// LOAD TASKS
// ==================================================

async function loadTasks() {

  try {

    const response =
      await fetch('/tasks');


    if (response.status === 401) {

      window.location.href =
        '/login.html';

      return;

    }


    if (!response.ok) {

      throw new Error(
        'Failed to load tasks.'
      );

    }


    const tasks =
      await response.json();


    displayTasks(tasks);


  } catch (error) {

    console.error(
      'Error loading tasks:',
      error
    );


    uncompletedList.innerHTML = `
      <div class="empty-state">
        Unable to load tasks.
      </div>
    `;


    completedList.innerHTML = '';

  }

}


// ==================================================
// DISPLAY TASKS
// ==================================================

function displayTasks(tasks) {

  uncompletedList.innerHTML = '';

  completedList.innerHTML = '';


  const activeTasks =
    tasks.filter(
      task => task.completed === 0
    );


  const completedTasks =
    tasks.filter(
      task => task.completed === 1
    );


  uncompletedCount.textContent =
    activeTasks.length;


  completedCount.textContent =
    completedTasks.length;


  // ----------------------------------------------
  // ACTIVE
  // ----------------------------------------------

  if (activeTasks.length === 0) {

    uncompletedList.innerHTML = `
      <div class="empty-state">
        No active tasks.
      </div>
    `;

  } else {

    activeTasks.forEach(task => {

      uncompletedList.appendChild(
        createTaskCard(task)
      );

    });

  }


  // ----------------------------------------------
  // COMPLETED
  // ----------------------------------------------

  if (completedTasks.length === 0) {

    completedList.innerHTML = `
      <div class="empty-state">
        No completed tasks.
      </div>
    `;

  } else {

    completedTasks.forEach(task => {

      completedList.appendChild(
        createTaskCard(task)
      );

    });

  }

}


// ==================================================
// CREATE TASK CARD
// ==================================================

function createTaskCard(task) {

  const card =
    document.createElement('div');

  card.className =
    'task-card';


  if (task.completed === 1) {

    card.classList.add(
      'completed'
    );

  }


  // ----------------------------------------------
  // TASK CONTENT
  // ----------------------------------------------

  const content =
    document.createElement('div');

  content.className =
    'task-content';


  const title =
    document.createElement('div');

  title.className =
    'task-title';

  title.textContent =
    task.title;


  content.appendChild(title);


  // ----------------------------------------------
  // ACTIONS
  // ----------------------------------------------

  const actions =
    document.createElement('div');

  actions.className =
    'task-actions';


  // Complete button

  const completeButton =
    document.createElement('button');


  if (task.completed === 1) {

    completeButton.textContent =
      'Mark Active';

    completeButton.className =
      'undo-button';

  } else {

    completeButton.textContent =
      'Complete';

    completeButton.className =
      'complete-button';

  }


  completeButton.addEventListener(
    'click',
    () => toggleTask(task)
  );


  // Edit button

  const editButton =
    document.createElement('button');

  editButton.textContent =
    'Edit';

  editButton.className =
    'edit-button';


  editButton.addEventListener(
    'click',
    () =>
      showEditMode(
        card,
        task
      )
  );


  // Delete button

  const deleteButton =
    document.createElement('button');

  deleteButton.textContent =
    'Delete';

  deleteButton.className =
    'delete-button';


  deleteButton.addEventListener(
    'click',
    () =>
      deleteTask(task.id)
  );


  actions.appendChild(
    completeButton
  );

  actions.appendChild(
    editButton
  );

  actions.appendChild(
    deleteButton
  );


  card.appendChild(content);

  card.appendChild(actions);


  return card;

}


// ==================================================
// CREATE TASK
// ==================================================

taskForm.addEventListener(
  'submit',
  async event => {

    event.preventDefault();


    const title =
      taskTitle.value.trim();


    if (!title) {

      showMessage(
        'Please enter a task.'
      );

      taskTitle.focus();

      return;

    }


    try {

      const response =
        await fetch('/tasks', {

          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            title
          })

        });


      if (response.status === 401) {

        window.location.href =
          '/login.html';

        return;

      }


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          'Failed to create task.'
        );

      }


      taskTitle.value = '';

      taskTitle.focus();


      await loadTasks();


      showMessage(
        'Task added successfully.'
      );


    } catch (error) {

      console.error(
        'Create task error:',
        error
      );


      showMessage(
        error.message
      );

    }

  }
);


// ==================================================
// COMPLETE / UNCOMPLETE TASK
// ==================================================

async function toggleTask(task) {

  try {

    const response =
      await fetch(
        `/tasks/${task.id}`,
        {

          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({

            completed:
              task.completed === 0

          })

        }
      );


    if (response.status === 401) {

      window.location.href =
        '/login.html';

      return;

    }


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        'Failed to update task.'
      );

    }


    await loadTasks();


    if (data.completed === 1) {

      showMessage(
        'Task marked as complete.'
      );

    } else {

      showMessage(
        'Task moved back to active.'
      );

    }


  } catch (error) {

    console.error(
      'Toggle task error:',
      error
    );


    showMessage(
      error.message
    );

  }

}


// ==================================================
// SHOW EDIT MODE
// ==================================================

function showEditMode(card, task) {

  card.innerHTML = '';


  const editContainer =
    document.createElement('div');

  editContainer.className =
    'edit-container';


  const input =
    document.createElement('input');

  input.type = 'text';

  input.className =
    'edit-input';

  input.value =
    task.title;

  input.autocomplete =
    'off';


  const saveButton =
    document.createElement('button');

  saveButton.textContent =
    'Save';

  saveButton.className =
    'save-button';


  const cancelButton =
    document.createElement('button');

  cancelButton.textContent =
    'Cancel';

  cancelButton.className =
    'cancel-button';


  saveButton.addEventListener(
    'click',
    () =>
      updateTask(
        task.id,
        input.value
      )
  );


  cancelButton.addEventListener(
    'click',
    () => loadTasks()
  );


  input.addEventListener(
    'keydown',
    event => {

      if (event.key === 'Enter') {

        updateTask(
          task.id,
          input.value
        );

      }


      if (event.key === 'Escape') {

        loadTasks();

      }

    }
  );


  editContainer.appendChild(
    input
  );

  editContainer.appendChild(
    saveButton
  );

  editContainer.appendChild(
    cancelButton
  );


  card.appendChild(
    editContainer
  );


  input.focus();

  input.select();

}


// ==================================================
// UPDATE TASK
// ==================================================

async function updateTask(
  id,
  title
) {

  const newTitle =
    title.trim();


  if (!newTitle) {

    showMessage(
      'Task title cannot be empty.'
    );

    return;

  }


  try {

    const response =
      await fetch(
        `/tasks/${id}`,
        {

          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            title: newTitle
          })

        }
      );


    if (response.status === 401) {

      window.location.href =
        '/login.html';

      return;

    }


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        'Failed to update task.'
      );

    }


    await loadTasks();


    showMessage(
      'Task updated successfully.'
    );


  } catch (error) {

    console.error(
      'Update task error:',
      error
    );


    showMessage(
      error.message
    );

  }

}


// ==================================================
// DELETE TASK
// ==================================================

async function deleteTask(id) {

  const confirmed =
    confirm(
      'Are you sure you want to delete this task?'
    );


  if (!confirmed) {

    return;

  }


  try {

    const response =
      await fetch(
        `/tasks/${id}`,
        {
          method: 'DELETE'
        }
      );


    if (response.status === 401) {

      window.location.href =
        '/login.html';

      return;

    }


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        'Failed to delete task.'
      );

    }


    await loadTasks();


    showMessage(
      'Task deleted successfully.'
    );


  } catch (error) {

    console.error(
      'Delete task error:',
      error
    );


    showMessage(
      error.message
    );

  }

}


// ==================================================
// LOGOUT
// ==================================================

logoutButton.addEventListener(
  'click',
  async () => {

    try {

      const response =
        await fetch('/logout', {
          method: 'POST'
        });


      if (!response.ok) {

        throw new Error(
          'Logout failed.'
        );

      }


      window.location.href =
        '/login.html';


    } catch (error) {

      console.error(
        'Logout error:',
        error
      );


      showMessage(
        'Unable to log out.'
      );

    }

  }
);


// ==================================================
// START APP
// ==================================================

async function startApp() {

  const loggedIn =
    await checkLogin();


  if (loggedIn) {

    await loadTasks();

  }

}


startApp();