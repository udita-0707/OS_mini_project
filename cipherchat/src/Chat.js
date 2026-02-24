import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { pushData, onData } from './db.js';
import { emojiEncrypt, emojiDecrypt, blockEncrypt, blockDecrypt } from './ciphers.js';

const getStringColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 55%)`;
};

const Chat = ({ username, channel, encryptionPassphrase }) => {
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
            </div>

            {!canUseSecureCipher && (
                <div className="security-banner">
                    Add an encryption passphrase in your profile modal to use AES-256.
                </div>
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

const MessageItem = ({ msg, encryptionPassphrase }) => {
    const [decryptedText, setDecryptedText] = useState('');
    const [decryptFailed, setDecryptFailed] = useState(false);

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
                <div className="msg-encrypted-pill">
                    <span className="msg-encrypted-label">encrypted</span>
                    <span className="msg-encrypted-val" title={msg.encryptedText}>{msg.encryptedText}</span>
                </div>
            </div>
        </div>
    );
};

export default Chat;
