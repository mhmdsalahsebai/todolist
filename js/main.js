/* globals DOMPurify zlFetch */
updateConnectionStatus()

// ========================
// Variables
// ========================
const rootendpoint = 'https://api.learnjavascript.today'
const auth = {
  // REPLACE WITH YOUR USERNAME AND PASSWORD
  username: 'transporterduo',
  password: '12345678'
}
const state = {}

const todolist = document.querySelector('.todolist')
const taskList = todolist.querySelector('.todolist__tasks')
const emptyStateDiv = todolist.querySelector('.todolist__empty-state')
const flashContainer = document.querySelector('.flash-container')

// ========================
// Functions
// ========================
/**
 * Generates a unique string
 * @param {Number} length - Length of string
 * @returns {String}
 */
const generateUniqueString = length =>
  Math.random().toString(36).substring(2, 2 + length)

/**
 * Creates a task element
 * @param {Object} task - Task object
 * @param {String} task.id - Task id
 * @param {String} name - Task
 * @param {Boolean} done - Whether the task is complete
 * @returns {HTMLElement}
 */
const makeTaskElement = ({ id, name, done, state = 'loaded' }) => {
  let spinner = ''
  if (state === 'loading') {
    spinner = '<img class="task__spinner" src="images/spinner.gif" alt=""/>'
  }

  let checkbox = ''
  if (state === 'loaded') {
    checkbox = `<input
      type="checkbox"
      id="${id}"
      ${done ? 'checked' : ''}
    />`
  }

  const taskElement = document.createElement('li')
  taskElement.classList.add('task')
  taskElement.setAttribute('tabindex', -1)
  taskElement.innerHTML = DOMPurify.sanitize(`
    ${spinner}
    ${checkbox}
    <label for="${id}">
      <svg viewBox="0 0 20 15">
        <path d="M0 8l2-2 5 5L18 0l2 2L7 15z" fill-rule="nonzero" />
      </svg>
    </label>
    <input class="task__name" value="${name}" />
    <button type="button" class="task__delete-button">
      <svg viewBox="0 0 20 20">
        <path d="M10 8.586L2.929 1.515 1.515 2.929 8.586 10l-7.071 7.071 1.414 1.414L10 11.414l7.071 7.071 1.414-1.414L11.414 10l7.071-7.071-1.414-1.414L10 8.586z" />
      </svg>
    </button>`
  )
  return taskElement
}

/**
 * Debounces a function
 * @param {Function} callback
 * @param {Number} wait - Milliseconds to wait
 * @param {Boolean} immediate - Whether to trigger callback on leading edge
 */
