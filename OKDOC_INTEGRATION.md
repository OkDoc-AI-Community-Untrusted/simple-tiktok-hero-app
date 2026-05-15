# OkDoc Integration Guide

This document explains how the Simple TikTok Hero App integrates with the OkDoc platform using the iframe plugin approach.

## Overview

The app is built as an OkDoc **iframe plugin**, which means:

- It runs inside a sandboxed iframe within the OkDoc application
- It communicates with OkDoc through the Plugin SDK
- It exposes **Tools** that can be invoked via voice commands
- It sends **Notifications** to notify OkDoc of state changes
- It loads dynamically without requiring build tools on OkDoc's side

## Architecture

```
┌─────────────────────────────────────────────┐
│          OkDoc Host Application             │
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐  │
│  │   iframe Sandbox                      │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  TikTok Hero App                │  │  │
│  │  │  ├─ Components (Login, Post)    │  │  │
│  │  │  ├─ Services (Auth, TikTok)     │  │  │
│  │  │  └─ OkDoc Integration (Tools)   │  │  │
│  │  └─────────────────────────────────┘  │  │
│  │         ↕ MessageChannel              │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  Plugin SDK (okdoc-iframe-sdk)  │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## SDK Integration

### Loading the SDK

The SDK is loaded via CDN script in `src/index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/@okdoc-ai/plugin-sdk@1/dist/okdoc-iframe-sdk.js"></script>
```

The script is injected before the Angular app boots up, making `window.OkDoc` available globally.

### Initialization

The SDK is initialized in `OkDocService.initializeOkDoc()`:

```typescript
this.okDocSDK.init({
  id: 'simple-tiktok-hero-app',
  name: 'Simple TikTok Hero App',
  namespace: 'tiktok',
  version: '1.0.0',
  author: 'TikTok Hero App Community',
  mode: 'foreground',
});
```

**Parameters:**

- `id`: Unique identifier for the plugin
- `name`: Display name shown in OkDoc
- `namespace`: Namespace for organizing tools
- `version`: Current app version
- `author`: Plugin author/creator
- `mode`: `'foreground'` (visible UI) or `'background'` (tools only)

## Tools

Tools are actions that OkDoc can invoke on behalf of the user via voice commands.

### Registered Tools

#### 1. Login Tool

```typescript
OkDoc.registerTool({
  id: 'login',
  name: 'Login to TikTok',
  description: 'Authenticate with TikTok account...',
  inputSchema: { /* JSON Schema */ },
  handler: async () => { /* Handler */ }
});
```

**Voice Commands:**
- "Login to TikTok"
- "Authenticate with TikTok"
- "Sign in to my TikTok account"

**Response:**
- Success: Redirects to TikTok OAuth
- Error: Returns error message

#### 2. Create Post Tool

```typescript
OkDoc.registerTool({
  id: 'create_post',
  name: 'Create TikTok Post',
  description: 'Create a new TikTok post with caption and optional video...',
  inputSchema: {
    type: 'object',
    properties: {
      caption: {
        type: 'string',
        description: 'The caption/text for the post'
      },
      videoUrl: {
        type: 'string',
        description: 'Optional URL to video file'
      }
    },
    required: ['caption']
  },
  handler: async (input) => { /* Handler */ }
});
```

**Voice Commands:**
- "Create a post with caption: Check out my new video!"
- "Post on TikTok: This is awesome!"
- "Create a TikTok post with this caption..."

**Response:**
- Success: Returns video ID and confirmation
- Error: Returns error message

#### 3. Logout Tool

```typescript
OkDoc.registerTool({
  id: 'logout',
  name: 'Logout',
  description: 'Logout from TikTok Hero App',
  // ...
});
```

**Voice Commands:**
- "Logout"
- "Sign out"
- "Logout from TikTok"

#### 4. Get User Info Tool

```typescript
OkDoc.registerTool({
  id: 'get_user_info',
  name: 'Get User Info',
  description: 'Retrieve current authenticated user information',
  // ...
});
```

**Voice Commands:**
- "Get my user information"
- "Show my profile"
- "Who am I logged in as"

### Tool Handler Pattern

All tool handlers follow this pattern:

```typescript
handler: async (input?: any): Promise<ToolResult> => {
  try {
    // Validate input
    if (!input || !input.caption) {
      return {
        type: 'error',
        content: { message: 'Missing required field' }
      };
    }

    // Perform action
    const result = await this.tiktokService.createPost(input);

    // Return success
    if (result.success) {
      return {
        type: 'success',
        content: {
          message: 'Post created successfully!',
          videoId: result.videoId
        }
      };
    } else {
      return {
        type: 'error',
        content: { message: result.error }
      };
    }
  } catch (error: any) {
    return {
      type: 'error',
      content: { message: error.message }
    };
  }
}
```

**Important:**
- Handlers must complete within 30 seconds
- Always return a `ToolResult` object
- Handle errors gracefully
- Update UI to reflect changes immediately

### JSON Schema Validation

Tool inputs are validated using JSON Schema. Example:

```json
{
  "type": "object",
  "properties": {
    "caption": {
      "type": "string",
      "maxLength": 2200,
      "description": "Post caption"
    },
    "videoUrl": {
      "type": "string",
      "format": "uri",
      "description": "Video file URL"
    }
  },
  "required": ["caption"],
  "additionalProperties": false
}
```

## Notifiers

Notifiers send state change notifications to OkDoc. The host app uses these to understand what happened in your plugin.

### Implemented Notifiers

#### 1. Post Created Notification

```typescript
OkDocService.notifyPostCreated(videoId: string, caption: string) {
  this.okDocSDK.notify({
    type: 'post_created',
    data: {
      videoId,
      caption,
      timestamp: new Date().toISOString()
    }
  });
}
```

**When it's sent:**
- After a post is successfully created

**Data includes:**
- `videoId`: TikTok video ID
- `caption`: Post caption
- `timestamp`: ISO timestamp

#### 2. Auth State Changed Notification

```typescript
OkDocService.notifyAuthStateChanged(
  isAuthenticated: boolean,
  user?: any
) {
  this.okDocSDK.notify({
    type: 'auth_state_changed',
    data: {
      isAuthenticated,
      user: user || null,
      timestamp: new Date().toISOString()
    }
  });
}
```

**When it's sent:**
- After successful login
- After logout
- When session is restored

**Data includes:**
- `isAuthenticated`: Boolean auth state
- `user`: User object with `userId`, `username`, `displayName`
- `timestamp`: ISO timestamp

## UI Refresh Requirements

⚠️ **Critical**: The UI must refresh immediately when a tool is executed.

The `PostComponent` automatically updates because Angular change detection works with async operations:

```typescript
async submitPost(): Promise<void> {
  // Service call updates state
  const result = await this.tiktokService.createPost(postData);

  // UI automatically reflects changes
  if (result.success) {
    this.postSuccess = 'Post created successfully!';
    // Component re-renders automatically
  }
}
```

For manual triggers, use `ChangeDetectorRef`:

```typescript
constructor(private cdr: ChangeDetectorRef) {}

