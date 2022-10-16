const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;
  const hasUser = users.find((user) => user.username === username);
  if (!hasUser) {
    response.status(404).json({ error: 'User Not Found' });
  }
  request.user = hasUser;
  return next();
}

function checksCreateTodosUserAvailability(request, response, next) {
  const { user } = request;
  if (user.pro === true || user.todos.length < 10) {
    return next();
  }
  return response
    .status(403)
    .json({ error: 'You must be pro to have more than 10 todos' });
}

function checksTodoExists(request, response, next) {
  const { username } = request.headers;
  const hasUser = users.find((user) => user.username === username);
  if (!hasUser) {
    response.status(404).json({ error: 'User Not Found' });
  } else {
    const { id } = request.params;
    if (validate(id)) {
      const todo = hasUser.todos.find((todo) => todo.id === id);
      if (todo) {
        request.todo = todo;
        request.user = hasUser;
        return next();
      } else {
        return response.status(404).json({ error: 'TODO não existe' });
      }
    } else {
      return response.status(400).json({ error: 'UUID Inválido' });
    }
  }
}

function findUserById(request, response, next) {
  const { id } = request.params;
  const hasUser = users.find((user) => user.id === id);
  if (hasUser) {
    request.user = hasUser;
    return next();
    
  }
  return response.status(404).json({ error: 'User Not Found' });
}

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some(
    (user) => user.username === username,
  );

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: [],
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response
      .status(400)
      .json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post(
  '/todos',
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  (request, response) => {
    const { title, deadline } = request.body;
    const { user } = request;

    const newTodo = {
      id: uuidv4(),
      title,
      deadline: new Date(deadline),
      done: false,
      created_at: new Date(),
    };

    user.todos.push(newTodo);

    return response.status(201).json(newTodo);
  },
);

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete(
  '/todos/:id',
  checksExistsUserAccount,
  checksTodoExists,
  (request, response) => {
    const { user, todo } = request;

    const todoIndex = user.todos.indexOf(todo);

    if (todoIndex === -1) {
      return response.status(404).json({ error: 'Todo not found' });
    }

    user.todos.splice(todoIndex, 1);

    return response.status(204).send();
  },
);

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById,
};
