import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { pushData, setData, deleteData, onData, dbInitError } from './db.js';
import CHANNELS from './channels.js';
import Sidebar from './Sidebar.js';
import Chat from './Chat.js';

const DEFAULT_JOINED_CHANNELS = new Set(['general', 'secret', 'dev', 'random', 'file-crypto']);
const PROTECTED_CHANNEL_ID = 'file-crypto';
const MODALS = {
    NONE: 'none',
    CREATE: 'create',
    PASSWORD: 'password',
    EXPLORE: 'explore',
    SETTINGS: 'settings',
    ABOUT: 'about',
    DELETE: 'delete'
};

const App = () => {
    const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
    const [encryptionPassphrase, setEncryptionPassphrase] = useState(
        () => sessionStorage.getItem('encryptionPassphrase') || ''
    );
    const [showPrompt, setShowPrompt] = useState(!username);
    const [channels, setChannels] = useState([]);
    const [members, setMembers] = useState([]);
    const [joinedChannelIds, setJoinedChannelIds] = useState(() => new Set(DEFAULT_JOINED_CHANNELS));
    const [unlockedChannels, setUnlockedChannels] = useState(new Set());
    const [activeChannel, setActiveChannel] = useState(null);
    const [currentMemberKey, setCurrentMemberKey] = useState(null);
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
                await Promise.all(
                    CHANNELS.map((channel) => setData(`channels/${channel.id}`, channel))
                );
                return;
            }

            const missingDefaultChannels = CHANNELS.filter((channel) => !data[channel.id]);
            if (missingDefaultChannels.length) {
                await Promise.all(
                    missingDefaultChannels.map((channel) =>
                        setData(`channels/${channel.id}`, channel)
                    )
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

    useEffect(() => {
        if (!activeChannel) {
            setMembers([]);
            return undefined;
        }

        const unsubscribe = onData(`members/${activeChannel}`, (data) => {
            if (!data) {
                setMembers([]);
                return;
            }

            const membersList = Object.keys(data).map((key) => ({
                ...data[key],
                id: key
            }));
            setMembers(membersList);
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

    const joinChannelInternal = async (channelId) => {
        setJoinedChannelIds((prev) => new Set(prev).add(channelId));

        if (currentMemberKey && activeChannel) {
            try {
                await deleteData(`members/${activeChannel}/${currentMemberKey}`);
            } catch (err) {
                console.warn('Member cleanup error:', err.message);
            }
        }

        try {
            const newMemberRef = await pushData(`members/${channelId}`, {
                channelId,
                username,
                joinedAt: Date.now()
            });
            setCurrentMemberKey(newMemberRef.key);
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

        joinChannelInternal(channel.id);
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
            joinChannelInternal(pendingPrivateChannel.id);
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
            await setData(`channels/${channelId}`, {
                id: channelId,
                name: channelId,
                description,
                isPrivate: createChannelPrivate,
                password: createChannelPrivate ? password : null
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

    const activeChannelData = channels.find((channel) => channel.id === activeChannel) || null;

    const openAboutChannel = () => {
        if (!activeChannelData) return;
        setSelectedChannel(activeChannelData);
        setDeleteError('');
        setActiveModal(MODALS.ABOUT);
    };

    const requestDeleteChannel = (channel = activeChannelData) => {
        if (!channel || channel.id === PROTECTED_CHANNEL_ID) return;
        setSelectedChannel(channel);
        setDeleteError('');
        setActiveModal(MODALS.DELETE);
    };

    const handleDeleteChannel = async () => {
        if (!selectedChannel || selectedChannel.id === PROTECTED_CHANNEL_ID) {
            setActiveModal(MODALS.NONE);
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
                await joinChannelInternal(PROTECTED_CHANNEL_ID);
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
                members={members}
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
                encryptionPassphrase={encryptionPassphrase}
                onAboutChannel={openAboutChannel}
                onRequestDeleteChannel={() => requestDeleteChannel(activeChannelData)}
                canDeleteChannel={Boolean(activeChannelData && activeChannelData.id !== PROTECTED_CHANNEL_ID)}
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
                        <label className="modal-checkbox-row">
                            <input
                                type="checkbox"
                                name="isPrivate"
                                checked={createChannelPrivate}
                                onChange={(e) => setCreateChannelPrivate(e.target.checked)}
                            />
                            Private channel
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
                            Status: <strong>{selectedChannel.id === PROTECTED_CHANNEL_ID ? 'Pinned / Protected' : 'Standard'}</strong>
                        </p>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="modal-btn modal-btn-secondary"
                                onClick={() => {
                                    setSelectedChannel(null);
                                    setActiveModal(MODALS.NONE);
                                }}
                            >
                                Close
                            </button>
                            {selectedChannel.id !== PROTECTED_CHANNEL_ID ? (
                                <button
                                    type="button"
                                    className="modal-btn modal-btn-danger"
                                    onClick={() => requestDeleteChannel(selectedChannel)}
                                >
                                    Delete Channel
                                </button>
                            ) : (
                                <button type="button" className="modal-btn modal-btn-secondary" disabled>
                                    Protected Channel
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
