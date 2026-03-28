# Vite Port 5173 Fallback Documentation

## Overview

Vite development server uses port 5173 as the default port for the forum web application. When port 5173 is already in use by another process, Vite automatically falls back to the next available port (typically 5174).

## Current Behavior

### Default Configuration
```
Port: 5173
Application: @ai-fashion-forum/forum-web
Server: Vite (v7.3.1+)
```

### Automatic Fallback
When port 5173 is unavailable:
```
Initial attempt:  Port 5173 (FAILED - in use)
Fallback attempt: Port 5174 (SUCCESS)

Console output:
  Port 5173 is in use, trying another one...

  VITE v7.3.1  ready in 181 ms

  ➜  Local:   http://localhost:5174/
```

## Why This Happens

1. **Multiple Development Sessions**: Multiple `npm run dev:forum` commands running simultaneously
2. **Process Not Fully Terminated**: Previous Vite process still holding the port
3. **External Process**: Another application using port 5173

## Solutions

### Option 1: Use Automatic Fallback (Recommended)
**No action needed.** Vite automatically uses the next available port. Simply access the URL shown in the console output.

```bash
✅ Works seamlessly - just follow the displayed URL
```

### Option 2: Free the Port Manually
Find and terminate the process using port 5173:

```bash
# Check which process is using port 5173
lsof -i :5173

# Terminate the process
kill -9 <PID>

# Or on macOS specifically
lsof -ti:5173 | xargs kill -9

# Then start the development server again
npm run dev:forum
```

### Option 3: Specify Port Explicitly
Run Vite with a specific port:

```bash
npm run dev:forum -- --port 5173
```

### Option 4: Use Environment Variable
Set the port via environment variable (if configured):

```bash
VITE_PORT=5173 npm run dev:forum
```

## Typical Port Sequence

When port 5173 is unavailable:
```
Attempt 1: 5173 ❌
Attempt 2: 5174 ✅
Attempt 3: 5175 ✅ (if 5174 also taken)
Attempt 4: 5176 ✅ (if 5175 also taken)
...and so on
```

## Identifying the Correct URL

### Console Output
```
VITE v7.3.1  ready in 181 ms

  ➜  Local:   http://localhost:5174/    ← Use this URL
  ➜  Network: use --host to expose
```

### Troubleshooting
- ✅ **The application works normally regardless of which port is used**
- ✅ **All API endpoints connect correctly** (configured to localhost:4000)
- ✅ **No additional configuration needed**
- ❌ **Don't hard-code port 5173** in your tests or documentation

## API Connectivity

The forum web application connects to the forum server at:
```
http://localhost:4000 (forum-server)
http://localhost:4318 (agent-server)
```

These ports are independent of the Vite development server port, so fallback to 5174+ doesn't affect API functionality.

## Configuration Files

### vite.config.js (if exists)
```javascript
export default {
  server: {
    port: 5173,
    strictPort: false,  // Allow fallback to next port
  }
}
```

The `strictPort: false` setting (default in Vite) enables automatic fallback.

### package.json
```json
{
  "scripts": {
    "dev:forum": "npm run dev --workspace @ai-fashion-forum/forum-web"
  }
}
```

## Best Practices

1. **Don't Assume Port 5173**
   - Always check the console output for the actual URL
   - Copy-paste the URL from the console

2. **Clear Previous Sessions**
   - Use `npm run dev:forum` to start fresh
   - Avoid running multiple instances simultaneously

3. **Monitor the Console**
   - Watch for "Port X is in use" messages
   - Note the fallback URL provided

4. **Documentation**
   - Update .env.example or README if documenting the dev server
   - Mention that the actual port will be displayed in console

## Related Issues

- See #259 for the original port fallback documentation request
- See #236 for local dev flow standardization

## Testing the Fallback

### Manual Test
```bash
# Terminal 1: Start development server
npm run dev:forum

# Console shows: http://localhost:5174/

# Terminal 2: Verify port is in use
lsof -i :5173

# Terminal 3: Verify application works
curl http://localhost:5174/  # Should return HTML
```

## Conclusion

Vite's automatic port fallback is a **feature, not a bug**. It ensures development can continue even when the default port is unavailable. Always check the console output for the correct URL rather than assuming port 5173.

---

**Documentation Created:** 2026-03-28
**Status:** Complete
**Recommendation:** No action required - system works as designed
