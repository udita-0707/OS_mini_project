// ============================================================
// Sidebar.js — Channel list + live members panel
// ============================================================
// Renders the left sidebar with:
//   • App brand header
//   • List of channels (with join/active state)
//   • Live "Members Online" list for the active channel
//   • Current user bar at the bottom
// ============================================================

import React from 'react';

const getStringColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 55%)`;
};

/**
 * Sidebar component
 * @param {Object[]} channels       – array from channels.js
 * @param {string|null} activeChannel – id of the channel the user is currently in
 * @param {Function} onJoin         – called with channelId when user clicks Join
 * @param {Object[]} members        – array of member records for the active channel
 * @param {string} username         – current user's display name
 * @param {Function} onCreateChannelClick – called when user clicks + to create channel
 * @param {Function} onExploreClick – called when user clicks Explore Channels
 */
const Sidebar = ({
    channels,
    activeChannel,
    onJoin,
    members,
    username,
    onCreateChannelClick,
    onExploreClick,
    onSettingsClick
}) => {
    // Deduplicate members by username so each person shows once
    const uniqueMembers = [];
    const seen = new Set();
    (members || []).forEach((m) => {
        if (!seen.has(m.username)) {
            seen.add(m.username);
            uniqueMembers.push(m);
        }
    });

    return (
        <div className="sidebar">
            {/* ---- Brand ---- */}
            <div className="sidebar-brand">
                <span className="brand-mark">CipherChat</span>
                <span className="brand-chip">secure</span>
            </div>

            {/* ---- Channel List ---- */}
            <div className="sidebar-section-header">
                <div className="sidebar-section-title">Channels</div>
                <button className="create-channel-btn" onClick={onCreateChannelClick} title="Create Channel">
                    +
                </button>
            </div>

            <ul className="channel-list">
                {channels.map((ch) => {
                    const isActive = ch.id === activeChannel;
                    return (
                        <li
                            key={ch.id}
                            className={`channel-item${isActive ? ' active' : ''}`}
                            onClick={() => onJoin(ch)}
                        >
                            <div className="channel-info">
                                <div className="channel-name">
                                    <span className="channel-icon">#</span>
                                    {ch.name}
                                    {ch.isPrivate && <span className="private-icon" title="Private Channel">🔒</span>}
                                </div>
                                <div className="channel-desc">{ch.description}</div>
                            </div>
                            <span className={`channel-state${isActive ? ' active' : ''}`}>
                                {isActive ? 'Active' : 'Open'}
                            </span>
                        </li>
                    );
                })}
            </ul>

            {/* ---- Explore Button ---- */}
            <div style={{ padding: '0 8px' }}>
                <button className="explore-btn" onClick={onExploreClick}>
                    🧭 Explore Channels
                </button>
            </div>

            {/* ---- Members Panel (only when a channel is active) ---- */}
            {activeChannel && (
                <div className="members-panel">
                    <div className="members-title">
                        Members Online — {uniqueMembers.length}
                    </div>
                    {uniqueMembers.map((m) => (
                        <div key={m.username} className="member-item">
                            <span className="member-dot" />
                            {m.username}
                        </div>
                    ))}
                </div>
            )}

            {/* ---- Current User Bar ---- */}
            {username && (
                <div className="user-bar">
                <div className="user-avatar" style={{ background: getStringColor(username) }}>
                    {username.charAt(0).toUpperCase()}
                </div>
                    <div className="user-info">
                        <div className="user-name">{username}</div>
                        <div className="user-discriminator">#{Math.abs(username.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)) % 10000}</div>
                    </div>
                    <button className="user-settings-icon" title="Security Settings" onClick={onSettingsClick}>
                        ⚙
                    </button>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
