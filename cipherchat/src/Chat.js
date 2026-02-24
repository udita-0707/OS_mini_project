import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { pushData, onData } from './db.js';
import {
    emojiEncrypt,
    emojiDecrypt,
    blockEncrypt,
    blockDecrypt,
    encryptFileBytes,
    decryptFileBytes
} from './ciphers.js';

const FILE_CRYPTO_CHANNEL_ID = 'file-crypto';

const getStringColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 55%)`;
};

const Chat = ({
    username,
    channel,
    encryptionPassphrase,
    onAboutChannel,
    onRequestDeleteChannel,
    canDeleteChannel
}) => {
    const channelId = channel ? channel.id : null;
    const [cipherType, setCipherType] = useState('emoji');
    const [newMessage, setNewMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showJumpToLatest, setShowJumpToLatest] = useState(false);
    const [isNearBottom, setIsNearBottom] = useState(true);
    const messagesListRef = useRef(null);
    const previousMessageCountRef = useRef(0);

    const scrollToBottom = useCallback((behavior = 'auto') => {
        const list = messagesListRef.current;
        if (!list) return;
        list.scrollTo({ top: list.scrollHeight, behavior });
    }, []);

    useEffect(() => {
        if (!channelId) {
            setMessages([]);
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
            messageList.sort((a, b) => a.timestamp - b.timestamp);
            setMessages(messageList);
            setIsLoading(false);
        });

        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [channelId]);

    const canUseSecureCipher = useMemo(
        () => cipherType !== 'block' || Boolean(encryptionPassphrase),
        [cipherType, encryptionPassphrase]
    );

    useEffect(() => {
        setShowJumpToLatest(false);
        setIsNearBottom(true);
        previousMessageCountRef.current = 0;
    }, [channelId]);

    useEffect(() => {
        const previousCount = previousMessageCountRef.current;
        const hasNewMessages = messages.length > previousCount;

        if (hasNewMessages) {
            if (isNearBottom) {
                requestAnimationFrame(() => scrollToBottom('smooth'));
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
        if (!trimmed) return;

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
                    <h2>{channel ? channel.name : channelId}</h2>
                </div>
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
                <div className="chat-header-actions">
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

            {!canUseSecureCipher && (
                <div className="security-banner">
                    Add an encryption passphrase in your profile modal to use AES-256.
                </div>
            )}

            {channelId === FILE_CRYPTO_CHANNEL_ID && (
                <FileCryptoPanel encryptionPassphrase={encryptionPassphrase} />
            )}

            <div className="messages-list" ref={messagesListRef} onScroll={handleListScroll}>
                {isLoading && (
                    <div className="chat-empty">
                        <div className="chat-empty-text">Loading messages...</div>
                    </div>
                )}
                {messages.map((msg) => (
                    <MessageItem
                        key={msg.id}
                        msg={msg}
                        encryptionPassphrase={encryptionPassphrase}
                    />
                ))}
            </div>

            {showJumpToLatest && (
                <button
                    type="button"
                    className="jump-latest-btn"
                    onClick={() => {
                        scrollToBottom('smooth');
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
                        placeholder={`Message #${channel ? channel.name : channelId}`}
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
    );
};

const FileCryptoPanel = ({ encryptionPassphrase }) => {
    const [mode, setMode] = useState('encrypt');
    const [passphrase, setPassphrase] = useState(encryptionPassphrase || '');
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [isWorking, setIsWorking] = useState(false);

    useEffect(() => {
        setPassphrase(encryptionPassphrase || '');
    }, [encryptionPassphrase]);

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
            <input
                className="file-crypto-input"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
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
            {error && <p className="file-crypto-error">{error}</p>}
            {status && <p className="file-crypto-status">{status}</p>}
            <button type="submit" className="file-crypto-run" disabled={isWorking}>
                {isWorking ? 'Processing...' : mode === 'encrypt' ? 'Encrypt & Download' : 'Decrypt & Download'}
            </button>
        </form>
    );
};

const MessageItem = ({ msg, encryptionPassphrase }) => {
    const [decryptedText, setDecryptedText] = useState('');
    const [decryptFailed, setDecryptFailed] = useState(false);
    const [showEncrypted, setShowEncrypted] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const decryptMessage = async () => {
            try {
                if (msg.cipherType === 'emoji') {
                    if (isMounted) {
                        setDecryptFailed(false);
                        setDecryptedText(emojiDecrypt(msg.encryptedText));
                    }
                    return;
                }

                const plain = await blockDecrypt(msg.encryptedText, encryptionPassphrase);
                if (isMounted) {
                    setDecryptFailed(false);
                    setDecryptedText(plain);
                }
            } catch {
                if (isMounted) {
                    setDecryptFailed(true);
                    setDecryptedText('[Unable to decrypt: missing key or invalid payload]');
                }
            }
        };

        decryptMessage();
        return () => {
            isMounted = false;
        };
    }, [msg.cipherType, msg.encryptedText, encryptionPassphrase]);

    return (
        <div className="msg-group">
            <div className="msg-avatar" style={{ background: getStringColor(msg.sender || '?') }}>
                {(msg.sender || '?').charAt(0).toUpperCase()
                }
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
