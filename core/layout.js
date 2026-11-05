/**
 * Alptuguide Studio — 1:1 Verified Platform UI Layouts (1080 × 1920 Reference Canvas)
 * Copyright (c) 2026 Alptuğ Dağ (@alptugdag). All rights reserved.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (typeof window !== 'undefined') window.ReelsLayout = api;
    else if (root) root.ReelsLayout = api;
}(typeof self !== 'undefined' ? self : this, function () {
    // 24x24 viewBox vector icon paths
    var icons = {
        heart: ['M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5'],
        'message-circle': ['M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719'],
        send: ['M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z', 'm21.854 2.147-10.94 10.939'],
        bookmark: ['M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z'],
        'repeat-2': ['m2 9 3-3 3 3', 'M13 18H7a2 2 0 0 1-2-2V6', 'm22 15-3 3-3-3', 'M11 6h6a2 2 0 0 1 2 2v10'],
        'ellipsis-vertical': ['M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0z', 'M13 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z', 'M13 19a1 1 0 1 1-2 0 1 1 0 0 1 2 0z'],
        'ellipsis-horizontal': ['M12 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2z', 'M5 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2z', 'M19 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2z'],
        camera: ['M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z', 'M15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'],
        music: ['M9 18V5l12-2v13', 'M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', 'M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'],
        'badge-check': ['M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z', 'm16 9-5.5 5.5L8 12'],
        'thumbs-up': ['M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z', 'M7 10v12'],
        'thumbs-down': ['M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z', 'M17 14V2'],
        search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'm21 21-4.35-4.35'],
        home: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
        plus: ['M12 5v14', 'M5 12h14'],
        clapper: ['M4 4h16v16H4z', 'm4 8 16 0', 'm8 4 2 4', 'm14 4 2 4'],
        user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z']
    };

    var platforms = {
        reels: {
            id: 'reels',
            name: 'Instagram Reels',
            navBarY: 1810,
            gradients: {
                bottom: { y0: 1120, y1: 1810, a0: 0, a1: 0.68 },
                top: { y0: 0, y1: 270, a0: 0.42, a1: 0 }
            },
            header: { title: 'Reels', size: 54, weight: 700, x: 48, cy: 156, camera: { cx: 1004, cy: 156, size: 60 } },
            colX: 1004,
            actions: [
                { id: 'like', icon: 'heart', size: 68, cy: 1085, countCy: 1150, key: 'likes' },
                { id: 'comment', icon: 'message-circle', size: 68, cy: 1230, countCy: 1295, key: 'comments' },
                { id: 'share', icon: 'send', size: 66, cy: 1375, countCy: 1440, key: 'shares' },
                { id: 'bookmark', icon: 'bookmark', size: 66, cy: 1520, countCy: 1585, key: 'saves' }
            ],
            dots: { icon: 'ellipsis-horizontal', size: 58, cy: 1655 },
            audioThumb: { size: 64, radius: 14, cy: 1748 },
            avatar: { d: 76, x: 48 },
            username: { size: 34, weight: 600, x: 142 },
            verified: { size: 30 },
            follow: { gap: 18, text: 'Takip Et' },
            caption: { size: 32, weight: 400, x: 48, lineH: 44, maxWidth: 850, maxLines: 2 },
            audio: { icon: 'music', iconSize: 30, iconX: 48, textX: 92, cy: 1756, size: 28, weight: 500 }
        },
        tiktok: {
            id: 'tiktok',
            name: 'TikTok',
            navBarY: 1758,
            gradients: {
                bottom: { y0: 1060, y1: 1758, a0: 0, a1: 0.72 },
                top: { y0: 0, y1: 252, a0: 0.42, a1: 0 }
            },
            header: { tabs: ['Takip Edilenler', 'Sizin İçin'], cy: 152, search: { cx: 1002, cy: 152, size: 56 } },
            colX: 988,
            avatarRight: { d: 96, cx: 988, cy: 865 },
            actions: [
                { id: 'like', icon: 'heart', size: 72, cy: 1035, countCy: 1102, key: 'likes' },
                { id: 'comment', icon: 'message-circle', size: 72, cy: 1185, countCy: 1252, key: 'comments' },
                { id: 'bookmark', icon: 'bookmark', size: 70, cy: 1335, countCy: 1402, key: 'saves' },
                { id: 'repost', icon: 'repeat-2', size: 70, cy: 1485, countCy: 1552, key: 'shares' }
            ],
            disc: { size: 86, cx: 988, cy: 1665 },
            username: { size: 36, weight: 700, x: 48, prefix: '@' },
            verified: { size: 30 },
            caption: { size: 31, weight: 400, x: 48, lineH: 42, maxWidth: 816, maxLines: 3 },
            audio: { icon: 'music', iconSize: 30, iconX: 48, textX: 92, cy: 1708, size: 28, weight: 500 }
        },
        shorts: {
            id: 'shorts',
            name: 'YouTube Shorts',
            navBarY: 1776,
            gradients: {
                bottom: { y0: 1080, y1: 1776, a0: 0, a1: 0.68 },
                top: { y0: 0, y1: 288, a0: 0.40, a1: 0 }
            },
            header: { search: { cx: 912, cy: 152, size: 56 }, more: { cx: 998, cy: 152, size: 56 } },
            colX: 984,
            actions: [
                { id: 'like', icon: 'thumbs-up', size: 66, cy: 970, countCy: 1035, key: 'likes' },
                { id: 'dislike', icon: 'thumbs-down', size: 66, cy: 1125, countCy: 1190, text: 'Beğenme' },
                { id: 'comment', icon: 'message-circle', size: 66, cy: 1280, countCy: 1345, key: 'comments' },
                { id: 'share', icon: 'send', size: 64, cy: 1435, countCy: 1500, text: 'Paylaş' },
                { id: 'remix', icon: 'repeat-2', size: 64, cy: 1585, countCy: 1648, text: 'Remix' }
            ],
            soundThumb: { size: 68, cx: 984, cy: 1718, radius: 12 },
            avatar: { d: 72, x: 48 },
            username: { size: 32, weight: 600, x: 136, prefix: '@' },
            verified: { size: 28 },
            subscribe: { gap: 18, text: 'Abone Ol', bg: '#ffffff', fg: '#0f0f0f' },
            caption: { size: 32, weight: 400, x: 48, lineH: 44, maxWidth: 816, maxLines: 2 },
            audio: { icon: 'music', iconSize: 30, iconX: 48, textX: 92, cy: 1724, size: 28, weight: 500 }
        }
    };

    function getLayout(platform) {
        return platforms[platform] || platforms.reels;
    }

    return {
        W: 1080,
        H: 1920,
        icons: icons,
        filledIcons: { 'ellipsis-vertical': true, 'ellipsis-horizontal': true },
        copyright: { text: 'Alptuguide™ · © Alptuğ Dağ', size: 18, weight: 600, x: 48, cy: 96 },
        platforms: platforms,
        getLayout: getLayout
    };
}));
