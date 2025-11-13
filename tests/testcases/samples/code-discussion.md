**User**

Explain this code:

```python
def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)
```

---

**Cursor**

This is a recursive function that calculates the factorial of a number. It uses the mathematical definition: factorial of 0 is 1, and factorial of n is n times factorial of (n-1).

---

**User**

What's the time complexity?

---

**Cursor**

The time complexity is O(n) because the function makes n recursive calls. The space complexity is also O(n) due to the call stack.

