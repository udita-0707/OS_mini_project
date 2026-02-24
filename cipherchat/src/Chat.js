import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { pushData, onData, deleteData } from './db.js';
import {
    emojiEncrypt,
    emojiDecrypt,
    blockEncrypt,
    blockDecrypt,
    encryptFileBytes,
    decryptFileBytes
} from './ciphers.js';

const FILE_CRYPTO_CHANNEL_ID = 'file-crypto';
const MAX_VISIBLE_MESSAGES = 400;

const getStringColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 55%)`;
};

const formatBytes = (value) => {
    if (!value && value !== 0) return '-';
    if (value < 1024) return `${value} B`;
    const kb = value / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
};

const cleanChannelName = (value) => (value || '').replace(/^#+/, '');

const Chat = ({
    username,
    channel,
    activeMembers,
    encryptionPassphrase,
    onAboutChannel,
    onRequestDeleteChannel,
    canDeleteChannel
}) => {
    const channelId = channel ? channel.id : null;
    const isFileCryptoChannel = channelId === FILE_CRYPTO_CHANNEL_ID;

    const [cipherType, setCipherType] = useState('emoji');
    const [newMessage, setNewMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showJumpToLatest, setShowJumpToLatest] = useState(false);
    const [isNearBottom, setIsNearBottom] = useState(true);
    const [savedFingerprints, setSavedFingerprints] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('savedFingerprints') || '[]');
        } catch {
            return [];
        }
    });
    const [showSavedFingerprints, setShowSavedFingerprints] = useState(false);
    const [hashStatus, setHashStatus] = useState('');
    const [isClearingMessages, setIsClearingMessages] = useState(false);
    const [showMembersPane, setShowMembersPane] = useState(false);
    const messagesListRef = useRef(null);
    const previousMessageCountRef = useRef(0);
    const decryptCacheRef = useRef(new Map());

    const scrollToBottom = useCallback((behavior = 'auto') => {
        const list = messagesListRef.current;
        if (!list) return;
        list.scrollTo({ top: list.scrollHeight, behavior });
    }, []);

    useEffect(() => {
        if (!channelId || isFileCryptoChannel) {
            setMessages([]);
            setIsLoading(false);
            return undefined;
        }

        setIsLoading(true);
        const unsubscribe = onData(`messages/${channelId}`, (data) => {
            if (!data) {
                setMessages([]);
                setIsLoading(false);
                return;
            }

            const messageList = Object.keys(data).map((key) => ({
                ...data[key],
                id: key
            }));
            messageList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            const trimmed = messageList.length > MAX_VISIBLE_MESSAGES
                ? messageList.slice(-MAX_VISIBLE_MESSAGES)
                : messageList;
            setMessages(trimmed);
            setIsLoading(false);
        });

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [channelId, isFileCryptoChannel]);

    const canUseSecureCipher = useMemo(
        () => cipherType !== 'block' || Boolean(encryptionPassphrase),
        [cipherType, encryptionPassphrase]
    );

    const displayChannelName = useMemo(
        () => cleanChannelName(channel?.name || channelId || ''),
        [channel?.name, channelId]
    );

    const channelFingerprint = useMemo(
        () => (channel && !channel.isPrivate ? channel.fingerprint || '' : ''),
        [channel]
    );

    const uniqueActiveMembers = useMemo(() => {
        const seen = new Set();
        return (activeMembers || []).filter((m) => {
            if (!m?.username) return false;
            if (seen.has(m.username)) return false;
            seen.add(m.username);
            return true;
        });
    }, [activeMembers]);

    useEffect(() => {
        setShowJumpToLatest(false);
        setIsNearBottom(true);
        setShowSavedFingerprints(false);
        setShowMembersPane(false);
        setHashStatus('');
        previousMessageCountRef.current = 0;
        decryptCacheRef.current.clear();
    }, [channelId]);

    useEffect(() => {
        if (!hashStatus) return undefined;
        const timer = setTimeout(() => setHashStatus(''), 2800);
        return () => clearTimeout(timer);
    }, [hashStatus]);

    useEffect(() => {
        const previousCount = previousMessageCountRef.current;
        const hasNewMessages = messages.length > previousCount;

        if (hasNewMessages) {
            if (isNearBottom) {
                requestAnimationFrame(() => scrollToBottom('auto'));
            } else {
                setShowJumpToLatest(true);
            }
        }

        previousMessageCountRef.current = messages.length;
    }, [messages, isNearBottom, scrollToBottom]);

    const handleListScroll = () => {
        const list = messagesListRef.current;
        if (!list) return;

        const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
        const nearBottom = distanceFromBottom < 64;
        setIsNearBottom(nearBottom);
        if (nearBottom) setShowJumpToLatest(false);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const trimmed = newMessage.trim();
        if (!trimmed || !channelId) return;

        let encrypted;
        try {
            encrypted = cipherType === 'emoji'
                ? emojiEncrypt(trimmed)
                : await blockEncrypt(trimmed, encryptionPassphrase);
        } catch (err) {
            console.warn('Encryption failed:', err.message);
            return;
        }

        try {
            await pushData(`messages/${channelId}`, {
                sender: username,
                cipherType,
                encryptedText: encrypted,
                timestamp: Date.now()
            });
            setNewMessage('');
        } catch (err) {
            console.warn('Message send error:', err.message);
        }
    };

    const persistFingerprints = (items) => {
        setSavedFingerprints(items);
        localStorage.setItem('savedFingerprints', JSON.stringify(items));
    };

    const saveChannelFingerprint = () => {
        if (!channel || !channelFingerprint) return;
        const exists = savedFingerprints.some((item) => item.fingerprint === channelFingerprint);
        if (exists) {
            setHashStatus('Fingerprint already saved.');
            return;
        }
        const next = [
            {
                channelId: channel.id,
                channelName: cleanChannelName(channel.name),
                fingerprint: channelFingerprint,
                savedAt: Date.now()
            },
            ...savedFingerprints
        ].slice(0, 20);
        persistFingerprints(next);
        setHashStatus('Fingerprint saved.');
    };

    const removeSavedFingerprint = (fingerprint) => {
        const next = savedFingerprints.filter((item) => item.fingerprint !== fingerprint);
        persistFingerprints(next);
    };

    const copyFingerprint = async (fingerprint = channelFingerprint) => {
        if (!fingerprint) return;
        try {
            await navigator.clipboard.writeText(fingerprint);
            setHashStatus('Fingerprint copied to clipboard.');
        } catch {
            setHashStatus('Could not copy fingerprint.');
        }
    };

    const handleClearAllMessages = async () => {
        if (!channelId) return;
        const confirmed = window.confirm(`Clear all messages in #${displayChannelName}? This cannot be undone.`);
        if (!confirmed) return;

        setIsClearingMessages(true);
        try {
            await deleteData(`messages/${channelId}`);
            setHashStatus(`All messages in #${displayChannelName} were cleared.`);
        } catch {
            setHashStatus('Could not clear messages right now.');
        } finally {
            setIsClearingMessages(false);
        }
    };

    const handleDeleteSingleMessage = async (messageId) => {
        if (!channelId || !messageId) return;
        const confirmed = window.confirm('Delete this message?');
        if (!confirmed) return;
        try {
            await deleteData(`messages/${channelId}/${messageId}`);
        } catch {
            setHashStatus('Could not delete this message.');
        }
    };

    if (!channelId) {
        return (
            <div className="chat-area">
                <div className="chat-empty">
                    <div className="chat-empty-icon">💬</div>
                    <div className="chat-empty-text">No Channel Selected</div>
                    <div className="chat-empty-sub">Choose a room to join the conversation.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-area">
            <div className="chat-header">
                <div className="chat-header-title">
                    <span className="chat-header-hash">#</span>
                    <h2>{displayChannelName}</h2>
                </div>
                {!isFileCryptoChannel && (
                    <div className="cipher-toggle">
                        <button
                            type="button"
                            className={`cipher-btn${cipherType === 'emoji' ? ' active' : ''}`}
                            onClick={() => setCipherType('emoji')}
                        >
                            Emoji Cipher
                        </button>
                        <button
                            type="button"
                            className={`cipher-btn${cipherType === 'block' ? ' active' : ''}`}
                            onClick={() => setCipherType('block')}
                        >
                            AES-256
                        </button>
                    </div>
                )}
                <div className="chat-header-actions">
                    {channelFingerprint && (
                        <button
                            type="button"
                            className="icon-btn"
                            title="Public channel hash"
                            onClick={() => setShowSavedFingerprints((prev) => !prev)}
                        >
                            🔑
                        </button>
                    )}
                    {!isFileCryptoChannel && (
                        <button
                            type="button"
                            className={`icon-btn${showMembersPane ? ' active' : ''}`}
                            title="Show channel members"
                            onClick={() => setShowMembersPane((prev) => !prev)}
                        >
                            👥
                        </button>
                    )}
                    {!isFileCryptoChannel && (
                        <button
                            type="button"
                            className="icon-btn icon-btn-warn"
                            title="Clear all messages in this channel"
                            onClick={handleClearAllMessages}
                            disabled={isClearingMessages}
                        >
                            {isClearingMessages ? '…' : '🧹'}
                        </button>
                    )}
                    <button
                        type="button"
                        className="icon-btn"
                        title="About this channel"
                        onClick={onAboutChannel}
                    >
                        ⓘ
                    </button>
                    <button
                        type="button"
                        className="icon-btn icon-btn-danger"
                        title={canDeleteChannel ? 'Delete this channel' : 'This channel is protected'}
                        onClick={onRequestDeleteChannel}
                        disabled={!canDeleteChannel}
                    >
                        🗑
                    </button>
                </div>
            </div>

            {!isFileCryptoChannel && !canUseSecureCipher && (
                <div className="security-banner">
                    Add an encryption passphrase in your profile modal to use AES-256.
                </div>
            )}

            {hashStatus && <div className="hash-status">{hashStatus}</div>}
            {showSavedFingerprints && channelFingerprint && (
                <div className="saved-hash-panel">
                    <div className="saved-hash-title">Public Channel Hash</div>
                    <div className="saved-hash-item">
                        <div className="saved-hash-row">
                            <strong>#{displayChannelName}</strong>
                            <span>Current</span>
                        </div>
                        <code>{channelFingerprint}</code>
                        <div className="saved-hash-actions">
                            <button type="button" className="mini-btn" onClick={() => copyFingerprint(channelFingerprint)}>Copy</button>
                            <button type="button" className="mini-btn" onClick={saveChannelFingerprint}>Save</button>
                        </div>
                    </div>
                    <div className="saved-hash-title">Stored Hashes</div>
                    {savedFingerprints.length === 0 && (
                        <div className="saved-hash-empty">
                            No saved fingerprints yet. Save one from a public channel.
                        </div>
                    )}
                    {savedFingerprints.map((item) => (
                        <div key={`${item.channelId}-${item.fingerprint}`} className="saved-hash-item">
                            <div className="saved-hash-row">
                                <strong>#{item.channelName}</strong>
                                <span>{new Date(item.savedAt).toLocaleDateString()}</span>
                            </div>
                            <code>{item.fingerprint}</code>
                            <div className="saved-hash-actions">
                                <button type="button" className="mini-btn" onClick={() => copyFingerprint(item.fingerprint)}>Copy</button>
                                <button
                                    type="button"
                                    className="mini-btn mini-btn-danger"
                                    onClick={() => removeSavedFingerprint(item.fingerprint)}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isFileCryptoChannel ? (
                <div className="file-channel-stage">
                    <div className="file-channel-brief">
                        <h3>About #file-crypto</h3>
                        <p>
                            This channel is a secure tools workspace. It does not store chat messages.
                            Use it to transform files locally in your browser.
                        </p>
                        <ul>
                            <li>Choose Encrypt or Decrypt mode.</li>
                            <li>Drag and drop a file.</li>
                            <li>Enter your passphrase and download the output.</li>
                        </ul>
                    </div>
                    <FileCryptoPanel encryptionPassphrase={encryptionPassphrase} />
                </div>
            ) : (
                <div className="chat-content-layout">
                    <div className="chat-main-column">
                        <div className="messages-list" ref={messagesListRef} onScroll={handleListScroll}>
                            {isLoading && (
                                <div className="chat-empty">
                                    <div className="chat-empty-text">Loading messages...</div>
                                </div>
                            )}
                            {!isLoading && messages.length === 0 && (
                                <div className="chat-empty chat-empty-start">
                                    <div className="chat-empty-orb" />
                                    <div className="chat-empty-icon">✨</div>
                                    <div className="chat-empty-text">No messages yet</div>
                                    <div className="chat-empty-sub">
                                        Start the first conversation in <strong>#{displayChannelName}</strong>.
                                    </div>
                                </div>
                            )}
                            {messages.map((msg) => (
                                <MessageItem
                                    key={msg.id}
                                    msg={msg}
                                    encryptionPassphrase={encryptionPassphrase}
                                    decryptCacheRef={decryptCacheRef}
                                    canDelete={Boolean(msg?.sender && username && msg.sender === username)}
                                    onDelete={() => handleDeleteSingleMessage(msg.id)}
                                />
                            ))}
                        </div>

                        {showJumpToLatest && (
                            <button
                                type="button"
                                className="jump-latest-btn"
                                onClick={() => {
                                    scrollToBottom('auto');
                                    setShowJumpToLatest(false);
                                }}
                            >
                                Jump to latest
                            </button>
                        )}

                        <div className="chat-input-bar">
                            <form className="chat-input-form" onSubmit={handleSend}>
                                <input
                                    className="chat-input"
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={`Message #${displayChannelName}`}
                                />
                                <button
                                    type="submit"
                                    className="send-btn"
                                    title="Send message"
                                    disabled={!canUseSecureCipher}
                                >
                                    Send
                                </button>
                            </form>
                        </div>
                    </div>

                    {showMembersPane && messages.length > 0 && (
                        <aside className="channel-members-pane">
                            <div className="channel-members-pane-title">
                                Members in #{displayChannelName} — {uniqueActiveMembers.length}
                            </div>
                            <div className="channel-members-pane-list">
                                {uniqueActiveMembers.map((member) => (
                                    <div key={member.id || member.username} className="channel-member-row">
                                        <span className="channel-member-dot" />
                                        <span>{member.username}</span>
                                    </div>
                                ))}
                                {uniqueActiveMembers.length === 0 && (
                                    <div className="channel-member-empty">
                                        No members visible in this channel right now.
                                    </div>
                                )}
                            </div>
                        </aside>
                    )}
                </div>
            )}
        </div>
    );
};

const FileCryptoPanel = ({ encryptionPassphrase }) => {
    const [mode, setMode] = useState('encrypt');
    const [passphrase, setPassphrase] = useState(encryptionPassphrase || '');
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [isWorking, setIsWorking] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [fileInputKey, setFileInputKey] = useState(0);

    useEffect(() => {
        setPassphrase(encryptionPassphrase || '');
    }, [encryptionPassphrase]);

    useEffect(() => {
        setSelectedFile(null);
        setError('');
        setStatus('');
        setFileInputKey((prev) => prev + 1);
    }, [mode]);

    const handleFileSelect = (file) => {
        if (!file) return;
        setSelectedFile(file);
        setError('');
        setStatus(`Loaded ${file.name} (${formatBytes(file.size)})`);
    };

    const outputName = useMemo(() => {
        if (!selectedFile) return '';
        if (mode === 'encrypt') return `${selectedFile.name}.enc`;
        return selectedFile.name.endsWith('.enc')
            ? selectedFile.name.slice(0, -4)
            : `${selectedFile.name}.dec`;
    }, [selectedFile, mode]);

    const handleProcess = async (e) => {
        e.preventDefault();
        setError('');
        setStatus('');

        if (!selectedFile) {
            setError('Choose a file first.');
            return;
        }
        if (!passphrase.trim()) {
            setError('Enter a passphrase.');
            return;
        }

        setIsWorking(true);
        try {
            const bytes = new Uint8Array(await selectedFile.arrayBuffer());
            const result = mode === 'encrypt'
                ? await encryptFileBytes(bytes, passphrase.trim())
                : await decryptFileBytes(bytes, passphrase.trim());

            const blob = new Blob([result], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = outputName || `processed-${Date.now()}.bin`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
            setStatus(`Done. Downloaded ${anchor.download}`);
            setSelectedFile(null);
            setFileInputKey((prev) => prev + 1);
        } catch (err) {
            setError(err?.message || 'File crypto operation failed.');
        } finally {
            setIsWorking(false);
        }
    };

    return (
        <form className="file-crypto-panel" onSubmit={handleProcess}>
            <div className="file-crypto-header">
                <h3>File Encryption / Decryption</h3>
                <div className="file-crypto-tabs">
                    <button
                        type="button"
                        className={`file-crypto-tab${mode === 'encrypt' ? ' active' : ''}`}
                        onClick={() => setMode('encrypt')}
                    >
                        Encrypt
                    </button>
                    <button
                        type="button"
                        className={`file-crypto-tab${mode === 'decrypt' ? ' active' : ''}`}
                        onClick={() => setMode('decrypt')}
                    >
                        Decrypt
                    </button>
                </div>
            </div>
            <p className="file-crypto-note">
                AES-256-GCM in browser. Files are processed locally and downloaded.
            </p>
            <div className="file-crypto-stats">
                <div className="file-crypto-stat">
                    <span>Mode</span>
                    <strong>{mode === 'encrypt' ? 'Encrypt' : 'Decrypt'}</strong>
                </div>
                <div className="file-crypto-stat">
                    <span>Input Size</span>
                    <strong>{selectedFile ? formatBytes(selectedFile.size) : '-'}</strong>
                </div>
                <div className="file-crypto-stat">
                    <span>Output</span>
                    <strong>{outputName || '-'}</strong>
                </div>
            </div>
            <div className="file-crypto-workspace">
                <div className="file-crypto-main">
                    <label
                        className={`file-dropzone${isDragOver ? ' dragover' : ''}`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragOver(true);
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                            handleFileSelect(e.dataTransfer.files?.[0] || null);
                        }}
                    >
                        <input
                            key={fileInputKey}
                            className="file-dropzone-input"
                            type="file"
                            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                        />
                        <div className="file-dropzone-icon">📁</div>
                        <div className="file-dropzone-title">Drag & drop file here</div>
                        <div className="file-dropzone-sub">or click to browse</div>
                    </label>
                    <input
                        className="file-crypto-input"
                        type="password"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder="Passphrase"
                    />
                    {selectedFile && (
                        <div className="file-crypto-meta">
                            <span>Input: {selectedFile.name}</span>
                            <span>Output: {outputName}</span>
                        </div>
                    )}
                </div>
            </div>
            {error && <p className="file-crypto-error">{error}</p>}
            {status && <p className="file-crypto-status">{status}</p>}
            <button type="submit" className="file-crypto-run" disabled={isWorking}>
                {isWorking ? 'Processing...' : mode === 'encrypt' ? 'Encrypt & Download' : 'Decrypt & Download'}
            </button>
        </form>
    );
};

const MessageItem = ({ msg, encryptionPassphrase, decryptCacheRef, canDelete, onDelete }) => {
    const [decryptedText, setDecryptedText] = useState('');
    const [decryptFailed, setDecryptFailed] = useState(false);
    const [showEncrypted, setShowEncrypted] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const cacheKey = `${msg.cipherType}:${msg.encryptedText}:${encryptionPassphrase || ''}`;

        const applyState = (text, failed) => {
            if (!isMounted) return;
            setDecryptFailed(failed);
            setDecryptedText(text);
        };

        const decryptMessage = async () => {
            const cache = decryptCacheRef?.current;
            if (cache?.has(cacheKey)) {
                const cached = cache.get(cacheKey);
                applyState(cached.text, cached.decryptFailed);
                return;
            }

            try {
                if (msg.cipherType === 'emoji') {
                    const plainEmoji = emojiDecrypt(msg.encryptedText);
                    cache?.set(cacheKey, { text: plainEmoji, decryptFailed: false });
                    applyState(plainEmoji, false);
                    return;
                }

                const plain = await blockDecrypt(msg.encryptedText, encryptionPassphrase);
                cache?.set(cacheKey, { text: plain, decryptFailed: false });
                applyState(plain, false);
            } catch {
                const errorText = '[Unable to decrypt: missing key or invalid payload]';
                cache?.set(cacheKey, { text: errorText, decryptFailed: true });
                applyState(errorText, true);
            }
        };

        decryptMessage();
        return () => {
            isMounted = false;
        };
    }, [msg.cipherType, msg.encryptedText, encryptionPassphrase, decryptCacheRef]);

    return (
        <div className="msg-group">
            <div className="msg-avatar" style={{ background: getStringColor(msg.sender || '?') }}>
                {(msg.sender || '?').charAt(0).toUpperCase()}
            </div>
            <div className="msg-content">
                <div className="msg-header">
                    <span className="msg-sender">{msg.sender}</span>
                    <span className={`msg-cipher-tag${msg.cipherType === 'block' ? ' secure' : ''}`}>
                        {msg.cipherType === 'block' ? 'AES' : 'EMOJI'}
                    </span>
                    <span className="msg-time">
                        {new Date(msg.timestamp).toLocaleString([], {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                    {canDelete && (
                        <button type="button" className="msg-delete-btn" title="Delete this message" onClick={onDelete}>
                            🗑
                        </button>
                    )}
                </div>
                <div className={`msg-text${decryptFailed ? ' msg-text-error' : ''}`}>{decryptedText}</div>
                <button
                    type="button"
                    className="msg-encrypted-toggle"
                    onClick={() => setShowEncrypted((prev) => !prev)}
                >
                    {showEncrypted ? '🙈 Hide Cipher Text' : '🔐 View Cipher Text'}
                </button>
                {showEncrypted && (
                    <div className="msg-encrypted-pill">
                        <span className="msg-encrypted-label">encrypted</span>
                        <span className="msg-encrypted-val" title={msg.encryptedText}>{msg.encryptedText}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;