function debounce (callback, wait, immediate) {
  let timeout
  return function () {
    const context = this
    const args = arguments
    const later = function () {
      timeout = null
      if (!immediate) callback.apply(context, args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) callback.apply(context, args)
  }
}

/**
 * Parses error messages and makes them friendlier.
 * @param {String} message - Error message
 */
const formatErrorMessage = message => {
  if (message === 'TypeError: Failed to fetch') {
    return 'Failed to reach server. Please try again later.'
  }

  if (message === 'Unauthorized') {
    return 'Invalid username or password. Please check your username or password.'
  }

  return message
}

/**
 * Creates an error message and adds it to the DOM.
 * @param {String} message - Error message
 */
const createErrorMessage = message => {
  // Formats the error message
  message = formatErrorMessage(message)

  // Create the error element
  const errorElement = document.createElement('div')
  errorElement.classList.add('flash')
  errorElement.dataset.type = 'error'
  errorElement.innerHTML = `
    <svg class='flash__icon' viewBox='0 0 20 20'>
      <path
        class='flash__exclaim-border'
        d='M3.053 17.193A10 10 0 1 1 16.947 2.807 10 10 0 0 1 3.053 17.193zm12.604-1.536A8 8 0 1 0 4.343 4.343a8 8 0 0 0 11.314 11.314z'
        fill-rule='nonzero'
      />
      <path
        class='flash__exclaim-mark'
        d='M9 5h2v6H9V5zm0 8h2v2H9v-2z'
        fill-rule='nonzero'
      />
    </svg>
    <span class='flash__message'>${message}</span>
    <button class='flash__close'>
      <svg viewBox='0 0 20 20'>
        <path
          d='M10 8.586L2.929 1.515 1.515 2.929 8.586 10l-7.071 7.071 1.414 1.414L10 11.414l7.071 7.071 1.414-1.414L11.414 10l7.071-7.071-1.414-1.414L10 8.586z'
        />
      </svg>
    </button>
  `

  // Adds error element to the DOM
  flashContainer.appendChild(errorElement)
}

/**
 * Checks user connection status.
 * Updates whenever user comes online or goes offline.
 */
function updateConnectionStatus () {
  function setConnectionStatus () {
    navigator.onLine
      ? document.body.dataset.connectionStatus = 'online'
      : document.body.dataset.connectionStatus = 'offline'
  }

  setConnectionStatus()
  window.addEventListener('online', setConnectionStatus)
  window.addEventListener('offline', setConnectionStatus)
}

/**
 * Shows an element by removing the `hidden` attribute.
 * @param {HTMLElement} element
 */
const showElement = element => {
  return element.removeAttribute('hidden')
}

/**
 * Hides an element by adding the `hidden` attribute.
 * @param {HTMLElement} element
 */
const hideElement = element => {
  return element.setAttribute('hidden', true)
}

/**
 * Checks if an element has the `hidden` attribute
 * @param {HTMLElement} element
 */
const isElementHidden = element => {
  return element.hasAttribute('hidden')
}

/**
 * Decide whether to show empty state
 */
const shouldShowEmptyState = _ => {
  if (taskList.children.length === 0) return true
  return [...taskList.children].every(isElementHidden)
}

/**
 * Shows empty state.
 */
const showEmptyState = _ => {
  taskList.classList.add('is-empty')
}

const hideEmptyState = _ => {
  taskList.classList.remove('is-empty')
}

const isSuperKey = event => {
  const os = navigator.userAgent.includes('Mac OS X') !== -1
    ? 'mac'
    : 'windows'
  if (os === 'mac' && event.metaKey) return true
  if (os === 'windows' && event.ctrlKey) return true
  return false
}

// ========================
// Execution
// ========================
// Getting and fetching tasks
zlFetch(`${rootendpoint}/tasks`, { auth })
  .then(response => {
    // Append tasks to DOM
    state.tasks = response.body
    state.tasks.forEach(task => {
      const taskElement = makeTaskElement(task)
      taskList.appendChild(taskElement)
    })

    // Change empty state text
    emptyStateDiv.textContent = 'Your todo list is empty. Hurray! 🎉'
  })
  .catch(error => createErrorMessage(error.body.message))

// Adding a task to the DOM
todolist.addEventListener('submit', event => {
  event.preventDefault()

  // Get value of task
  const newTaskField = todolist.querySelector('input')
  const inputValue = DOMPurify.sanitize(newTaskField.value.trim())

  // Prevent adding of empty task
  if (!inputValue) return

  const tempTaskElement = makeTaskElement({
    id: generateUniqueString(10),
    name: inputValue,
    done: false,
    state: 'loading'
  })

  // Add task to DOM
  taskList.appendChild(tempTaskElement)
  hideEmptyState()

  // Clear the new task field
  newTaskField.value = ''

  // Bring focus back to input field
  newTaskField.focus()

  zlFetch.post(`${rootendpoint}/tasks`, {
    auth,
    body: {
      name: inputValue
    }
  })
    .then(response => {
      const task = response.body
      const taskElement = makeTaskElement(task)

      state.tasks.push(task)
      taskList.removeChild(tempTaskElement)
      taskList.appendChild(taskElement)
    })
    .catch(error => {
      createErrorMessage(error.body.message)
      taskList.removeChild(tempTaskElement)
      if (shouldShowEmptyState()) showEmptyState()
    })
})

// Editing tasks
taskList.addEventListener('input', debounce(function (event) {
  const taskElement = event.target.parentElement
  const checkbox = taskElement.querySelector('input[type="checkbox"]')
  const taskInput = taskElement.querySelector('.task__name')

  const id = checkbox.id
  const done = checkbox.checked
  const name = DOMPurify.sanitize(taskInput.value.trim())

  zlFetch.put(`${rootendpoint}/tasks/${id}`, {
    auth,
    body: {
      name,
      done
    }
  })
    .then(response => {
      const index = state.tasks.findIndex(t => t.id === id)
      state.tasks[index] = response.body
    })
    .catch(error => {
      const originalTask = state.tasks.find(t => t.id === id)
      taskInput.value = DOMPurify.sanitize(originalTask.name)
      checkbox.checked = originalTask.done
      createErrorMessage(error.body.message)
    })
}, 250))

// Deleting tasks
taskList.addEventListener('click', event => {
  if (!event.target.matches('.task__delete-button')) return

  const taskElement = event.target.parentElement
  const checkbox = taskElement.querySelector('input[type="checkbox"]')
  const id = checkbox.id

  hideElement(taskElement)
  if (shouldShowEmptyState()) showEmptyState()

  zlFetch.delete(`${rootendpoint}/tasks/${id}`, { auth })
    .then(response => {
      taskList.removeChild(taskElement)
      const index = state.tasks.findIndex(t => t.id === id)
      state.tasks = [
        ...state.tasks.slice(0, index),
        ...state.tasks.slice(index + 1)
      ]
    })
    .catch(error => {
      createErrorMessage(error.body.message)
      showElement(taskElement)
      hideEmptyState()
    })
})

// Removes error messages
flashContainer.addEventListener('click', event => {
  if (!event.target.matches('button')) return
  const closeButton = event.target
  const flashDiv = closeButton.parentElement
  flashContainer.removeChild(flashDiv)
})

// Up/down to select item
document.addEventListener('keydown', event => {
  const { key } = event
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const tasks = [...taskList.children]
    const firstTask = tasks[0]
    const lastTask = tasks[tasks.length - 1]

    // Select first or last task with arrow keys.
    // Works when focus is not on the tasklist
    if (!event.target.closest('.task')) {
      if (key === 'ArrowUp') return lastTask.focus()
      if (key === 'ArrowDown') return firstTask.focus()
    }

    // Selects previous/next element with arrow keys
    // Does round robin
    if (event.target.closest('.task')) {
      const currentTaskElement = event.target.closest('.task')
      if (currentTaskElement === firstTask && key === 'ArrowUp') return lastTask.focus()
      if (currentTaskElement === lastTask && key === 'ArrowDown') return firstTask.focus()
      if (key === 'ArrowUp') return currentTaskElement.previousElementSibling.focus()
      if (key === 'ArrowDown') return currentTaskElement.nextElementSibling.focus()
    }
  }
})

// Super + Enter to check/uncheck task
taskList.addEventListener('keydown', event => {
  if (event.key === 'Enter' && isSuperKey(event)) {
    const task = event.target.closest('.task')
    const checkbox = task.querySelector('input[type="checkbox"]')
    checkbox.click()
  }
})

// Super + Backspace or delete to delete task
taskList.addEventListener('keydown', event => {
  const deleteTask = event => {
    const task = event.target.closest('.task')
    const deleteButton = task.querySelector('.task__delete-button')
    deleteButton.click()
  }

  if (event.key === 'Backspace' && isSuperKey(event)) return deleteTask(event)
  if (event.key === 'Delete') return deleteTask(event)
})

// // Press n to focus on task
document.addEventListener('keydown', event => {
  const key = event.key.toLowerCase()
  if (key !== 'n') return
  if (event.target.matches('input[type="text"]')) return
  event.preventDefault()

  const newTaskField = todolist.querySelector('input')
  newTaskField.focus()
})
