import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { pushData, onData, deleteData, setData } from './db.js';
import {
    emojiEncrypt,
    emojiDecrypt,
    blockEncrypt,
    blockDecrypt
} from './ciphers.js';

const MAX_VISIBLE_MESSAGES = 500;
const GROUP_WINDOW_MS = 5 * 60 * 1000;

const getStringColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 55%)`;
};

const cleanChannelName = (value) => (value || '').replace(/^#+/, '');

const formatDayLabel = (timestamp) => {
    const day = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const dateOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).getTime();

    if (dateOnly === todayOnly) return 'Today';
    if (dateOnly === yesterdayOnly) return 'Yesterday';
    return day.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
};

const getDayKey = (timestamp) => {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const safeSnippet = (value) => {
    const raw = String(value || '').replace(/\s+/g, ' ').trim();
    if (!raw) return 'Encrypted message';
    return raw.length > 80 ? `${raw.slice(0, 80)}...` : raw;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isMatchMessage = (message, idSet) => idSet.has(message.clientId || message.id);

const decryptForSearch = async (msg, passphrase) => {
    if (msg.plaintext) return msg.plaintext;
    if (msg.cipherType === 'emoji') return emojiDecrypt(msg.encryptedText || '');
    return blockDecrypt(msg.encryptedText || '', passphrase);
};

const buildTimeline = (messages) => {
    const entries = [];
    let previousMessage = null;
    let previousDayKey = null;

    messages.forEach((msg) => {
        const timestamp = msg.timestamp || 0;
        const currentDayKey = getDayKey(timestamp);
        if (currentDayKey !== previousDayKey) {
            entries.push({
                type: 'separator',
                id: `day-${currentDayKey}`,
                label: formatDayLabel(timestamp)
            });
            previousDayKey = currentDayKey;
        }

        const grouped = Boolean(
            previousMessage &&
            previousMessage.sender === msg.sender &&
            getDayKey(previousMessage.timestamp || 0) === currentDayKey &&
            Math.abs((msg.timestamp || 0) - (previousMessage.timestamp || 0)) <= GROUP_WINDOW_MS
        );

        entries.push({
            type: 'message',
            id: `msg-${msg.clientId || msg.id}`,
            message: msg,
            grouped
        });

        previousMessage = msg;
    });

    return entries;
};

const copyTextWithFallback = async (text) => {
    const value = String(text || '');
    if (!value) return false;

    try {
        await navigator.clipboard.writeText(value);
        return true;
    } catch {
        try {
            const area = document.createElement('textarea');
            area.value = value;
            area.setAttribute('readonly', '');
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.focus();
            area.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(area);
            return ok;
        } catch {
            return false;
        }
    }
};

const Chat = ({
    username,
    channel,
    activeMembers,
    encryptionPassphrase,
    onAboutChannel,
    onRequestDeleteChannel,
    canDeleteChannel,
    canModerateChannel,
    channelRole
}) => {
    const channelId = channel ? channel.id : null;

    const [cipherType, setCipherType] = useState('emoji');
    const [newMessage, setNewMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [pendingMessages, setPendingMessages] = useState([]);
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
    const [isDeletingMessage, setIsDeletingMessage] = useState(false);
    const [pendingDeleteMessageId, setPendingDeleteMessageId] = useState(null);
    const [showMembersPane, setShowMembersPane] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMatchIds, setSearchMatchIds] = useState([]);
    const [activeMatchIndex, setActiveMatchIndex] = useState(0);
    const [replyTarget, setReplyTarget] = useState(null);
    const [selectedMessageId, setSelectedMessageId] = useState(null);

    const messagesListRef = useRef(null);
    const chatInputRef = useRef(null);
    const previousMessageCountRef = useRef(0);
    const decryptCacheRef = useRef(new Map());

    const scrollToBottom = useCallback((behavior = 'auto') => {
        const list = messagesListRef.current;
        if (!list) return;
        list.scrollTo({ top: list.scrollHeight, behavior });
    }, []);

    useEffect(() => {
        if (!channelId) {
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
    }, [channelId]);

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

    const combinedMessages = useMemo(() => {
        const merged = [...messages, ...pendingMessages].sort((a, b) => {
            const timeDiff = (a.timestamp || 0) - (b.timestamp || 0);
            if (timeDiff !== 0) return timeDiff;
            return String(a.id || a.clientId).localeCompare(String(b.id || b.clientId));
        });
        return merged;
    }, [messages, pendingMessages]);

    const timeline = useMemo(() => buildTimeline(combinedMessages), [combinedMessages]);

    const currentMatchId = searchMatchIds[activeMatchIndex] || null;

    useEffect(() => {
        setShowJumpToLatest(false);
        setIsNearBottom(true);
        setShowSavedFingerprints(false);
        setShowMembersPane(false);
        setHashStatus('');
        setSearchQuery('');
        setSearchMatchIds([]);
        setActiveMatchIndex(0);
        setIsDeletingMessage(false);
        setPendingDeleteMessageId(null);
        setReplyTarget(null);
        setSelectedMessageId(null);
        setPendingMessages([]);
        previousMessageCountRef.current = 0;
        decryptCacheRef.current.clear();
    }, [channelId]);

    useEffect(() => {
        if (!hashStatus) return undefined;
        const timer = setTimeout(() => setHashStatus(''), 3000);
        return () => clearTimeout(timer);
    }, [hashStatus]);

    useEffect(() => {
        const previousCount = previousMessageCountRef.current;
        const hasNewMessages = combinedMessages.length > previousCount;

        if (hasNewMessages) {
            if (isNearBottom) {
                requestAnimationFrame(() => scrollToBottom('auto'));
            } else {
                setShowJumpToLatest(true);
            }
        }

        previousMessageCountRef.current = combinedMessages.length;
    }, [combinedMessages.length, isNearBottom, scrollToBottom]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchMatchIds([]);
            setActiveMatchIndex(0);
            return;
        }

        let cancelled = false;
        const query = searchQuery.trim().toLowerCase();

        const run = async () => {
            const matches = [];
            for (const msg of combinedMessages) {
                const messageKey = msg.clientId || msg.id;
                if (!messageKey) continue;

                const cacheKey = `${msg.cipherType}:${msg.encryptedText}:${encryptionPassphrase || ''}`;
                let plain = msg.plaintext || '';

                if (!plain) {
                    const cached = decryptCacheRef.current.get(cacheKey);
                    if (cached) {
                        plain = cached.text;
                    } else {
                        try {
                            plain = await decryptForSearch(msg, encryptionPassphrase);
                            decryptCacheRef.current.set(cacheKey, { text: plain, decryptFailed: false });
                        } catch {
                            plain = '';
                        }
                    }
                }

                const haystack = `${msg.sender || ''} ${plain}`.toLowerCase();
                if (haystack.includes(query)) {
                    matches.push(messageKey);
                }
            }

            if (!cancelled) {
                setSearchMatchIds(matches);
                setActiveMatchIndex(matches.length ? 0 : 0);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [searchQuery, combinedMessages, encryptionPassphrase]);

    useEffect(() => {
        if (!currentMatchId || !searchQuery.trim()) return;
        requestAnimationFrame(() => {
            const list = messagesListRef.current;
            if (!list) return;
            const node = list.querySelector(`[data-message-id="${currentMatchId}"]`);
            if (node) {
                node.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        });
    }, [currentMatchId, searchQuery, timeline]);

    const handleListScroll = () => {
        const list = messagesListRef.current;
        if (!list) return;

        const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
        const nearBottom = distanceFromBottom < 64;
        setIsNearBottom(nearBottom);
        if (nearBottom) setShowJumpToLatest(false);

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
        const copied = await copyTextWithFallback(fingerprint);
        if (copied) {
            setHashStatus('Fingerprint copied to clipboard.');
        } else {
            setHashStatus('Could not copy fingerprint.');
        }
    };

    const createEncryptedPayload = async (plainText, selectedCipher) => {
        if (selectedCipher === 'emoji') return emojiEncrypt(plainText);
        return blockEncrypt(plainText, encryptionPassphrase);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const trimmed = newMessage.trim();
        if (!trimmed || !channelId) return;

        const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        let encrypted;
        try {
            encrypted = await createEncryptedPayload(trimmed, cipherType);
        } catch (err) {
            setHashStatus(err?.message || 'Encryption failed.');
            return;
        }

        const pending = {
            clientId: tempId,
            sender: username,
            cipherType,
            encryptedText: encrypted,
            plaintext: trimmed,
            timestamp: Date.now(),
            status: 'sending',
            replyTo: replyTarget || null,
            isLocal: true
        };

        setPendingMessages((prev) => [...prev, pending]);
        setNewMessage('');
        setReplyTarget(null);

        try {
            await pushData(`messages/${channelId}`, {
                sender: username,
                cipherType,
                encryptedText: encrypted,
                timestamp: pending.timestamp,
                replyTo: replyTarget || null,
                meta: cipherType === 'block'
                    ? {
                        algorithm: 'AES-256-GCM',
                        kdf: 'PBKDF2-SHA-256',
                        keyLength: 256
                    }
                    : { algorithm: 'EMOJI-SUBSTITUTION' }
            });
            setPendingMessages((prev) => prev.filter((item) => item.clientId !== tempId));
        } catch (err) {
            setPendingMessages((prev) => prev.map((item) => (
                item.clientId === tempId
                    ? { ...item, status: 'failed', error: err?.message || 'Network error' }
                    : item
            )));
            setHashStatus('Message failed to send. Retry from the message actions.');
        }
    };

    const retryPendingMessage = async (pendingId) => {
        const pending = pendingMessages.find((item) => item.clientId === pendingId);
        if (!pending || !channelId) return;

        setPendingMessages((prev) => prev.map((item) => (
            item.clientId === pendingId ? { ...item, status: 'sending', error: '' } : item
        )));

        try {
            await pushData(`messages/${channelId}`, {
                sender: pending.sender,
                cipherType: pending.cipherType,
                encryptedText: pending.encryptedText,
                timestamp: Date.now(),
                replyTo: pending.replyTo || null,
                meta: pending.cipherType === 'block'
                    ? {
                        algorithm: 'AES-256-GCM',
                        kdf: 'PBKDF2-SHA-256',
                        keyLength: 256
                    }
                    : { algorithm: 'EMOJI-SUBSTITUTION' }
            });
            setPendingMessages((prev) => prev.filter((item) => item.clientId !== pendingId));
        } catch (err) {
            setPendingMessages((prev) => prev.map((item) => (
                item.clientId === pendingId
                    ? { ...item, status: 'failed', error: err?.message || 'Retry failed' }
                    : item
            )));
            setHashStatus('Retry failed. Check connection and try again.');
        }
    };

    const handleClearAllMessages = async () => {
        if (!channelId || !canModerateChannel) return;
        const confirmed = window.confirm(`Clear all messages in #${displayChannelName}? This cannot be undone.`);
        if (!confirmed) return;

        setIsClearingMessages(true);
        try {
            await deleteData(`messages/${channelId}`);
            setPendingMessages([]);
            setHashStatus(`All messages in #${displayChannelName} were cleared.`);
        } catch {
            setHashStatus('Could not clear messages right now.');
        } finally {
            setIsClearingMessages(false);
        }
    };

    const requestDeleteSingleMessage = (messageId) => {
        if (!channelId || !messageId) return;
        setPendingDeleteMessageId(messageId);
    };

    const handleDeleteSingleMessage = async () => {
        if (!channelId || !pendingDeleteMessageId) return;
        setIsDeletingMessage(true);
        try {
            await deleteData(`messages/${channelId}/${pendingDeleteMessageId}`);
            setPendingDeleteMessageId(null);
        } catch {
            setHashStatus('Could not delete this message.');
        } finally {
            setIsDeletingMessage(false);
        }
    };

    const handleEditMessage = async (msg, nextText) => {
        if (!channelId || !msg?.id || !nextText.trim()) return;
        let nextEncrypted;
        try {
            nextEncrypted = await createEncryptedPayload(nextText.trim(), msg.cipherType);
        } catch (err) {
            setHashStatus(err?.message || 'Could not encrypt edited message.');
            return;
        }

        const { id, ...existing } = msg;
        try {
            await setData(`messages/${channelId}/${id}`, {
                ...existing,
                encryptedText: nextEncrypted,
                editedAt: Date.now(),
                editedBy: username
            });
            setHashStatus('Message edited.');
        } catch {
            setHashStatus('Could not edit this message.');
        }
    };

    const handleReplyToMessage = (msg, plainText) => {
        setReplyTarget({
            id: msg.id || msg.clientId,
            sender: msg.sender || 'Unknown',
            snippet: safeSnippet(plainText || msg.encryptedText || '')
        });
        chatInputRef.current?.focus();
    };

    const handleCopyMessage = async (plainText) => {
        if (!plainText) return;
        const copied = await copyTextWithFallback(plainText);
        if (copied) {
            setHashStatus('Message copied.');
        } else {
            setHashStatus('Could not copy message text.');
        }
    };

    const handleCopyEncrypted = async (encryptedText) => {
        if (!encryptedText) return;
        const copied = await copyTextWithFallback(encryptedText);
        if (copied) {
            setHashStatus('Encrypted text copied.');
        } else {
            setHashStatus('Could not copy encrypted text.');
        }
    };

    const jumpSearch = (direction) => {
        if (!searchMatchIds.length) return;
        const next = (activeMatchIndex + direction + searchMatchIds.length) % searchMatchIds.length;
        setActiveMatchIndex(next);
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

    const searchMatchSet = new Set(searchMatchIds);

    return (
        <div className="chat-area">
            <div className="chat-header">
                <div className="chat-header-title">
                    <span className="chat-header-hash">#</span>
                    <h2>{displayChannelName}</h2>
                    <span className={`role-chip role-${channelRole || 'member'}`}>{channelRole || 'member'}</span>
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
                    <div className="search-inline">
                        <input
                            className="search-inline-input"
                            type="search"
                            placeholder="Search in channel"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="button" className="icon-btn" onClick={() => jumpSearch(-1)} title="Previous match">↑</button>
                        <button type="button" className="icon-btn" onClick={() => jumpSearch(1)} title="Next match">↓</button>
                    </div>
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
                    <button
                        type="button"
                        className={`icon-btn${showMembersPane ? ' active' : ''}`}
                        title="Show channel members"
                        onClick={() => setShowMembersPane((prev) => !prev)}
                    >
                        👥
                    </button>
                    <button
                        type="button"
                        className="icon-btn icon-btn-warn"
                        title={canModerateChannel ? 'Clear all messages in this channel' : 'Moderator permission required'}
                        onClick={handleClearAllMessages}
                        disabled={isClearingMessages || !canModerateChannel}
                    >
                        {isClearingMessages ? '…' : '🧹'}
                    </button>
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
                        title={canDeleteChannel ? 'Delete this channel' : 'Owner permission required'}
                        onClick={onRequestDeleteChannel}
                        disabled={!canDeleteChannel}
                    >
                        🗑
                    </button>
                </div>
            </div>

            {!canUseSecureCipher && (
                <div className="security-banner">
                    Add an encryption passphrase in your profile modal to use AES-256-GCM.
                </div>
            )}

            <div className="encryption-meta-banner">
                <strong>AES mode:</strong> AES-256-GCM with PBKDF2-SHA-256 key derivation.
                <span className="encryption-meta-divider">|</span>
                <strong>Search:</strong> {searchMatchIds.length} match{searchMatchIds.length === 1 ? '' : 'es'}
                {searchMatchIds.length > 0 && (
                    <span className="encryption-meta-match">(showing {activeMatchIndex + 1}/{searchMatchIds.length})</span>
                )}
            </div>

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

            <div className="chat-content-layout">
                <div className="chat-main-column">
                    <div
                        className={`messages-list${selectedMessageId ? ' menu-active' : ''}`}
                        ref={messagesListRef}
                        onScroll={handleListScroll}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setSelectedMessageId(null);
                        }}
                    >
                        {isLoading && (
                            <div className="chat-empty">
                                <div className="chat-empty-text">Loading messages...</div>
                            </div>
                        )}
                        {!isLoading && combinedMessages.length === 0 && (
                            <div className="chat-empty chat-empty-start">
                                <div className="chat-empty-orb" />
                                <div className="chat-empty-icon">✨</div>
                                <div className="chat-empty-text">No messages yet</div>
                                <div className="chat-empty-sub">
                                    Start the first conversation in <strong>#{displayChannelName}</strong>.
                                </div>
                                <div className="empty-chat-actions">
                                    <button
                                        type="button"
                                        className="mini-btn"
                                        onClick={() => chatInputRef.current?.focus()}
                                    >
                                        Send first message
                                    </button>
                                </div>
                            </div>
                        )}

                        {!isLoading && timeline.map((entry) => {
                            if (entry.type === 'separator') {
                                return (
                                    <div key={entry.id} className="date-separator">
                                        <span>{entry.label}</span>
                                    </div>
                                );
                            }

                            const msg = entry.message;
                            const canDelete = Boolean(
                                msg?.id && (
                                    (msg?.sender && username && msg.sender === username) ||
                                    canModerateChannel
                                )
                            );
                            const canEdit = Boolean(msg?.sender && username && msg.sender === username && msg.id);
                            const canRetry = msg.status === 'failed' && msg.clientId;
                            const isMatched = isMatchMessage(msg, searchMatchSet);
                            return (
                                <MessageItem
                                    key={msg.id || msg.clientId}
                                    msg={msg}
                                    grouped={entry.grouped}
                                    encryptionPassphrase={encryptionPassphrase}
                                    decryptCacheRef={decryptCacheRef}
                                    canDelete={canDelete}
                                    canEdit={canEdit}
                                    canRetry={canRetry}
                                    isMatched={isMatched}
                                    currentMatchId={currentMatchId}
                                    searchQuery={searchQuery}
                                    isSelected={selectedMessageId === (msg.id || msg.clientId)}
                                    onToggleSelect={() => {
                                        const id = msg.id || msg.clientId;
                                        setSelectedMessageId((prev) => (prev === id ? null : id));
                                    }}
                                    onClose={() => setSelectedMessageId(null)}
                                    onDelete={() => requestDeleteSingleMessage(msg.id)}
                                    onEdit={(nextText) => handleEditMessage(msg, nextText)}
                                    onReply={(plainText) => handleReplyToMessage(msg, plainText)}
                                    onCopy={handleCopyMessage}
                                    onCopyEncrypted={handleCopyEncrypted}
                                    onRetry={() => retryPendingMessage(msg.clientId)}
                                />
                            );
                        })}

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
                        {replyTarget && (
                            <div className="reply-preview">
                                <div>
                                    Replying to <strong>{replyTarget.sender}</strong>: {replyTarget.snippet}
                                </div>
                                <button type="button" className="mini-btn" onClick={() => setReplyTarget(null)}>Cancel</button>
                            </div>
                        )}
                        <form className="chat-input-form" onSubmit={handleSend}>
                            <input
                                ref={chatInputRef}
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

                {showMembersPane && combinedMessages.length > 0 && (
                    <aside className="channel-members-pane">
                        <div className="channel-members-pane-title">
                            Members in #{displayChannelName} - {uniqueActiveMembers.length}
                        </div>
                        <div className="channel-members-pane-list">
                            {uniqueActiveMembers.map((member) => (
                                <div key={member.id || member.username} className="channel-member-row">
                                    <span className="channel-member-dot" />
                                    <span>{member.username}</span>
                                    {member.role && <span className="channel-member-role">{member.role}</span>}
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
            {pendingDeleteMessageId && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <h2>Delete Message?</h2>
                        <p>This message will be permanently removed from this channel.</p>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="modal-btn modal-btn-secondary"
                                onClick={() => setPendingDeleteMessageId(null)}
                                disabled={isDeletingMessage}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="modal-btn modal-btn-danger"
                                onClick={handleDeleteSingleMessage}
                                disabled={isDeletingMessage}
                            >
                                {isDeletingMessage ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const highlightMatches = (text, query) => {
    if (!query.trim()) return text;
    const parts = String(text).split(new RegExp(`(${escapeRegex(query)})`, 'ig'));
    return parts.map((part, index) => (
        part.toLowerCase() === query.toLowerCase()
            ? <mark key={`m-${index}`}>{part}</mark>
            : <React.Fragment key={`t-${index}`}>{part}</React.Fragment>
    ));
};

const MessageItem = ({
    msg,
    grouped,
    encryptionPassphrase,
    decryptCacheRef,
    canDelete,
    canEdit,
    canRetry,
    isMatched,
    currentMatchId,
    searchQuery,
    isSelected,
    onToggleSelect,
    onClose,
    onDelete,
    onEdit,
    onReply,
    onCopy,
    onCopyEncrypted,
    onRetry
}) => {
    const [decryptedText, setDecryptedText] = useState('');
    const [decryptFailed, setDecryptFailed] = useState(false);
    const [showEncrypted, setShowEncrypted] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editDraft, setEditDraft] = useState('');
    const menuRef = useRef(null);

    useEffect(() => {
        if (!isSelected) return;
        const firstAction = menuRef.current?.querySelector('button');
        firstAction?.focus();
    }, [isSelected]);

    useEffect(() => {
        if (msg.plaintext) {
            setDecryptFailed(false);
            setDecryptedText(msg.plaintext);
            return;
        }

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
                    const plainEmoji = emojiDecrypt(msg.encryptedText || '');
                    cache?.set(cacheKey, { text: plainEmoji, decryptFailed: false });
                    applyState(plainEmoji, false);
                    return;
                }

                const plain = await blockDecrypt(msg.encryptedText || '', encryptionPassphrase);
                cache?.set(cacheKey, { text: plain, decryptFailed: false });
                applyState(plain, false);
            } catch {
                const errorText = 'Encrypted message. Enter the passphrase to view this message.';
                cache?.set(cacheKey, { text: errorText, decryptFailed: true });
                applyState(errorText, true);
            }
        };

        decryptMessage();
        return () => {
            isMounted = false;
        };
    }, [msg, encryptionPassphrase, decryptCacheRef]);

    const isCurrentMatch = (msg.clientId || msg.id) === currentMatchId;

    return (
        <div
            className={`msg-group${grouped ? ' grouped' : ''}${isMatched ? ' matched' : ''}${isCurrentMatch ? ' match-focus' : ''}${isSelected ? ' menu-open' : ''}`}
            data-message-id={msg.clientId || msg.id}
        >
            {!grouped ? (
                <div className="msg-avatar" style={{ background: getStringColor(msg.sender || '?') }}>
                    {(msg.sender || '?').charAt(0).toUpperCase()}
                </div>
            ) : (
                <div className="msg-avatar-gap" />
            )}
            <div className="msg-content">
                <button
                    type="button"
                    className="msg-kebab-btn"
                    title="Message options"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect();
                    }}
                >
                    ⋯
                </button>
                {!grouped && (
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
                        {msg.editedAt && <span className="msg-edited">edited</span>}
                        {msg.status && <span className={`msg-status msg-status-${msg.status}`}>{msg.status}</span>}
                    </div>
                )}

                {msg.replyTo && (
                    <div className="reply-pill">
                        Reply to <strong>{msg.replyTo.sender}</strong>: {msg.replyTo.snippet}
                    </div>
                )}

                {isEditing ? (
                    <div className="edit-row">
                        <textarea
                            className="edit-input"
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                        />
                        <div className="edit-actions">
                            <button
                                type="button"
                                className="mini-btn"
                                onClick={() => {
                                    const value = editDraft.trim();
                                    if (!value) return;
                                    onEdit(value);
                                    setIsEditing(false);
                                }}
                            >
                                Save
                            </button>
                            <button type="button" className="mini-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="msg-text">
                        {highlightMatches(decryptedText, searchQuery)}
                    </div>
                )}

                {isSelected && (
                    <div
                        ref={menuRef}
                        className="msg-menu-card"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                e.stopPropagation();
                                onClose();
                            }
                        }}
                    >
                        <button
                            type="button"
                            className="msg-menu-item"
                            onClick={() => setShowEncrypted((prev) => !prev)}
                        >
                            {showEncrypted ? 'Hide Encrypted' : 'Show Encrypted'}
                        </button>
                        <button type="button" className="msg-menu-item" onClick={() => onCopyEncrypted(msg.encryptedText)}>
                            Copy Encrypted
                        </button>
                        {!decryptFailed && (
                            <button type="button" className="msg-menu-item" onClick={() => onReply(decryptedText)}>Reply</button>
                        )}
                        {!decryptFailed && (
                            <button type="button" className="msg-menu-item" onClick={() => onCopy(decryptedText)}>Copy</button>
                        )}
                        {canEdit && !decryptFailed && (
                            <button
                                type="button"
                                className="msg-menu-item"
                                onClick={() => {
                                    setEditDraft(decryptedText);
                                    setIsEditing(true);
                                }}
                            >
                                Edit
                            </button>
                        )}
                        {canRetry && (
                            <button type="button" className="msg-menu-item" onClick={onRetry}>
                                Retry
                            </button>
                        )}
                        {canDelete && (
                            <button type="button" className="msg-menu-item danger" onClick={onDelete}>
                                Delete
                            </button>
                        )}
                    </div>
                )}

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
