# CipherChat Project Documentation

## 1. Project Overview & Achievements
CipherChat is a secure, real-time chat application built using React and Firebase Realtime Database. It features a modern, Discord-like user interface with channel-based communication.

**Key Achievements:**
- **Real-time Communication:** Built a highly responsive chat platform leveraging Firebase's WebSocket connections for instant message delivery and presence detection (who is online).
- **End-to-End Encryption (E2EE):** Implemented client-side encryption ensuring that messages are encrypted before they leave the browser and only decrypted by recipients with the shared passphrase.
- **Multiple Cipher Modes:** Supports a fun custom "Emoji Cipher" and an industry-standard AES-256-GCM encryption mode for secure communication.
- **Access Control:** Implemented public and private (password-protected) channels.
- **Session Management:** Utilized browser storage mechanisms (LocalStorage for usernames, SessionStorage for volatile passphrases) to manage user identity securely.

---

## 2. File Explanations

### `src/App.js`
The main orchestrator component of the application. 
- **Role:** Manages the global state of the application, including the current user's identity, active channel, and UI modals (Create Channel, Explore, Settings).
- **Key Logic:** Handles joining channels, unlocking private channels, and managing the user's presence (adding/removing them from the active channel's member list in Firebase).

### `src/Chat.js`
The core chat interface component.
- **Role:** Displays the message history for the active channel and provides the input form to send new messages.
- **Key Logic:** Subscribes to the Firebase `messages/{channelId}` path. It runs incoming messages through the decryption functions and passes outgoing text through the encryption functions (Emoji or AES-256) before sending. It also handles auto-scrolling to the latest messages.

### `src/Sidebar.js`
The navigation and presence tracking component.
- **Role:** Renders the list of available channels and the list of online members in the currently active channel.
- **Key Logic:** Takes the global state from `App.js` as props and renders the UI. It also displays the current user's avatar and provides buttons to explore or create channels.

### `src/ciphers.js`
The encryption and decryption engine.
- **Role:** Houses all cryptographic logic entirely independent of the UI components.
- **Key Logic:** 
  - **Emoji Cipher:** Uses a hardcoded mapping dictionary to swap alphanumeric characters with specific emojis.
  - **AES Block Cipher:** Utilizes the native Web Crypto API (`crypto.subtle`) to derive a key using PBKDF2 from a user-supplied passphrase, and performs AES-GCM encryption/decryption.

### `src/db.js`
The database abstraction layer.
- **Role:** Initializes the Firebase application using environment variables and exports wrapper functions for database operations.
- **Key Logic:** Provides helper functions (`pushData`, `setData`, `deleteData`, `onData`) to ensure UI components don't interact with the Firebase API directly, enforcing a clean separation of concerns.

### `src/channels.js`
- **Role:** Contains a hardcoded list of default channels (e.g., general, secret, dev) used to seed the database upon initial load if it's empty.

### `package.json` & `index.html`
- **`package.json`:** Defines the project metadata, run scripts (`dev`, `build`), and dependencies (React, Firebase, Parcel).
- **`index.html`:** The entry point of the app, containing extensive CSS styling (CSS variables, flexbox/grid layouts) that gives the app its premium, dark-themed aesthetic.

---

## 3. Operating System Concepts Utilized

While this is a web application, several software engineering patterns map directly to core Operating System concepts:

1. **Inter-Process Communication (IPC):**
   The application acts as a distributed system where different client browsers (processes) communicate with each other. Firebase acts as the shared memory or message broker, facilitating IPC over a network.
2. **Asynchronous I/O & Event Loops:**
   JavaScript's non-blocking event loop is heavily utilized (e.g., `async`/`await` in `ciphers.js`, Firebase `onData` listeners). This is analogous to how OS network drivers handle asynchronous hardware interrupts without blocking the main execution thread.
3. **Storage Hierarchies (Volatile vs. Non-Volatile):**
   The app demonstrates an understanding of storage lifetimes:
   - *LocalStorage* (Non-Volatile/Persistent): Used for the `username` so it survives browser restarts.
   - *SessionStorage* (Volatile): Used for the `encryptionPassphrase` to ensure sensitive cryptographic keys are purged from memory when the tab closes, acting like heavily restricted RAM.
4. **Resource Management & Process Cleanup:**
   In `App.js`, a `beforeunload` event listener ensures the user is cleanly removed from the active channel's member list when closing the tab. This mimics an OS reclaiming resources and closing file descriptors when a process exits.
5. **Security and Access Control (File Permissions):**
   The implementation of "Private Channels" with passphrases maps closely to OS access control lists (ACLs) and secured directories.

---