async toolHandler() {
  await this.doSomething();
  this.cdr.detectChanges(); // Force UI refresh
}
```

## Message Channel Communication

The SDK uses `MessageChannel` for secure communication:

1. **Plugin Page** sends a port to **OkDoc Host**
2. **OkDoc Host** sends back another port
3. Both sides communicate bi-directionally through ports
4. All messages are serialized/deserialized automatically

You don't need to handle this directly—the SDK abstracts it away.

## Lifecycle Events

### Plugin Lifecycle

```
Initialization
    ↓
[waiting for tool call]
    ↓
Tool Invoked → Handler Executes → Notification Sent → UI Updates
    ↓
[waiting for next tool call]
    ↓
Plugin Disabled/Removed
```

### Plugin Events

The SDK provides lifecycle hooks:

```typescript
// Plugin is activated (first tool call)
OkDoc.on('activated', () => {
  console.log('Plugin activated');
});

// Plugin is stopped
OkDoc.on('stopped', () => {
  console.log('Plugin stopped');
});
```

## Error Handling

### Common Error Scenarios

| Scenario | Handler | Result |
|----------|---------|--------|
| Not authenticated | Check `authService.isAuthenticated()` | Return error ToolResult |
| Invalid input | Validate against JSON Schema | Return error ToolResult |
| API call fails | Catch error, log it | Return error ToolResult with message |
| UI not responsive | Update UI after async operation | Call `cdr.detectChanges()` |
| Tool timeout | Ensure handler completes in <30s | Break long operations |

### Error Response Format

```typescript
{
  type: 'error',
  content: {
    message: 'User-friendly error message',
    code?: 'ERROR_CODE',
    details?: { /* Extra info */ }
  }
}
```

## Testing Tools

### Manual Testing

1. **Local Development**: Tools are available in OkDoc when app is running
2. **Browser Console**: Test tool handlers directly

```javascript
// Simulate tool call
window.OkDoc.tools.create_post({
  caption: 'Test caption'
}).then(result => {
  console.log('Result:', result);
});
```

### Voice Command Testing

1. Open OkDoc on your device
2. Say "Create a TikTok post with caption: Test"
3. Check browser console for logs
4. Verify UI updates reflect the action

## Security Considerations

### iframe Sandbox

The iframe is sandboxed with restrictions:

```html
<iframe sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
```

This means:
- ✓ JavaScript execution allowed
- ✓ Same-origin requests allowed
- ✓ Popups allowed (for OAuth)
- ✗ No access to top-level DOM
- ✗ No storage access outside iframe

### CORS

OAuth redirects work because popups bypass CORS. The backend must:

```javascript
app.use(cors({
  origin: ['http://localhost:4200', 'https://your-domain.com'],
  credentials: true
}));
```

### Token Storage

⚠️ **Security Note**: Tokens stored in `localStorage` are accessible to XSS attacks.

For production:
1. Use `sessionStorage` (cleared on tab close)
2. Or use secure, httpOnly cookies on backend
3. Or use in-memory state with refresh-token flow

## Deployment in OkDoc

### Adding to OkDoc

1. Build the app: `npm run build:prod`
2. Deploy to a public URL
3. In OkDoc settings:
   - Add plugin from URL
   - Point to your deployed app
   - Configure namespace and tools

### Environment-Specific URLs

```typescript
// Use environment detection
const isProduction = !window.location.hostname.includes('localhost');
const apiBase = isProduction 
  ? 'https://api.production.com'
  : 'http://localhost:3000';
