**User**

Test special characters: !@#$%^&*()_+-=[]{}|;':\",./<>?

---

**Cursor**

Here's how to handle special characters in code:

```javascript
const special = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
const escaped = special.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

---

**User**

What about unicode: 你好 🌟 🚀

---

**Cursor**

Unicode characters are fully supported! 你好 🌟 🚀

