// ==UserScript==
// @name         JIRA Cloud Styles
// @namespace    https://qad.atlassian.net/
// @version      2026-10-27
// @description  try to take over the world!
// @author       yvasyl@softserveinc.com
// @match        https://qad.atlassian.net/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=atlassian.net
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    createStyles();
    addDevelopmentLogButton();
    showParentTicketSummary();

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

            /* Board tickets - vertical padding */
            [data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"] {
                padding: 0 !important;
            }
            [data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"] > div {
                padding: 0 !important;
                margin: 0 !important;
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

            /* Fix chips for multi-select input */
            div[data-multi-value-tag-like="true"] {
                height: auto;
            }

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

            [data-component-selector="breadcrumbs-wrapper"]:has(+ #userjs-parent-summary) {
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

        const show = () => {
            const breadcrumbs = document.querySelector(breadcrumbsSelector);
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
            if (breadcrumbs.nextElementSibling !== summaryEl) {
                breadcrumbs.after(summaryEl);
            }
            if (summaryEl.textContent !== summary) {
                summaryEl.textContent = summary;
            }

            if (summary !== lastSummary) {
                lastSummary = summary;
                console.log('Parent ticket summary:', summary);
            }
        };

        new MutationObserver(show).observe(document.body, { childList: true, subtree: true });
        show();
    }

})();
