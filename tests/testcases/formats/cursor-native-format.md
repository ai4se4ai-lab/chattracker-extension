**User**

Create a React component for a todo list

---

**Cursor**

Here's a React component for a todo list:

```jsx
import React, { useState } from 'react';

function TodoList() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now(), text: input, done: false }]);
      setInput('');
    }
  };

  return (
    <div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={addTodo}>Add</button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

**User**

Add delete functionality

---

**Cursor**

Here's the updated component with delete functionality:

```jsx
const deleteTodo = (id) => {
  setTodos(todos.filter(todo => todo.id !== id));
};
```

Add this button in the list item:
```jsx
<button onClick={() => deleteTodo(todo.id)}>Delete</button>
```