```

## Troubleshooting OkDoc Integration

### Tools Not Showing Up

**Problem:** Tools don't appear in OkDoc

**Solution:**
1. Check browser console for SDK errors
2. Verify `OkDoc.init()` is called
3. Check that tools are registered after init
4. Reload OkDoc and app

### Tool Calls Not Working

**Problem:** Tool is invoked but nothing happens

**Solution:**
1. Add `console.log()` to tool handler
2. Check browser DevTools Network tab
3. Verify API calls are succeeding
4. Check that `ToolResult` is returned

### Notifications Not Received

**Problem:** OkDoc doesn't receive notifications

**Solution:**
1. Verify `OkDoc.notify()` is called
2. Check notification data format
3. Ensure notification is called after tool completes
4. Check browser console for errors

## Examples

### Example: Creating a Post via Voice

**User Says:** "Create a TikTok post: Check out this amazing video!"

**Flow:**
1. OkDoc parses command and calls `create_post` tool
2. Handler receives: `{ caption: 'Check out this amazing video!' }`
3. `PostComponent.submitPost()` is called
4. `TikTokService.createPost()` makes API request
5. Video is posted successfully
6. `OkDocService.notifyPostCreated()` notifies OkDoc
7. UI shows success message
8. OkDoc displays result to user

### Example: Multi-Step Workflow

**Workflow:** "Login, then create a post"

**Flow:**
1. User: "Login to TikTok"
2. `login` tool is invoked
3. OAuth flow completes
4. `notifyAuthStateChanged(true, user)` sent
5. UI updates to show authenticated state
6. User: "Create a post: My first post!"
7. `create_post` tool is invoked
8. Post is created successfully
9. `notifyPostCreated()` sent
10. Workflow completes

## References

- [OkDoc SDK Documentation](https://github.com/okDoc-ai/plugin-sdk)
- [OkDoc Iframe Plugin Guide](https://github.com/okDoc-ai/hero-app-sdk-docs/blob/master/DOCS/IframePluginGuide.md)
- [JSON Schema Specification](https://json-schema.org/)
- [MessageChannel API](https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel)