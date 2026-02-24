import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { setData, deleteData, onData, dbInitError } from './db.js';
import CHANNELS from './channels.js';
import Sidebar from './Sidebar.js';
import Chat from './Chat.js';

const DEFAULT_JOINED_CHANNELS = new Set(['general', 'secret', 'dev', 'random']);
const PROTECTED_CHANNEL_ID = 'general';
const PRESENCE_TTL_MS = 45_000;
const PRESENCE_HEARTBEAT_MS = 15_000;

const MODALS = {
    NONE: 'none',
    CREATE: 'create',
    PASSWORD: 'password',
    EXPLORE: 'explore',
    SETTINGS: 'settings',
    ABOUT: 'about',
    DELETE: 'delete'
};

const bytesToHex = (bytes) => Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const formatFingerprint = (hex) => {
    const compact = (hex || '').toUpperCase().slice(0, 32);
    return compact.match(/.{1,4}/g)?.join('-') || '';
};

const generateChannelFingerprint = async (channelId) => {
    const seed = `cipherchat-public:${channelId}`;
    if (!crypto?.subtle) {
        return formatFingerprint(btoa(seed).replace(/[^A-Z0-9]/gi, '').slice(0, 32));
    }
    const data = new TextEncoder().encode(seed);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return formatFingerprint(bytesToHex(new Uint8Array(digest)));
};

const normalizeMemberKey = (username, sessionId) => {
    const cleanName = (username || 'user').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user';
    return `${cleanName}-${sessionId}`;
};

const getChannelRole = (channel, username) => {
    if (!channel || !username) return 'member';
    if (channel.owner && channel.owner === username) return 'owner';
    if (Array.isArray(channel.admins) && channel.admins.includes(username)) return 'admin';
    if (channel.owner === 'system') return 'admin';

    // Backward compatibility for legacy channels created before role metadata.
    if (!channel.owner && (!Array.isArray(channel.admins) || channel.admins.length === 0)) {
        return 'admin';
    }

    return 'member';
};

const normalizeChannelPayload = async (channel, usernameForOwner = 'system') => {
    const isPrivate = Boolean(channel.isPrivate);
    const fingerprint = isPrivate
        ? null
        : (channel.fingerprint || await generateChannelFingerprint(channel.id));

    return {
        ...channel,
        fingerprint,
        owner: channel.owner || usernameForOwner,
        admins: Array.isArray(channel.admins)
            ? channel.admins
            : (channel.owner ? [channel.owner] : []),
        updatedAt: Date.now()
    };
};

const App = () => {
    const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
    const [sessionMemberId] = useState(() => {
        const existing = sessionStorage.getItem('memberSessionId');
        if (existing) return existing;
        const created = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem('memberSessionId', created);
        return created;
    });
    const [encryptionPassphrase, setEncryptionPassphrase] = useState(
        () => sessionStorage.getItem('encryptionPassphrase') || ''
    );
    const [showPrompt, setShowPrompt] = useState(!username);
    const [channels, setChannels] = useState([]);
    const [activeMembers, setActiveMembers] = useState([]);
    const [joinedChannelIds, setJoinedChannelIds] = useState(() => new Set(DEFAULT_JOINED_CHANNELS));
    const [unlockedChannels, setUnlockedChannels] = useState(new Set());
    const [activeChannel, setActiveChannel] = useState(null);
    const [currentMemberKey, setCurrentMemberKey] = useState(null);
    const [currentMemberJoinedAt, setCurrentMemberJoinedAt] = useState(null);
    const [activeModal, setActiveModal] = useState(MODALS.NONE);
    const [pendingPrivateChannel, setPendingPrivateChannel] = useState(null);
    const [modalSource, setModalSource] = useState('sidebar');
    const [exploreSearchQuery, setExploreSearchQuery] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [createError, setCreateError] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [createChannelPrivate, setCreateChannelPrivate] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState(null);

    useEffect(() => {
        const unsubscribe = onData('channels', async (data) => {
            if (!data || Object.keys(data).length === 0) {
                const seededChannels = await Promise.all(
                    CHANNELS.map(async (channel) => normalizeChannelPayload(channel, 'system'))
                );
                await Promise.all(
                    seededChannels.map((channel) => setData(`channels/${channel.id}`, channel))
                );
                return;
            }

            if (data['file-crypto']) {
                await Promise.all([
                    deleteData('channels/file-crypto'),
                    deleteData('messages/file-crypto'),
                    deleteData('members/file-crypto')
                ]);
                return;
            }

            const missingDefaultChannels = CHANNELS.filter((channel) => !data[channel.id]);
            if (missingDefaultChannels.length) {
                await Promise.all(
                    missingDefaultChannels.map(async (channel) => {
                        const normalized = await normalizeChannelPayload(channel, 'system');
                        return setData(`channels/${channel.id}`, normalized);
                    })
                );
                return;
            }

            const legacyEntries = Object.entries(data).filter(([key, value]) => value?.id && value.id !== key);
            if (legacyEntries.length) {
                await Promise.all(
                    legacyEntries.flatMap(([legacyKey, value]) => [
                        setData(`channels/${value.id}`, {
                            ...value,
                            id: value.id
                        }),
                        deleteData(`channels/${legacyKey}`)
                    ])
                );
                return;
            }

            const missingMetadata = Object.entries(data).filter(([, value]) => {
                if (!value) return false;
                const needsFingerprint = !value.isPrivate && !value.fingerprint;
                const needsOwner = !value.owner;
                const needsAdmins = !Array.isArray(value.admins);
                return needsFingerprint || needsOwner || needsAdmins;
            });

            if (missingMetadata.length) {
                await Promise.all(
                    missingMetadata.map(async ([key, value]) => {
                        const normalized = await normalizeChannelPayload({ ...value, id: key }, value.owner || 'system');
                        return setData(`channels/${key}`, normalized);
                    })
                );
                return;
            }

            const channelList = Object.entries(data).map(([key, value]) => ({
                ...value,
                id: key
            }));
            channelList.sort((a, b) => a.name.localeCompare(b.name));
            setChannels(channelList);
        });

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    const activeChannelData = useMemo(
        () => channels.find((channel) => channel.id === activeChannel) || null,
        [channels, activeChannel]
    );

    const activeChannelRole = useMemo(
        () => getChannelRole(activeChannelData, username),
        [activeChannelData, username]
    );

    const canModerateChannel = useMemo(
        () => activeChannelRole === 'owner' || activeChannelRole === 'admin',
        [activeChannelRole]
    );

    const canDeleteChannel = useMemo(
        () => Boolean(activeChannelData && activeChannelData.id !== PROTECTED_CHANNEL_ID && activeChannelRole === 'owner'),
        [activeChannelData, activeChannelRole]
    );

    useEffect(() => {
        if (!activeChannel) {
            setActiveMembers([]);
            return undefined;
        }

        const unsubscribe = onData(`members/${activeChannel}`, (data) => {
            if (!data) {
                setActiveMembers([]);
                return;
            }

            const now = Date.now();
            const staleKeys = [];
            const latestByUser = new Map();

            Object.entries(data).forEach(([key, value]) => {
                if (!value?.username) return;
                const lastSeen = value.lastSeen || value.joinedAt || 0;
                if (!lastSeen || (now - lastSeen) > PRESENCE_TTL_MS) {
                    staleKeys.push(key);
                    return;
                }

                const previous = latestByUser.get(value.username);
                if (!previous || (previous.lastSeen || 0) < lastSeen) {
                    latestByUser.set(value.username, {
                        ...value,
                        id: key,
                        lastSeen
                    });
                }
            });

            if (staleKeys.length) {
                Promise.all(staleKeys.map((key) => deleteData(`members/${activeChannel}/${key}`))).catch(() => {});
            }

            const membersList = Array.from(latestByUser.values())
                .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));

            setActiveMembers(membersList);
        });

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [activeChannel]);

    useEffect(() => {
        const cleanup = () => {
            if (!currentMemberKey || !activeChannel) return;
            deleteData(`members/${activeChannel}/${currentMemberKey}`).catch(() => {});
        };

        window.addEventListener('beforeunload', cleanup);
        return () => {
            window.removeEventListener('beforeunload', cleanup);
        };
    }, [currentMemberKey, activeChannel]);

    useEffect(() => {
        if (!activeChannel || !currentMemberKey || !username) return undefined;

        const heartbeat = () => {
            const role = getChannelRole(
                channels.find((channel) => channel.id === activeChannel),
                username
            );
            setData(`members/${activeChannel}/${currentMemberKey}`, {
                channelId: activeChannel,
                username,
                role,
                joinedAt: currentMemberJoinedAt || Date.now(),
                lastSeen: Date.now()
            }).catch(() => {});
        };

        heartbeat();
        const interval = setInterval(heartbeat, PRESENCE_HEARTBEAT_MS);
        return () => clearInterval(interval);
    }, [activeChannel, currentMemberKey, username, channels, currentMemberJoinedAt]);

    const joinChannelInternal = async (channel, source = 'sidebar') => {
        if (!channel?.id) return;
        const channelId = channel.id;
        setJoinedChannelIds((prev) => new Set(prev).add(channelId));

        if (currentMemberKey && activeChannel) {
            try {
                await deleteData(`members/${activeChannel}/${currentMemberKey}`);
            } catch (err) {
                console.warn('Member cleanup error:', err.message);
            }
        }

        const memberKey = normalizeMemberKey(username, sessionMemberId);
        const joinedAt = Date.now();

        try {
            await setData(`members/${channelId}/${memberKey}`, {
                channelId,
                username,
                role: getChannelRole(channel, username),
                joinedAt,
                lastSeen: joinedAt,
                source
            });
            setCurrentMemberKey(memberKey);
            setCurrentMemberJoinedAt(joinedAt);
        } catch (err) {
            console.warn('Member join error:', err.message);
        }

        setActiveChannel(channelId);
    };

    const handleJoinChannel = (channel, source = 'sidebar') => {
        if (channel.id === activeChannel) {
            setActiveModal(MODALS.NONE);
            return;
        }

        if (channel.isPrivate && !unlockedChannels.has(channel.id)) {
            setPendingPrivateChannel(channel);
            setModalSource(source);
            setPasswordError('');
            setActiveModal(MODALS.PASSWORD);
            return;
        }

        joinChannelInternal(channel, source);
        setActiveModal(MODALS.NONE);
    };

    const handleUsernameSubmit = (e) => {
        e.preventDefault();
        const name = e.target.elements.username.value.trim();
        const passphrase = e.target.elements.encryptionPassphrase.value.trim();
        if (!name) return;

        localStorage.setItem('username', name);
        sessionStorage.setItem('encryptionPassphrase', passphrase);
        setUsername(name);
        setEncryptionPassphrase(passphrase);
        setShowPrompt(false);
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        const entered = e.target.elements.password.value;
        if (pendingPrivateChannel && entered === pendingPrivateChannel.password) {
            setUnlockedChannels((prev) => new Set(prev).add(pendingPrivateChannel.id));
            joinChannelInternal(pendingPrivateChannel, modalSource);
            setPendingPrivateChannel(null);
            setPasswordError('');
            setActiveModal(MODALS.NONE);
        } else {
            setPasswordError('Incorrect password');
        }
    };

    const handleCreateChannelSubmit = async (e) => {
        e.preventDefault();
        const channelId = e.target.elements.channelName.value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '');
        const description = e.target.elements.channelDesc.value.trim();
        const password = e.target.elements.channelPassword?.value || '';

        if (!channelId) return;
        if (channels.some((channel) => channel.id === channelId)) {
            setCreateError('A channel with that name already exists.');
            return;
        }

        try {
            const fingerprint = createChannelPrivate
                ? null
                : await generateChannelFingerprint(channelId);
            await setData(`channels/${channelId}`, {
                id: channelId,
                name: channelId,
                description,
                isPrivate: createChannelPrivate,
                password: createChannelPrivate ? password : null,
                fingerprint,
                owner: username,
                admins: [username],
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            setActiveModal(MODALS.NONE);
            setCreateError('');
            setCreateChannelPrivate(false);
        } catch (err) {
            setCreateError('Could not create the channel. Try again.');
            console.warn('Error creating channel:', err.message);
        }
    };

    const handlePassphraseSave = (e) => {
        e.preventDefault();
        const value = e.target.elements.encryptionPassphrase.value.trim();
        sessionStorage.setItem('encryptionPassphrase', value);
        setEncryptionPassphrase(value);
        setActiveModal(MODALS.NONE);
    };

    const closePasswordModal = () => {
        setPasswordError('');
        setPendingPrivateChannel(null);
        if (modalSource === 'explore') {
            setActiveModal(MODALS.EXPLORE);
        } else {
            setActiveModal(MODALS.NONE);
        }
    };

    const openAboutChannel = () => {
        if (!activeChannelData) return;
        setSelectedChannel(activeChannelData);
        setDeleteError('');
        setActiveModal(MODALS.ABOUT);
    };

    const requestDeleteChannel = (channel = activeChannelData) => {
        if (!channel) return;
        const role = getChannelRole(channel, username);
        const allowed = channel.id !== PROTECTED_CHANNEL_ID && role === 'owner';
        if (!allowed) {
            setDeleteError('Only channel owners can delete channels.');
            return;
        }
        setSelectedChannel(channel);
        setDeleteError('');
        setActiveModal(MODALS.DELETE);
    };

    const handleDeleteChannel = async () => {
        if (!selectedChannel) {
            setActiveModal(MODALS.NONE);
            return;
        }

        const role = getChannelRole(selectedChannel, username);
        if (selectedChannel.id === PROTECTED_CHANNEL_ID || role !== 'owner') {
            setDeleteError('Only owners can delete non-protected channels.');
            return;
        }

        const deletingId = selectedChannel.id;
        try {
            await Promise.all([
                deleteData(`channels/${deletingId}`),
                deleteData(`messages/${deletingId}`),
                deleteData(`members/${deletingId}`)
            ]);

            setJoinedChannelIds((prev) => {
                const next = new Set(prev);
                next.delete(deletingId);
                next.add(PROTECTED_CHANNEL_ID);
                return next;
            });
            setUnlockedChannels((prev) => {
                const next = new Set(prev);
                next.delete(deletingId);
                return next;
            });

            if (activeChannel === deletingId) {
                const fallback = channels.find((channel) => channel.id === PROTECTED_CHANNEL_ID);
                if (fallback) {
                    await joinChannelInternal(fallback, 'fallback');
                }
            }

            setSelectedChannel(null);
            setDeleteError('');
            setActiveModal(MODALS.NONE);
        } catch (err) {
            setDeleteError('Could not delete this channel right now.');
            console.warn('Error deleting channel:', err.message);
        }
    };

    if (dbInitError) {
        return (
            <div className="app-layout">
                <div className="chat-area" style={{ display: 'grid', placeItems: 'center' }}>
                    <div className="modal-card" style={{ maxWidth: 640 }}>
                        <h2>Firebase Configuration Needed</h2>
                        <p>{dbInitError}</p>
                        <p>
                            Put your env file at <strong>cipherchat/.env</strong> (not <code>cipherchat/src/.env</code>)
                            and restart the dev server.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar
                channels={channels.filter((channel) => joinedChannelIds.has(channel.id))}
                activeChannel={activeChannel}
                onJoin={handleJoinChannel}
                username={username}
                onCreateChannelClick={() => {
                    setCreateError('');
                    setActiveModal(MODALS.CREATE);
                }}
                onExploreClick={() => {
                    setExploreSearchQuery('');
                    setActiveModal(MODALS.EXPLORE);
                }}
                onSettingsClick={() => setActiveModal(MODALS.SETTINGS)}
            />

            <Chat
                username={username}
                channel={activeChannelData}
                activeMembers={activeMembers}
                encryptionPassphrase={encryptionPassphrase}
                onAboutChannel={openAboutChannel}
                onRequestDeleteChannel={() => requestDeleteChannel(activeChannelData)}
                canDeleteChannel={canDeleteChannel}
                canModerateChannel={canModerateChannel}
                channelRole={activeChannelRole}
            />

            {showPrompt && (
                <div className="modal-overlay">
                    <form className="modal-card" onSubmit={handleUsernameSubmit}>
                        <h2>Welcome to CipherChat</h2>
                        <p>Pick a username and an optional AES passphrase.</p>
                        <input
                            className="modal-input"
                            name="username"
                            placeholder="Display name"
                            required
                            autoFocus
                        />
                        <input
                            className="modal-input"
                            name="encryptionPassphrase"
                            placeholder="Shared encryption passphrase (optional)"
                            type="password"
                        />
                        <button type="submit" className="modal-btn">
                            Enter Workspace
                        </button>
                    </form>
                </div>
            )}

            {activeModal === MODALS.CREATE && (
                <div className="modal-overlay">
                    <form className="modal-card" onSubmit={handleCreateChannelSubmit}>
                        <h2>Create Channel</h2>
                        <p>New channels are stored using their stable ID.</p>
                        <input
                            className="modal-input"
                            name="channelName"
                            placeholder="Channel ID (e.g. product-updates)"
                            required
                            autoFocus
                        />
                        <input
                            className="modal-input"
                            name="channelDesc"
                            placeholder="Short description"
                            required
                        />
                        <label className="modal-switch-row">
                            <input
                                type="checkbox"
                                name="isPrivate"
                                className="modal-switch-input"
                                checked={createChannelPrivate}
                                onChange={(e) => setCreateChannelPrivate(e.target.checked)}
                            />
                            <span className="modal-switch-slider" />
                            <span className="modal-switch-text">
                                Private channel
                                <small>Password required to join</small>
                            </span>
                        </label>
                        {createChannelPrivate && (
                            <input
                                type="password"
                                className="modal-input"
                                name="channelPassword"
                                placeholder="Channel password"
                                required
                            />
                        )}
                        {createError && <p className="modal-error">{createError}</p>}
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="modal-btn modal-btn-secondary"
                                onClick={() => {
                                    setActiveModal(MODALS.NONE);
                                    setCreateError('');
                                    setCreateChannelPrivate(false);
                                }}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="modal-btn">
                                Create
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeModal === MODALS.PASSWORD && pendingPrivateChannel && (
                <div className="modal-overlay">
                    <form className="modal-card" onSubmit={handlePasswordSubmit}>
                        <h2>Private Channel</h2>
                        <p>
                            Enter password for <strong>#{pendingPrivateChannel.name}</strong>.
                        </p>
                        {passwordError && <p className="modal-error">{passwordError}</p>}
                        <input
                            type="password"
                            className="modal-input"
                            name="password"
                            placeholder="Channel password"
                            required
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="modal-btn modal-btn-secondary"
                                onClick={closePasswordModal}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="modal-btn">
                                Join
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeModal === MODALS.EXPLORE && (
                <div
                    className="modal-overlay"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setActiveModal(MODALS.NONE);
                    }}
                >
                    <div className="modal-card modal-wide">
                        <h2 className="modal-title-left">Explore Channels</h2>
                        <input
                            className="explore-search"
                            placeholder="Search channels..."
                            value={exploreSearchQuery}
                            onChange={(e) => setExploreSearchQuery(e.target.value)}
                            autoFocus
                        />
                        <div className="explore-modal-list">
                            {channels
                                .filter((channel) =>
                                    channel.name.toLowerCase().includes(exploreSearchQuery.toLowerCase())
                                )
                                .map((channel) => (
                                    <button
                                        type="button"
                                        key={channel.id}
                                        className="explore-modal-item"
                                        onClick={() => {
                                            handleJoinChannel(channel, 'explore');
                                        }}
                                    >
                                        <span className="explore-modal-item-name">
                                            #{channel.name}
                                            {channel.isPrivate && (
                                                <span className="private-icon" title="Private Channel">🔒</span>
                                            )}
                                        </span>
                                        <span>{channel.description || 'No description'}</span>
                                    </button>
                                ))}
                        </div>
                        <button
                            type="button"
                            className="modal-btn modal-btn-secondary"
                            onClick={() => setActiveModal(MODALS.NONE)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {activeModal === MODALS.SETTINGS && (
                <div className="modal-overlay">
                    <form className="modal-card" onSubmit={handlePassphraseSave}>
                        <h2>Security Settings</h2>
                        <p>
                            This passphrase is only kept in your current browser session.
                        </p>
                        <input
                            className="modal-input"
                            name="encryptionPassphrase"
                            type="password"
                            placeholder="Shared encryption passphrase"
                            defaultValue={encryptionPassphrase}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="modal-btn modal-btn-secondary"
                                onClick={() => setActiveModal(MODALS.NONE)}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="modal-btn">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeModal === MODALS.ABOUT && selectedChannel && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <h2>About #{selectedChannel.name}</h2>
                        <p>{selectedChannel.description || 'No description provided.'}</p>
                        <p>
                            Type: <strong>{selectedChannel.isPrivate ? 'Private' : 'Public'}</strong>
                        </p>
                        <p>
                            Status: <strong>{selectedChannel.id === PROTECTED_CHANNEL_ID ? 'Default / Protected' : 'Standard'}</strong>
                        </p>
                        <p>
                            Owner: <strong>{selectedChannel.owner || 'system'}</strong>
                        </p>
                        <p>
                            Your role: <strong>{getChannelRole(selectedChannel, username)}</strong>
                        </p>
                        {!selectedChannel.isPrivate && selectedChannel.fingerprint && (
                            <p>
                                Public channel fingerprint:
                                <strong> {selectedChannel.fingerprint}</strong>
                            </p>
                        )}
                        {deleteError && <p className="modal-error">{deleteError}</p>}
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="modal-btn modal-btn-secondary"
                                onClick={() => {
                                    setSelectedChannel(null);
                                    setDeleteError('');
                                    setActiveModal(MODALS.NONE);
                                }}
                            >
                                Close
                            </button>
                            {selectedChannel.id !== PROTECTED_CHANNEL_ID && getChannelRole(selectedChannel, username) === 'owner' ? (
                                <button
                                    type="button"
                                    className="modal-btn modal-btn-danger"
                                    onClick={() => requestDeleteChannel(selectedChannel)}
                                >
                                    Delete Channel
                                </button>
                            ) : (
                                <button type="button" className="modal-btn modal-btn-secondary" disabled>
                                    Owner Only
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeModal === MODALS.DELETE && selectedChannel && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <h2>Delete #{selectedChannel.name}?</h2>
                        <p>
                            This permanently removes the channel, all messages, and member presence data.
                        </p>
                        {deleteError && <p className="modal-error">{deleteError}</p>}
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="modal-btn modal-btn-secondary"
                                onClick={() => {
                                    setDeleteError('');
                                    setActiveModal(MODALS.ABOUT);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="modal-btn modal-btn-danger"
                                onClick={handleDeleteChannel}
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
