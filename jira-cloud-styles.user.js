// ==UserScript==
// @name         JIRA Cloud Styles
// @namespace    https://qad.atlassian.net/
// @version      2026-11-07
// @description  try to take over the world!
// @author       yvasyl@softserveinc.com
// @match        https://qad.atlassian.net/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=atlassian.net
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    blockAtlassianRegistration();

    const start = () => {
        createStyles();
        addDevelopmentLogButton();
        showParentTicketSummary();
        addCopyTicketButton();
        fixBacklogCardVirtualization();
        highlightValidationFields();
        addCommitReviewsColumn();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    function blockAtlassianRegistration() {
        const blockedUrl = 'https://xp.atlassian.com/v1/rgstr';

        const isBlocked = (url) => String(url || '').indexOf(blockedUrl) !== -1;

        const emptyResponse = () => new Response('{}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

        if (typeof window.fetch === 'function' && !window.fetch.__userjsBlockRgstr) {
            const originalFetch = window.fetch;
            const patchedFetch = function(input) {
                const url = typeof input === 'string' ? input : (input && input.url) || '';
                if (isBlocked(url)) {
                    return Promise.resolve(emptyResponse());
                }
                return originalFetch.apply(this, arguments);
            };
            patchedFetch.__userjsBlockRgstr = true;
            window.fetch = patchedFetch;
        }

        if (XMLHttpRequest.prototype.open && !XMLHttpRequest.prototype.open.__userjsBlockRgstr) {
            const originalOpen = XMLHttpRequest.prototype.open;
            const originalSend = XMLHttpRequest.prototype.send;
            const patchedOpen = function(method, url) {
                this.__userjsBlockRgstr = isBlocked(url);
                return originalOpen.apply(this, arguments);
            };
            patchedOpen.__userjsBlockRgstr = true;
            XMLHttpRequest.prototype.open = patchedOpen;

            XMLHttpRequest.prototype.send = function(body) {
                if (this.__userjsBlockRgstr) {
                    const xhr = this;
                    setTimeout(() => {
                        xhr.dispatchEvent(new Event('load'));
                        xhr.dispatchEvent(new Event('loadend'));
                    }, 0);
                    return;
                }
                return originalSend.apply(this, arguments);
            };
        }

        if (navigator.sendBeacon && !navigator.sendBeacon.__userjsBlockRgstr) {
            const originalBeacon = navigator.sendBeacon.bind(navigator);
            const patchedBeacon = function(url, data) {
                if (isBlocked(url)) {
                    return true;
                }
                return originalBeacon(url, data);
            };
            patchedBeacon.__userjsBlockRgstr = true;
            navigator.sendBeacon = patchedBeacon;
        }
    }

    function createStyles() {
        document.head.insertAdjacentHTML('beforeend', `<style id="userjs">

            :root {
                --userjs-gap: 1rem;
                --userjs-gap-small: 0.2rem;
            }


            /* Board quick filters container - outer padding */
            [data-test-id="software-board.board"] > div > * {
                padding-inline: var(--userjs-gap-small) !important;
                padding-block: 0 !important;
            }
            /* Board quick filters container - bottom gap */
            [data-test-id="software-board.board"] > div > div > * {
                margin-block-end: 0 !important;
            }

            /* Board tickets container - horizontal padding */
            [data-testid="platform-board-kit.ui.board.scroll.board-scroll"] > section {
                padding-inline: var(--userjs-gap-small) !important;
            }

            /* Board Assignee filters */
            [data-testid="filters.ui.filters.assignee.stateless.assignee-filter"] > div {
                gap: 1rem;
            }

            /* HIDE BOARD ELEMENTS */
            #ak-project-view-navigation > div > div > div:has([aria-label="Breadcrumbs"]) {
                display: none;
            }

            /* Board tickets - vertical padding */
            #ak-project-view-navigation > div {
                padding-top: 0 !important;
            }
            [data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"] {
                padding: 0 !important;
            }
            [data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"] > div {
                padding: 0 !important;
                margin: 0 !important;
            }

            /* Story group header: icon, key, status, summary, subtasks, epic, assignee */
            [data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"] h3 > [data-testid="platform-card.common.ui.key.key"] {
                order: 1;
            }
            [data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"] h3 > div:has([data-testid="platform-board-kit.ui.swimlane.lozenge"]) {
                order: 2;
            }
            [data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"] h3 > div:has([data-testid="platform-board-kit.ui.swimlane.summary-section"]) {
                order: 3;
            }
            [data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"] h3 > div:not(:has(*)) {
                order: 4;
            }
            [data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"] h3 > [data-testid="platform-board-kit.ui.swimlane.epic.tag"] {
                order: 5;
            }
            [data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"] h3 > div:has([role="img"]) {
                order: 6;
            }


            /* Ticket popup window - full size */
            div[data-testid="issue.views.issue-details.issue-modal.modal-dialog--positioner"] {
                inset-block-start: var(--userjs-gap) !important;
                margin-inline: var(--userjs-gap) !important;
                max-width: calc(100vw - var(--userjs-gap) * 2) !important;
                height: calc(100svh - var(--userjs-gap) * 2) !important;
                max-height: calc(100svh - var(--userjs-gap) * 2) !important;
            }
            [data-testid="issue.views.issue-details.issue-modal.modal-dialog"] {
                width: 100% !important;
            }
            [data-testid="issue.views.issue-details.issue-modal.modal-dialog"] > div {
                height: calc(100svh - var(--userjs-gap) * 2) !important;
                max-height: calc(100svh - var(--userjs-gap) * 2) !important;
            }

            /* Ticket card footer: issue key on the first row, remaining fields on the second */
            [data-component-selector="platform-card.ui.card.card-content.content-section"] > div {
                grid-template-columns: minmax(0, 1fr) auto !important;
                grid-template-rows: auto auto !important;
                grid-template-areas: none !important;
                gap: 0;

                > div:first-child {
                    grid-area: 1 / 1 / 2 / span 2 !important;

                    [data-testid="platform-card.common.ui.key.key"] a > div {
                        font-size: 1rem;
                        padding-block: 0.4rem;
                        padding-right: 1rem;
                    }
                }

                > div:nth-child(2) {
                    grid-area: 2 / 1 !important;
                }

                > div:nth-child(3) {
                    grid-area: 2 / 2 !important;
                }
            }

            /* Ticket transition popup window - full size */
            div[data-testid="issue-transition.ui.issue-transition-modal--positioner"] {
                inset-block-start: var(--userjs-gap) !important;
            }
            [data-testid="issue-transition.ui.issue-transition-modal"] {
                width: calc(100vw - var(--userjs-gap) * 2) !important;
                max-width: calc(100vw - var(--userjs-gap) * 2) !important;
                height: calc(100svh - var(--userjs-gap) * 2) !important;
                max-height: calc(100svh - var(--userjs-gap) * 2) !important;
            }

            /* Ticket view - reduce header gaps */
            #jira-issue-header {
                padding-bottom: 0 !important;
            }
            [data-component-selector="jira.issue-view.issue-details.full-size-mode-column"] {
                padding-top: 0 !important;
            }
            #jira-issue-header-actions {
                padding-top: 1rem !important;
            }

            /* Ticket view - reduce inline gaps */
            #issue.views.issue-details.issue-layout.container-right {
                padding-left: 0 !important;
            }
            [data-component-selector="jira-issue-view-common-component-resize-handle"] {
                margin-inline: -8px !important;
            }
            [data-vc="pinned-context-items-body"] {
                padding-inline: 8px !important;
            }


            /* Fix chips for multi-select input */
            div[data-multi-value-tag-like="true"] {
                height: auto;
            }

            /* Fix chips for Create Sub-Tasks popup in multi-select input */
            [data-testid="issue-transition.ui.modal.field-renderer.field.customfield_10891"] {
                div[data-multi-value-tag-like="true"] {
                    height: auto;
                    min-width: 180px;
                }
            }


            /* CREATE REVIEW button */
            #userjs-development-log-button {
                margin-inline-end: 0.75rem;
                padding: 0.25rem 0.6rem;
                border: 1px solid currentColor;
                border-radius: 3px;
                background: transparent;
                color: inherit;
                cursor: pointer;
                font: inherit;
                font-size: 0.85rem;
                line-height: 1.4;
            }


            /* Extra Summary info */
            [data-component-selector="breadcrumbs-wrapper"]:has(~ #userjs-parent-summary) {
                flex: 0 0 auto;
            }
            #userjs-parent-summary {
                flex: 1 1 0;
                min-width: 0;
                font-size: 12px;
                opacity: 0.8;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* Hide Space breadcrumbs */
            [data-component-selector="breadcrumbs-wrapper"] {
                div:has(~ [data-testid="issue.views.issue-base.foundation.breadcrumbs.project.container"]) {
                    display: none;
                }
                [data-testid="issue.views.issue-base.foundation.breadcrumbs.project.container"] {
                    display: none;
                }
            }


            /* Date Calendar widget */
            [data-testid="issue.common.component.legacy-date-time.date-time-picker--datepicker--calendar--week"] > [role="gridcell"] > [aria-label*="Sunday"] {
                color: #ff00007a;
            }
            [data-testid="issue.common.component.legacy-date-time.date-time-picker--datepicker--calendar--week"] > [role="gridcell"] > [aria-label*="Saturday"] {
                color: #ff00007a;
            }


            /* Gap between fields in side panel */
            [data-testid="issue-view-product-templates-item-list.ui.sortable-item-list.droppable-container"] {
                row-gap: 0 !important;
            }
            [data-component-selector="jira-issue-field-heading-field-wrapper"] {
                border-bottom: 1px dashed #7e818896;
            }


            /* Copy ticket info button */
            #userjs-copy-ticket-button {
                flex: 0 0 auto;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-inline: 0.5rem 0.35rem;
                padding: 2px;
                border: 0;
                background: transparent;
                color: inherit;
                cursor: pointer;
                line-height: 0;
                transform: scale(1);
                transition: transform 0.15s ease;

                &:hover {
                    transform: scale(1.2);
                }

                &:active {
                    transform: scale(0.85);
                }

                &:focus:not(:focus-visible) {
                    outline: none;
                }

                & svg {
                    width: 14px;
                    height: 14px;
                    display: block;
                }
            }

            /* Field named by a validation banner, which Jira does not mark itself */
            .userjs-validation-error > label {
                color: var(--ds-text-danger, #ff8f73) !important;
            }
            .userjs-validation-error > label + div {
                box-shadow: 0 0 0 2px var(--ds-border-danger, #f87462);
                border-radius: 6px;
            }
            /* Create dialog fields nest the label, so highlight the whole row */
            .userjs-validation-error:not(:has(> label)) {
                box-shadow: 0 0 0 2px var(--ds-border-danger, #f87462);
                border-radius: 6px;
            }
            .userjs-validation-error:not(:has(> label)) label {
                color: var(--ds-text-danger, #ff8f73) !important;
            }

            /* Commit reviews column in the development dialog */
            [data-userjs="commit-reviews-header"],
            [data-userjs="commit-reviews"] {
                vertical-align: middle;
            }
            .userjs-commit-row > td {
                border-bottom: 1px solid var(--ds-border, #3b4754) !important;
            }
            .userjs-commit-reviews {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 0.35rem;
            }
            .userjs-commit-review {
                display: flex;
                align-items: center;
                gap: 0.4rem;
                max-width: 100%;
                white-space: nowrap;
            }
            .userjs-commit-review a {
                color: var(--ds-link, #579dff);
                font-weight: 500;
                text-decoration: none;
            }
            .userjs-commit-review a:hover {
                text-decoration: underline;
            }
            .userjs-commit-review-status {
                flex: 0 0 auto;
                padding: 0 0.35rem;
                border-radius: 3px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.02em;
                line-height: 1.6;
                text-transform: uppercase;
                background: var(--ds-background-neutral, #3d474f);
                color: var(--ds-text-subtle, #c7d1db);
            }
            .userjs-commit-review-status[data-state="CLOSED"],
            .userjs-commit-review-status[data-state="MERGED"],
            .userjs-commit-review-status[data-state="APPROVED"],
            .userjs-commit-review-status[data-state="SUMMARIZE"] {
                background: var(--ds-background-success, #37471f);
                color: var(--ds-text-success, #d3f1a7);
            }
            .userjs-commit-review-status[data-state="OPEN"],
            .userjs-commit-review-status[data-state="DRAFT"],
            .userjs-commit-review-status[data-state="REVIEW"],
            .userjs-commit-review-status[data-state="APPROVAL"],
            .userjs-commit-review-status[data-state="PENDING"] {
                background: var(--ds-background-information, #1c2b41);
                color: var(--ds-text-information, #85b8ff);
            }
            .userjs-commit-review-status[data-state="DECLINED"],
            .userjs-commit-review-status[data-state="REJECTED"],
            .userjs-commit-review-status[data-state="DEAD"],
            .userjs-commit-review-status[data-state="ABANDONED"] {
                background: var(--ds-background-danger, #42221f);
                color: var(--ds-text-danger, #fd9891);
            }

            /* Commit column copy button: reduce gap and align with commit link */
            [data-testid="development-details.main.commits-tab.repositories.commits-table"] td:has(button [aria-label*="Copy commit hash"]) > span > div {
                align-items: center !important;
                gap: 4px !important;
            }
            [data-testid="development-details.main.commits-tab.repositories.commits-table"] td:has(button [aria-label*="Copy commit hash"]) > span > div > span:first-child {
                width: auto !important;
                flex: 0 0 auto !important;
            }
            [data-testid="development-details.main.commits-tab.repositories.commits-table"] td:has(button [aria-label*="Copy commit hash"]) div:has(> div > span > button) {
                margin: 0 !important;
                padding: 0 !important;
                transform: none !important;
                align-items: center !important;
            }
            [data-testid="development-details.main.commits-tab.repositories.commits-table"] tr:hover td div:has(> div > span > button),
            [data-testid="development-details.main.commits-tab.repositories.commits-table"] td:hover div:has(> div > span > button),
            [data-testid="development-details.main.commits-tab.repositories.commits-table"] tr:focus-within td div:has(> div > span > button) {
                opacity: 1 !important;
            }

        </style>`);
    }

    function addDevelopmentLogButton() {
        const titleSelector = '[data-testid="development-details.main.details-header.development-details-header-title"]';
        const buttonId = 'userjs-development-log-button';

        const inject = () => {
            const title = document.querySelector(titleSelector);
            if (!title) {
                return;
            }

            const header = title.closest('[data-test-id="development-details.main.details-header.header-container"]');
            const titleRow = header && header.firstElementChild;
            if (!titleRow || titleRow.querySelector('#' + buttonId)) {
                return;
            }

            const button = document.createElement('button');
            button.id = buttonId;
            button.type = 'button';
            button.textContent = 'Create review';
            button.addEventListener('click', () => {
                const key = getIssueKey(title);
                const summary = getIssueSummary();
                const url = 'https://fisheye.qad.com/cru/create?issueKey='
                    + encodeURIComponent(key)
                    + '&issueSummary='
                    + encodeURIComponent(summary);
                window.open(url, '_blank', 'noopener');
            });

            const feedbackButton = titleRow.querySelector('button');
            if (feedbackButton) {
                titleRow.insertBefore(button, feedbackButton);
            } else {
                titleRow.appendChild(button);
            }
        }

        const getIssueKey = (title) => {
            const fromTitle = title.textContent.trim().match(/([A-Z][A-Z0-9]+-\d+)\s*$/);
            if (fromTitle) {
                return fromTitle[1];
            }

            const keyLink = document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]');
            return keyLink ? keyLink.textContent.trim() : '';
        }

        const getIssueSummary = () => {
            const heading = document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]');
            return heading ? heading.textContent.trim() : '';
        }

        new MutationObserver(inject).observe(document.body, { childList: true, subtree: true });
        inject();
    }

    function showParentTicketSummary() {
        const parentSelector = '[data-testid="issue-field-parent.ui.view-link"]';
        const breadcrumbsSelector = '[data-component-selector="breadcrumbs-wrapper"]';
        const summaryId = 'userjs-parent-summary';
        let lastSummary = null;

        const inject = () => {
            const breadcrumbs = document.querySelector(breadcrumbsSelector);
            if (!breadcrumbs) {
                return;
            }

            const parentLink = document.querySelector(parentSelector);
            let summaryEl = document.getElementById(summaryId);

            const summary = parentLink
                ? parentLink.textContent.trim().replace(/^[A-Z][A-Z0-9]+-\d+\s+/, '')
                : '';

            if (!breadcrumbs || !summary) {
                if (summaryEl) {
                    summaryEl.remove();
                }
                lastSummary = null;
                return;
            }

            if (!summaryEl) {
                summaryEl = document.createElement('div');
                summaryEl.id = summaryId;
            }

            if (breadcrumbs.parentElement.lastElementChild !== summaryEl) {
                breadcrumbs.parentElement.appendChild(summaryEl);
            }

            if (summaryEl.textContent !== summary) {
                summaryEl.textContent = summary;
            }

            if (summary !== lastSummary) {
                lastSummary = summary;
                console.log('Parent ticket summary:', summary);
            }
        };

        new MutationObserver(inject).observe(document.body, { childList: true, subtree: true });
        inject();
    }

    function addCopyTicketButton() {
        const buttonId = 'userjs-copy-ticket-button';
        const breadcrumbsSelector = '[data-component-selector="breadcrumbs-wrapper"]';
        const parentSelector = '[data-testid="issue-field-parent.ui.view-link"]';

        const inject = () => {
            const breadcrumbs = document.querySelector(breadcrumbsSelector);
            if (!breadcrumbs) {
                return;
            }

            let button = document.getElementById(buttonId);

            if (!button) {
                button = document.createElement('button');
                button.id = buttonId;
                button.type = 'button';
                button.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 2.5A1.5 1.5 0 0 1 3.5 1h6A1.5 1.5 0 0 1 11 2.5V4H9.5V2.5h-6v8H5V12H3.5A1.5 1.5 0 0 1 2 10.5v-8z"/><path fill="currentColor" d="M5.5 4A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15h6a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 11.5 4h-6zm0 1.5h6v8h-6v-8z"/></svg>';
                button.title = 'Copy ticket and parent';
                button.setAttribute('aria-label', 'Copy ticket and parent');
                button.addEventListener('click', () => {
                    const text = buildClipboardText();
                    if (!text) {
                        return;
                    }
                    copyText(text);
                });
            }

            if (breadcrumbs.nextElementSibling !== button) {
                breadcrumbs.after(button);
            }
        }

        const buildClipboardText = () => {
            const key = getIssueKey();
            const summary = getIssueSummary();
            const parent = getParentTicket();
            const lines = [key + ': ' + summary];
            if (parent.key) {
                lines.push(parent.key + ': ' + parent.summary);
            }
            return lines.join('\n');
        }

        const getIssueKey = () => {
            const keyLink = document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]');
            if (keyLink && keyLink.textContent.trim()) {
                return keyLink.textContent.trim();
            }

            const fromUrl = location.pathname.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
            return fromUrl ? fromUrl[1] : '';
        }

        const getIssueSummary = () => {
            const heading = document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]');
            return heading ? heading.textContent.trim() : '';
        }

        const getParentTicket = () => {
            const parentLink = document.querySelector(parentSelector);
            const text = parentLink ? parentLink.textContent.trim() : '';
            const match = text.match(/^([A-Z][A-Z0-9]+-\d+)\s+([\s\S]*)$/);
            if (!match) {
                return { key: '', summary: '' };
            }

            return { key: match[1], summary: match[2].trim() };
        }

        const copyText = (text) => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text).catch(() => {
                    return copied ? Promise.resolve() : Promise.reject(new Error('copy failed'));
                });
            }

            return copied ? Promise.resolve() : Promise.reject(new Error('copy failed'));
        }

        new MutationObserver(inject).observe(document.body, { childList: true, subtree: true });
        inject();
    }

    // Keep every backlog card mounted so Ctrl+F can find tickets that are scrolled out of view.
    // FastVirtualList drops rows outside a ~400px overscan. The export is a getter, so it has to be redefined.
    function fixBacklogCardVirtualization() {
        const scrollerSelector = '[data-testid="software-backlog.backlog-content.scrollable"]';
        const listSelector = '[data-testid^="software-backlog.card-list.id-"] ul';
        const attached = new WeakSet();
        const state = new WeakMap();
        let overscanPatched = false;

        const findOverscanModuleId = () => {
            const root = document.querySelector('[data-testid^="software-backlog.card-list.id-"]');
            if (!root) {
                return null;
            }

            const fiberKey = Object.keys(root).find((key) => key.indexOf('__reactFiber') === 0);
            if (!fiberKey) {
                return null;
            }

            let fiber = root[fiberKey];
            for (let i = 0; fiber && i < 40; i++) {
                if (typeof fiber.type === 'function') {
                    const match = Function.prototype.toString.call(fiber.type).match(/r\("([^"]+)"\)\.useOverscanHeight/);
                    if (match) {
                        return match[1];
                    }
                }
                fiber = fiber.return;
            }

            return null;
        };

        const patchOverscan = () => {
            if (overscanPatched) {
                return true;
            }

            const moduleId = findOverscanModuleId();
            if (!moduleId) {
                return false;
            }

            const requireNames = Object.getOwnPropertyNames(window).filter((name) => name.indexOf('parcelRequire') === 0);
            for (let i = 0; i < requireNames.length; i++) {
                let mod;
                try {
                    mod = window[requireNames[i]](moduleId);
                } catch (error) {
                    continue;
                }

                if (!mod || typeof mod.useOverscanHeight !== 'function') {
                    continue;
                }
                if (mod.useOverscanHeight.__userjsPatched) {
                    overscanPatched = true;
                    return true;
                }

                const original = mod.useOverscanHeight;
                const patched = (started) => {
                    original(started);
                    return 10000000;
                };
                patched.__userjsPatched = true;

                const descriptor = Object.getOwnPropertyDescriptor(mod, 'useOverscanHeight');
                if (!descriptor || !descriptor.configurable) {
                    continue;
                }

                Object.defineProperty(mod, 'useOverscanHeight', {
                    configurable: true,
                    enumerable: true,
                    get: () => patched
                });
                overscanPatched = true;
                return true;
            }

            return false;
        };

        const revealAll = (scroller) => {
            const info = state.get(scroller);
            if (!info || info.revealed || info.kicking || !patchOverscan()) {
                return;
            }

            const max = scroller.scrollHeight - scroller.clientHeight;
            info.revealed = true;
            if (max < 1) {
                return;
            }

            info.kicking = true;
            const y = scroller.scrollTop;
            const next = y < max ? y + 1 : y - 1;
            scroller.scrollTop = next;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (Math.abs(scroller.scrollTop - next) < 2) {
                        scroller.scrollTop = y;
                    }
                    setTimeout(() => {
                        info.kicking = false;
                        kick(scroller);
                    }, 350);
                });
            });
        };

        const emptyVisibleLists = (scroller) => {
            const view = scroller.getBoundingClientRect();
            if (view.height < 40) {
                return [];
            }

            return [...scroller.querySelectorAll(listSelector)].filter((ul) => {
                if (ul.children.length > 0 || !(parseFloat(ul.style.height) > 0)) {
                    return false;
                }

                const rect = ul.getBoundingClientRect();
                return rect.bottom > view.top + 8 && rect.top < view.bottom - 8;
            });
        };

        const kick = (scroller) => {
            const info = state.get(scroller);
            if (!info || info.kicking) {
                return;
            }

            const empty = emptyVisibleLists(scroller);
            const signature = empty
                .map((ul) => ul.style.height + '@' + Math.round(ul.getBoundingClientRect().top))
                .join('|');

            if (!empty.length) {
                info.attempts = 0;
                info.signature = '';
                return;
            }

            if (signature !== info.signature) {
                info.signature = signature;
                info.attempts = 0;
            }

            const max = scroller.scrollHeight - scroller.clientHeight;
            if (max < 1 || info.attempts >= 6) {
                return;
            }

            info.attempts += 1;
            info.kicking = true;
            const y = scroller.scrollTop;
            const next = y < max ? y + 1 : y - 1;
            scroller.scrollTop = next;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (Math.abs(scroller.scrollTop - next) < 2) {
                        scroller.scrollTop = y;
                    }
                    setTimeout(() => {
                        info.kicking = false;
                        kick(scroller);
                    }, 350);
                });
            });
        };

        const schedule = (scroller) => {
            const info = state.get(scroller);
            clearTimeout(info.timer);
            info.timer = setTimeout(() => {
                revealAll(scroller);
                kick(scroller);
            }, 60);
        };

        const attach = (scroller) => {
            if (attached.has(scroller)) {
                return;
            }

            attached.add(scroller);
            state.set(scroller, { attempts: 0, kicking: false, timer: 0, signature: '', revealed: false });
            new MutationObserver(() => schedule(scroller)).observe(scroller, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style']
            });
            schedule(scroller);
        };

        const scan = () => {
            document.querySelectorAll(scrollerSelector).forEach(attach);
        };

        new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
        scan();
    }

    // Jira prints the missing field in a banner and leaves the control unmarked.
    // Transition: "Field Fix versions is required."
    // Create: "Discovery Phase" and "Discovery Activity" are both required.
    function highlightValidationFields() {
        const errorClass = 'userjs-validation-error';
        const messageSelector = '[data-testid*="section-messages"][data-testid*="error"]:not([data-testid*="--"])';
        const fieldSelector = '[data-testid*="field-renderer.field."]:not([data-testid$="--label"]), [data-testid*="form-field"]:not([data-testid$="--label"])';
        const fieldNamePattern = /(?:^|[\n.])\s*(?:Field\s+)?["']?(.+?)["']?\s+is required/gi;
        const quotedNamePattern = /["']([^"']+)["']/g;
        let scheduled = false;

        const normalize = (value) => value
            .replace(/\*/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

        const fieldNamesFrom = (text) => {
            const names = [];
            fieldNamePattern.lastIndex = 0;
            let match = fieldNamePattern.exec(text);
            while (match) {
                names.push(normalize(match[1]));
                match = fieldNamePattern.exec(text);
            }

            if (/required/i.test(text)) {
                quotedNamePattern.lastIndex = 0;
                match = quotedNamePattern.exec(text);
                while (match) {
                    names.push(normalize(match[1]));
                    match = quotedNamePattern.exec(text);
                }
            }

            return names;
        };

        const apply = () => {
            scheduled = false;
            const marked = new Set();
            const banners = document.querySelectorAll(messageSelector);

            banners.forEach((banner) => {
                const names = new Set(fieldNamesFrom(banner.textContent || ''));
                if (!names.size) {
                    return;
                }

                const root = banner.closest('form') || banner.closest('[role="dialog"]') || document;
                root.querySelectorAll('label').forEach((label) => {
                    if (!names.has(normalize(label.textContent || ''))) {
                        return;
                    }

                    const field = label.closest(fieldSelector);
                    if (field) {
                        marked.add(field);
                    }
                });
            });

            [...marked].forEach((field) => {
                [...marked].forEach((other) => {
                    if (other !== field && field.contains(other)) {
                        marked.delete(field);
                    }
                });
            });

            marked.forEach((field) => field.classList.add(errorClass));
            document.querySelectorAll('.' + errorClass).forEach((field) => {
                if (!marked.has(field)) {
                    field.classList.remove(errorClass);
                }
            });
        };

        const schedule = () => {
            if (scheduled) {
                return;
            }
            scheduled = true;
            requestAnimationFrame(apply);
        };

        new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
        schedule();
    }

    // The commits table omits reviews. DevDetailsDialog already returns them on each commit.
    function addCommitReviewsColumn() {
        const tableSelector = '[data-testid="development-details.main.commits-tab.repositories.commits-table"] table';
        const reviewsByIssueId = new Map();
        const issueIdByKey = new Map();
        const attemptsByKey = new Map();
        let inflightKey = '';
        let scheduled = false;

        const asList = (value) => {
            if (!value) {
                return [];
            }
            if (Array.isArray(value)) {
                return value;
            }
            if (Array.isArray(value.nodes)) {
                return value.nodes;
            }
            if (Array.isArray(value.edges)) {
                return value.edges.map((edge) => edge && edge.node).filter(Boolean);
            }
            return [value];
        };

        const commitsFrom = (data) => {
            const details = data
                && data.data
                && data.data.developmentInformation
                && data.data.developmentInformation.details;
            if (!details) {
                return null;
            }

            const commits = [];
            (details.instanceTypes || []).forEach((instance) => {
                asList(instance && instance.repository).forEach((repository) => {
                    asList(repository && repository.commits).forEach((commit) => {
                        if (commit && commit.displayId) {
                            commits.push(commit);
                        }
                    });
                });
            });
            return commits;
        };

        const rememberIssue = (issueId, commits) => {
            if (!issueId || !commits) {
                return;
            }

            let reviews = reviewsByIssueId.get(issueId);
            if (!reviews) {
                reviews = new Map();
                reviewsByIssueId.set(issueId, reviews);
            }

            commits.forEach((commit) => {
                const displayId = String(commit.displayId);
                const next = (reviews.get(displayId) || []).slice();
                asList(commit.reviews).forEach((review) => {
                    if (!review || !review.id) {
                        return;
                    }

                    const existing = next.find((item) => item.id === review.id);
                    if (existing) {
                        existing.state = review.state || existing.state;
                        existing.url = review.url || existing.url;
                        return;
                    }

                    next.push({
                        id: String(review.id),
                        url: review.url || '',
                        state: review.state || ''
                    });
                });
                reviews.set(displayId, next);
            });
        };

        const issueIdFromBody = (body) => {
            if (!body || body.indexOf('DevDetailsDialog') === -1) {
                return '';
            }

            try {
                const payload = JSON.parse(body);
                const issueId = payload && payload.variables && payload.variables.issueId;
                return issueId ? String(issueId) : '';
            } catch (error) {
                return '';
            }
        };

        const captureResponse = (bodyText, responseText) => {
            const issueId = issueIdFromBody(bodyText);
            if (!issueId || !responseText) {
                return;
            }

            try {
                const commits = commitsFrom(JSON.parse(responseText));
                if (!commits) {
                    return;
                }
                rememberIssue(issueId, commits);
                schedule();
            } catch (error) {}
        };

        const isDevDetails = (url, body) => {
            return String(url || '').indexOf('operation=DevDetailsDialog') !== -1
                || (typeof body === 'string' && body.indexOf('DevDetailsDialog') !== -1);
        };

        if (typeof window.fetch === 'function' && !window.fetch.__userjsDevDetails) {
            const originalFetch = window.fetch;
            const patchedFetch = function(input, init) {
                const responsePromise = originalFetch.apply(this, arguments);
                try {
                    const url = typeof input === 'string' ? input : (input && input.url) || '';
                    const body = init && typeof init.body === 'string' ? init.body : '';
                    if (isDevDetails(url, body)) {
                        responsePromise.then((response) => {
                            response.clone().text().then((responseText) => {
                                captureResponse(body, responseText);
                            }).catch(() => {});
                        }).catch(() => {});
                    }
                } catch (error) {}
                return responsePromise;
            };
            patchedFetch.__userjsDevDetails = true;
            window.fetch = patchedFetch;
        }

        if (XMLHttpRequest.prototype.send && !XMLHttpRequest.prototype.send.__userjsDevDetails) {
            const originalOpen = XMLHttpRequest.prototype.open;
            const originalSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.open = function(method, url) {
                this.__userjsUrl = url;
                return originalOpen.apply(this, arguments);
            };
            const patchedSend = function(body) {
                if (isDevDetails(this.__userjsUrl, body)) {
                    this.addEventListener('load', function() {
                        captureResponse(typeof body === 'string' ? body : '', this.responseText);
                    });
                }
                return originalSend.apply(this, arguments);
            };
            patchedSend.__userjsDevDetails = true;
            XMLHttpRequest.prototype.send = patchedSend;
        }

        const getIssueKey = () => {
            const title = document.querySelector('[data-testid="development-details.main.details-header.development-details-header-title"]');
            const fromTitle = title && title.textContent.match(/([A-Z][A-Z0-9]+-\d+)/);
            if (fromTitle) {
                return fromTitle[1];
            }

            const fromUrl = location.pathname.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
            if (fromUrl) {
                return fromUrl[1];
            }

            const selected = new URLSearchParams(location.search).get('selectedIssue');
            if (selected && /^[A-Z][A-Z0-9]+-\d+$/.test(selected)) {
                return selected;
            }

            const keyLink = document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]');
            return keyLink ? keyLink.textContent.trim() : '';
        };

        const commitDisplayId = (row) => {
            const link = [...row.querySelectorAll('a')].find((anchor) => /^\d+$/.test(anchor.textContent.trim()));
            return link ? link.textContent.trim() : '';
        };

        const renderReviews = (reviews) => {
            const list = document.createElement('div');
            list.className = 'userjs-commit-reviews';
            reviews.slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).forEach((review) => {
                const item = document.createElement('div');
                item.className = 'userjs-commit-review';

                if (review.url) {
                    const link = document.createElement('a');
                    link.href = review.url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.textContent = review.id;
                    item.appendChild(link);
                } else {
                    const name = document.createElement('span');
                    name.textContent = review.id;
                    item.appendChild(name);
                }

                if (review.state) {
                    const status = document.createElement('span');
                    status.className = 'userjs-commit-review-status';
                    status.dataset.state = String(review.state).toUpperCase();
                    status.textContent = review.state;
                    item.appendChild(status);
                }

                list.appendChild(item);
            });
            return list;
        };
8
        const columnWidths = ['5%', '9%', '30%', '12%', '8%', '22%', '12%'];

        const applyColumnWidths = (row) => {
            [...row.children].forEach((cell, index) => {
                const width = columnWidths[index];
                if (width && cell.style.getPropertyValue('--local-dynamic-table-width') !== width) {
                    cell.style.setProperty('--local-dynamic-table-width', width);
                }
            });
        };

        const reviewsRoot = (node) => node && node.closest('[data-testid="development-details.main.commits-tab.repositories.commits-table"]');

        // Jira rebuilds these rows when files are shown or hidden. An extra cell during that
        // update shifts every column, so the injected cells have to be gone before the click runs.
        const restoreForJira = (root) => {
            if (!root) {
                return;
            }

            root.querySelectorAll('[data-userjs-colspan]').forEach((cell) => {
                cell.colSpan = Number(cell.dataset.userjsColspan) || cell.colSpan;
                delete cell.dataset.userjsColspan;
            });
            root.querySelectorAll('[data-userjs="commit-reviews"], [data-userjs="commit-reviews-header"]').forEach((cell) => {
                cell.remove();
            });
        };

        const paintTable = (table, reviews) => {
            const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
            const actionHeader = headerRow && [...headerRow.children].find((cell) => cell.dataset.userjs !== 'commit-reviews-header' && cell.textContent.trim() === 'Action');
            if (actionHeader && !headerRow.querySelector('[data-userjs="commit-reviews-header"]')) {
                const header = document.createElement('th');
                header.dataset.userjs = 'commit-reviews-header';
                header.className = actionHeader.className;
                header.style.cssText = actionHeader.style.cssText;
                header.textContent = 'Reviews';
                actionHeader.before(header);
            }

            const columnCount = headerRow ? headerRow.children.length : 0;

            [...table.tBodies].forEach((tbody) => {
                [...tbody.rows].forEach((row) => {
                    if (row.querySelector('th')) {
                        return;
                    }

                    const spanned = row.cells.length === 1 && row.cells[0].colSpan > 1 ? row.cells[0] : null;
                    if (spanned) {
                        if (!spanned.dataset.userjsColspan) {
                            spanned.dataset.userjsColspan = String(spanned.colSpan);
                        }
                        if (columnCount && spanned.colSpan !== columnCount) {
                            spanned.colSpan = columnCount;
                        }
                        return;
                    }

                    const displayId = commitDisplayId(row);
                    if (!displayId) {
                        return;
                    }

                    row.classList.add('userjs-commit-row');

                    const list = reviews.get(displayId) || [];
                    const signature = list.map((review) => review.id + ':' + review.state).join('|');
                    let cell = row.querySelector('[data-userjs="commit-reviews"]');
                    if (!cell || cell.dataset.userjsSignature !== signature) {
                        const actionCell = [...row.children].find((child) => child.textContent.trim() === 'Create review') || row.lastElementChild;
                        if (!cell) {
                            cell = document.createElement('td');
                            cell.dataset.userjs = 'commit-reviews';
                            if (actionCell) {
                                cell.className = actionCell.className;
                                cell.style.cssText = actionCell.style.cssText;
                                actionCell.before(cell);
                            } else {
                                row.appendChild(cell);
                            }
                        }

                        cell.dataset.userjsSignature = signature;
                        cell.replaceChildren(renderReviews(list));
                    }

                    if (row.children.length === columnWidths.length) {
                        applyColumnWidths(row);
                    }
                });
            });

            if (headerRow && headerRow.children.length === columnWidths.length) {
                applyColumnWidths(headerRow);
            }
        };

        const fetchDetails = (issueId) => {
            return fetch('/jsw2/graphql?operation=DevDetailsDialog', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'x-atlassian-capability': 'ISSUE_VIEW--other'
                },
                body: JSON.stringify({
                    operationName: 'DevDetailsDialog',
                    query: 'query DevDetailsDialog($issueId: ID!) { developmentInformation: jira_developmentInformation(issueId: $issueId) { details { instanceTypes { repository { commits { displayId reviews { id url state } } } } } } }',
                    variables: { issueId: issueId }
                })
            }).then((response) => {
                if (!response.ok) {
                    throw new Error('development details failed');
                }
                return response.json();
            });
        };

        const ensureLoaded = (key) => {
            if (!key || inflightKey === key || (attemptsByKey.get(key) || 0) >= 2) {
                return;
            }

            const knownIssueId = issueIdByKey.get(key);
            if (knownIssueId && reviewsByIssueId.has(knownIssueId)) {
                return;
            }

            inflightKey = key;
            attemptsByKey.set(key, (attemptsByKey.get(key) || 0) + 1);

            const issueIdPromise = knownIssueId
                ? Promise.resolve(knownIssueId)
                : fetch('/rest/api/3/issue/' + encodeURIComponent(key) + '?fields=summary', { credentials: 'include' })
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error('issue lookup failed');
                        }
                        return response.json();
                    })
                    .then((issue) => {
                        const issueId = issue && issue.id ? String(issue.id) : '';
                        if (!issueId) {
                            throw new Error('issue id missing');
                        }
                        issueIdByKey.set(key, issueId);
                        return issueId;
                    });

            issueIdPromise.then((issueId) => {
                if (reviewsByIssueId.has(issueId)) {
                    return null;
                }
                return fetchDetails(issueId).then((data) => {
                    const commits = commitsFrom(data);
                    if (!commits) {
                        throw new Error('development details missing');
                    }
                    rememberIssue(issueId, commits);
                });
            }).then(() => {
                schedule();
            }).catch(() => {}).finally(() => {
                if (inflightKey === key) {
                    inflightKey = '';
                }
            });
        };

        const paint = () => {
            scheduled = false;
            const tables = [...document.querySelectorAll(tableSelector)];
            if (!tables.length) {
                return;
            }

            const key = getIssueKey();
            const issueId = issueIdByKey.get(key);
            const reviews = issueId && reviewsByIssueId.get(issueId);
            if (!reviews) {
                ensureLoaded(key);
                return;
            }

            tables.forEach((table) => paintTable(table, reviews));
        };

        const schedule = () => {
            if (scheduled) {
                return;
            }
            scheduled = true;
            requestAnimationFrame(paint);
        };

        document.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            const label = button ? button.textContent.replace(/\s+/g, ' ').trim() : '';
            if (!button || !/files?$/i.test(label)) {
                return;
            }
            restoreForJira(reviewsRoot(button));
        }, true);

        new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
        schedule();
    }

})();
