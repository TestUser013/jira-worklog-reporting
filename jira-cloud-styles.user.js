    // ==UserScript==
// @name         JIRA Cloud Styles
// @namespace    https://qad.atlassian.net/
// @version      2026-10-19
// @description  try to take over the world!
// @author       yvasyl@softserveinc.com
// @match        https://qad.atlassian.net/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=atlassian.net
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    createStyles();

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

        </style>`);
    }

})();
