// ==UserScript==
// @name         JIRA Worklog
// @namespace    https://projects.qad.com/
// @version      1.0
// @description  try to take over the world!
// @author       yvasyl@softserveinc.com
// @match        https://projects.qad.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=qad.com
// @updateURL    https://raw.githubusercontent.com/TestUser013/jira-worklog-reporting/refs/heads/main/jira-worklog.js
// @downloadURL  https://raw.githubusercontent.com/TestUser013/jira-worklog-reporting/refs/heads/main/jira-worklog.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    class State {

        static get username() {
            return document.querySelector('#header-details-user-fullname')?.dataset?.username || '';
        }

        static dateOffset = 0;
        static worklogs = [];
        static issues = [];
        static element = undefined;
        static beginDate = undefined;
        static endDate = undefined;

        static getWorklog(id) {
            return State.worklogs.find((worklog) => worklog.worklogId === id) || {};
        }

        static getDayWorklogs(day) {
            return State.worklogs.filter((worklog) => worklog.dayString === day);
        }

        static getIssue(key) {
            return State.issues.find((issue) => issue.key === key) || {};
        }
    }

    class WorklogPopover {

        static async main() {
            try {
                WorklogPopoverTemplate.createPopup();
                WorklogTheme.apply();
                WorklogSpinner.createSpinner(State.element);
                WorklogPopover.calculateStateDateRange();
                await WorklogPopover.populateWorklogData();
                WorklogPopover.showData();
                WorklogSpinner.removeSpinner(State.element);
            } catch (error) {
                console.error(error);
                State.element?.remove();
            }
        }

        static calculateStateDateRange() {
            const date = new Date();
            date.setDate(date.getDate() - State.dateOffset);
            const [ beginDate, endDate ] = DateTime.getWeekRangeDates(date);
            State.beginDate = beginDate;
            State.endDate = endDate;
        }

        static async populateWorklogData() {
            // Get list of issues for the User and date range
            const issueKeys = await JiraApi.getIssueKeys(State.beginDate, State.endDate);

            // Get worklog data for each issue
            const issueWorklogData = (await Promise.all(issueKeys.map((issueKey) => JiraApi.getIssueWorklog(issueKey)))).flat();
            const worklogData = WorklogPopover.normalizeWorklogData(issueWorklogData);

            // Get detailed information about each issue for every normalized worklog data
            const worklogIssueKeys = [...new Set(worklogData.map((worklogItem) => worklogItem.issueKey))];
            State.issues = await Promise.all(worklogIssueKeys.map((issueKey) => JiraApi.getIssueParentInfo(issueKey)));

            WorklogPopover.sortWorklogData(worklogData, State.issues);
            WorklogPopover.addWorklogRowSpans(worklogData);
            State.worklogs = worklogData;
        }

        static normalizeWorklogData(issueWorklogData) {
            const worklogData = issueWorklogData
                .filter((worklogItem) => worklogItem.user === State.username)
                .filter((worklogItem) => worklogItem.date >= State.beginDate && worklogItem.date <= State.endDate);

            worklogData.forEach((worklogItem) => {
                worklogItem.dateStr = new Intl.DateTimeFormat("en-US", {
                    day: '2-digit',
                    month: 'short',
                }).format(worklogItem.date);

                worklogItem.dayString = new Intl.DateTimeFormat("en-US", {
                    weekday: "long"
                }).format(worklogItem.date);
            });

            return worklogData;
        }

        static sortWorklogData(worklogData, issues) {
            const weekdayOrder = {
                Sunday: 0,
                Monday: 1,
                Tuesday: 2,
                Wednesday: 3,
                Thursday: 4,
                Friday: 5,
                Saturday: 6,
            };

            const parentByIssueKey = Object.fromEntries(issues.map(({ key, parentKey }) => [key, parentKey]));
            console.log({parentByIssueKey});

            worklogData.sort((a, b) => {
                const dayDiff = weekdayOrder[a.dayString] - weekdayOrder[b.dayString];
                if (dayDiff !== 0) {
                    return dayDiff;
                }
                const parentA = parentByIssueKey[a.issueKey];
                const parentB = parentByIssueKey[b.issueKey];
                if (parentA == null && parentB == null) {
                    return a.issueKey.localeCompare(b.issueKey);
                }
                if (parentA == null) {
                    return 1;
                }
                if (parentB == null) {
                    return -1;
                }
                const parentDiff = parentA.localeCompare(parentB);
                if (parentDiff !== 0) {
                    return parentDiff;
                }
                return a.issueKey.localeCompare(b.issueKey);
            });
        }

        static addWorklogRowSpans(worklogData) {
            for (let i = 0; i < worklogData.length; i++) {
                const day = worklogData[i].dayString;
                if (i > 0 && worklogData[i - 1].dayString === day) {
                    worklogData[i].rowSpan = 0;
                    continue;
                }
                let rowSpan = 1;
                while (i + rowSpan < worklogData.length && worklogData[i + rowSpan].dayString === day) {
                    rowSpan++;
                }
                worklogData[i].rowSpan = rowSpan;
            }
        }

        static showData() {
            WorklogPopover.showWorklogHeaderData(State.element, State.beginDate, State.endDate);
            WorklogPopover.showWorklogDetails(State.element, State.worklogs, State.issues);
            WorklogPopover.showWorklogTotals(State.element, State.worklogs);
        }

        static showWorklogHeaderData(popover, beginDate, endDate) {
            const dateRangeString = WorklogPopover.generateDateRangeString();
            popover.querySelector('.issue-worklog-header-range').innerText = dateRangeString;
        }

        static generateDateRangeString() {
            const date = new Date();
            date.setDate(date.getDate() - State.dateOffset);
            const [ beginDate, endDate ] = DateTime.getWeekRangeDates(date);
            const beginDateString = DateTime.toYMD(beginDate);
            const endDateString = DateTime.toYMD(endDate);
            const hint = !State.dateOffset ? ' (current)' : '';
            return `[${beginDateString}] - [${endDateString}]${hint}`;
        }

        static showWorklogDetails(popover, issueWorklogData, issueDetails) {
            const tbody = popover.querySelector('tbody');
            if (issueWorklogData.length) {
                tbody.innerHTML = '';
            } else {
                tbody.innerHTML = '<tr><td colspan="6">&nbsp;</td></tr>';
            }

            issueWorklogData.forEach((issueWorklog) => {
                const issueDetail = issueDetails.find((issue) => issue.key === issueWorklog.issueKey);
                const tr = WorklogPopoverContent.createWorklogRow(issueWorklog, issueDetail);
                tbody.appendChild(tr);
            });
        }

        static showWorklogTotals(popover, issueWorklogData) {
            const days = DOM.setupElement('div');
            days.innerHTML = WorklogPopover.generateWeekdayWorklogTotals(issueWorklogData);

            const totals = DOM.setupElement('div');
            const totalMinutes = issueWorklogData.reduce((sum, issueWorklog) => sum + DateTime.toMinutes(issueWorklog.worklogDuration), 0);
            totals.innerText = `Total: ${DateTime.toHoursMinutesShortText(totalMinutes)}`;

            const footer = popover.querySelector('.issue-worklog-popover-footer');
            footer.appendChild(days);
            footer.appendChild(totals);
        }

        static generateWeekdayWorklogTotals(issueWorklogData) {
            const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
            // const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const byWeekday = Object.fromEntries(weekdays.map((d) => [d, 0]));
            for (const issueWorklog of issueWorklogData) {
                // JS: 0=Sun ... 6=Sat > shift so Mon=0
                const key = weekdays[(issueWorklog.date.getDay() + 6) % 7];
                byWeekday[key] += DateTime.toMinutes(issueWorklog.worklogDuration);
            }
            const splitter = ' <span class="issue-worklog-splitter">|</span> ';
            return weekdays.map((day) => {
                let classStr = 'issue-worklog-time-normal';
                if (byWeekday[day] > 8 * 60) {
                    classStr = 'issue-worklog-time-error';
                } else if (byWeekday[day] > 6 * 60) {
                    classStr = 'issue-worklog-time-warning';
                } else if (byWeekday[day] < 4 * 60) {
                    classStr = 'issue-worklog-time-warning';
                }
                return `<span class="issue-worklog-day">${day}:</span> <span class="${classStr}">${DateTime.toHoursMinutesShortText(byWeekday[day])}</span>`
            }).join(splitter);
        }

    }

    class WorklogActions {

        static copyIssueNumber(event) {
            const worklogItem = State.getWorklog(event.currentTarget.closest('tr').dataset.worklogId);
            navigator.clipboard.writeText(worklogItem.issueKey);
        }

        static copyIssueSummary(event) {
            const worklogItem = State.getWorklog(event.currentTarget.closest('tr').dataset.worklogId);
            const issueDetail = State.getIssue(worklogItem.issueKey);
            navigator.clipboard.writeText(issueDetail.summary);
        }

        static copyParentIssueNumber(event) {
            const worklogItem = State.getWorklog(event.currentTarget.closest('tr').dataset.worklogId);
            const issueDetail = State.getIssue(worklogItem.issueKey);
            navigator.clipboard.writeText(issueDetail.parentKey);
        }

        static copyParentIssueSummary(event) {
            const worklogItem = State.getWorklog(event.currentTarget.closest('tr').dataset.worklogId);
            const issueDetail = State.getIssue(worklogItem.issueKey);
            navigator.clipboard.writeText(issueDetail.parentSummary);
        }

        static copyFullDay(event) {
            const worklogItem = State.getWorklog(event.currentTarget.closest('tr').dataset.worklogId);
            const dayWorklogs = State.getDayWorklogs(worklogItem.dayString);

            if (State.username === 'ycv') {
                const issueKeys = dayWorklogs.map((worklog) => worklog.issueKey);
                navigator.clipboard.writeText(issueKeys.join(', '));
                return;
            }

            const reportingRows = dayWorklogs.reduce((res, worklogItem) => {
                const issueDetail = State.getIssue(worklogItem.issueKey);
                if (!res[issueDetail.parentKey]) {
                    res[issueDetail.parentKey] = {
                        summary: issueDetail.parentSummary,
                        childrenStr: [],
                        childrenKeys: [],
                    };
                }

                if (!res[issueDetail.parentKey].childrenKeys.includes(issueDetail.key)) {
                    res[issueDetail.parentKey].childrenKeys.push(issueDetail.key);
                    res[issueDetail.parentKey].childrenStr.push(`${issueDetail.key}: ${issueDetail.summary}`);
                }

                return res;
            }, {});

            const strings = Object.entries(reportingRows).map(([parentStr, parentIssue]) => {
                let str = '';
                if (parentStr) {
                    str = `${parentStr}: ${parentIssue.summary} (${parentIssue.childrenStr.join(', ')})`;
                } else {
                    str = parentIssue.childrenStr.join('\n');
                }
                return str;
            });

            navigator.clipboard.writeText(strings.join('\n'));
        }

    }

    class WorklogPopoverContent {

        static createWorklogRow(issueWorklog, issueDetail) {
            const tr = DOM.setupElement('tr');
            tr.dataset.worklogId = issueWorklog.worklogId;
            tr.classList.add(`issue-worklog-${issueWorklog.dayString.toLowerCase()}`);

            /* Link */
            const issueCell = WorklogPopoverContent.createLinkCell(issueWorklog, issueDetail);
            WorklogPopoverContent.appendWorklogCell(tr, issueCell);

            /* Summary*/
            const issueSummaryCell = WorklogPopoverContent.createIssueSummaryCell(issueDetail);
            WorklogPopoverContent.appendWorklogCell(tr, issueSummaryCell);

            /* Parent Info*/
            const parentIssueCell = WorklogPopoverContent.createParentIssueCell(issueDetail);
            WorklogPopoverContent.appendWorklogCell(tr, parentIssueCell);

            /* Date Time */
            const dateTimeCell = WorklogPopoverContent.createDateTimeCell(issueWorklog);
            WorklogPopoverContent.appendWorklogCell(tr, dateTimeCell);

            /* Day */
            if (issueWorklog.rowSpan >= 1) {
                const dayCell = WorklogPopoverContent.createDayCell(issueWorklog.dayString);
                WorklogPopoverContent.appendWorklogCell(tr, dayCell);
                dayCell.closest('td').rowSpan = issueWorklog.rowSpan;
            }

            /* Time Spend */
            const timeSpendCell = WorklogPopoverContent.createTimeSpendCell(issueWorklog);
            WorklogPopoverContent.appendWorklogCell(tr, timeSpendCell);

            return tr;
        }

        static createLinkCell(issueWorklog, issueDetail) {
            const typeIcon = Icons.getIssueIcon(issueDetail.type);
            const linkButton = DOM.setupElement('button');
            linkButton.addEventListener('click', (event) => WorklogActions.copyIssueNumber(event));
            const a = DOM.setupElement('a', {
                href: `/browse/${issueWorklog.issueKey}?focusedId=${issueWorklog.worklogId}&page=com.atlassian.jira.plugin.system.issuetabpanels%3Aworklog-tabpanel#worklog-${issueWorklog.worklogId}`,
                target: '_blank',
                textContent: issueWorklog.issueKey,
            });
            const issueCell = DOM.setupElement('div', {
                className: 'worklog-popover-cell',
            });
            linkButton.appendChild(typeIcon);
            issueCell.appendChild(linkButton);
            issueCell.appendChild(a);
            return issueCell;
        }

        static createIssueSummaryCell(issueDetail) {
            const issueSummaryCell = DOM.setupElement('div', {
                className: 'worklog-popover-cell wide',
            });
            const issueSummary = DOM.setupElement('span', {
                title: issueDetail.summary,
                textContent: issueDetail.summary,
            });
            const copySummaryBtn = DOM.setupElement('button', {
                innerHTML: Icons.getSvgIconHtml('copy'),
            });
            copySummaryBtn.addEventListener('click', (event) => WorklogActions.copyIssueSummary(event));
            issueSummaryCell.appendChild(copySummaryBtn);
            issueSummaryCell.appendChild(issueSummary);
            return issueSummaryCell;
        }

        static createParentIssueCell(issueDetail) {
            const parentIssueCell = DOM.setupElement('div', {
                className: 'worklog-popover-cell wide',
            });
            if (!issueDetail.parentKey) {
                return parentIssueCell;
            }

            const parentTypeIcon = Icons.getIssueIcon(issueDetail.parentType);
            const parentTypeButton = DOM.setupElement('button');
            parentTypeButton.addEventListener('click', (event) => WorklogActions.copyParentIssueNumber(event));
            const parentLink = DOM.setupElement('a', {
                href: `https://projects.qad.com/browse/${issueDetail.parentKey}`,
                target: '_blank',
                title: `[${issueDetail.parentType}] ${issueDetail.parentSummary}`,
                textContent: issueDetail.parentKey,
            });
            const parentSummary = DOM.setupElement('span', {
                title: issueDetail.parentSummary,
                textContent: issueDetail.parentSummary,
            });

            const copyParentSummaryBtn = DOM.setupElement('button', {
                innerHTML: Icons.getSvgIconHtml('copy'),
            });
            copyParentSummaryBtn.addEventListener('click', (event) => WorklogActions.copyParentIssueSummary(event));
            parentTypeButton.appendChild(parentTypeIcon);
            parentIssueCell.appendChild(parentTypeButton);
            parentIssueCell.appendChild(parentLink);
            parentIssueCell.appendChild(copyParentSummaryBtn);
            parentIssueCell.appendChild(parentSummary);

            return parentIssueCell;
        }

        static createDateTimeCell(issueWorklog) {
            const dateTimeCell = DOM.setupElement('div', {
                className: 'worklog-popover-cell',
                innerHTML: `<span title="${issueWorklog.dateStr}">${issueWorklog.dateStr}</span>`
            });
            return dateTimeCell;
        }

        static createDayCell(dayString) {
            const dayCell = DOM.setupElement('div');
            dayCell.dataset.day = dayString;
            const copyBtn = DOM.setupElement('button', {
                className: 'worklog-popover-cell',
                innerHTML: Icons.getSvgIconHtml('copy') + dayString,
            });
            copyBtn.addEventListener('click', (event) => WorklogActions.copyFullDay(event));
            dayCell.appendChild(copyBtn);
            return dayCell;
        }

        static createTimeSpendCell(issueWorklog) {
            const timeSpendCell = DOM.setupElement('div', {
                className: 'worklog-popover-cell',
                textContent: issueWorklog.worklogDuration,
            });
            return timeSpendCell;
        }

        static appendWorklogCell(tr, content) {
            const td = DOM.setupElement('td');
            td.appendChild(content);
            tr.appendChild(td);
        }

    }

    class WorklogPopoverTemplate {

        static createPopup() {
            State.element?.remove();

            State.element = DOM.setupElement('div', {
                id: WorklogStyles.POPOVER_ID,
            });

            const header = WorklogPopoverTemplate.createHeader();
            const content = WorklogPopoverTemplate.createContent();
            const footer = WorklogPopoverTemplate.createFooter();

            State.element.appendChild(header);
            State.element.appendChild(content);
            State.element.appendChild(footer);

            document.body.appendChild(State.element);
        }

        static createHeader() {
            const header = DOM.setupElement('div', {
                className: 'issue-worklog-header',
                textContent: "Issues Worklog Details",
            });

            const themeBtn = WorklogTheme.createButton();

            const refreshBtn = DOM.setupElement('button', {
                textContent: 'Refresh',
            });
            refreshBtn.addEventListener('click', (event) => WorklogPopover.main());

            const prevWeekBtn = DOM.setupElement('button', {
                textContent: 'Prev Week',
            });
            prevWeekBtn.addEventListener('click', (event) => {
                State.dateOffset += 7;
                WorklogPopover.main();
            });

            const nextWeekBtn = DOM.setupElement('button', {
                textContent: 'Next Week',
            });
            nextWeekBtn.addEventListener('click', (event) => {
                State.dateOffset -= 7;
                WorklogPopover.main();
            });

            const closeBtn = DOM.setupElement('button', {
                className: 'issue-worklog-popover-close-btn',
                innerHTML: Icons.getSvgIconHtml('close'),
            });
            closeBtn.addEventListener('click', () => {
                State.element.remove();
                document.querySelector('#worklog-button').disabled = false;
            });

            const navigationButtonsWrapper = DOM.setupElement('div', {
                className: 'issue-worklog-header-btn-wrapper',
            });
            navigationButtonsWrapper.appendChild(prevWeekBtn);
            navigationButtonsWrapper.appendChild(nextWeekBtn);

            const rangeElem = DOM.setupElement('div', {
                className: 'issue-worklog-header-range',
            });

            header.appendChild(themeBtn);
            header.appendChild(refreshBtn);
            header.appendChild(rangeElem);
            header.appendChild(navigationButtonsWrapper);
            header.appendChild(closeBtn);

            return header;
        }

        static createContent() {
            const table = DOM.setupElement('table');
            const thead = DOM.setupElement('thead');
            const headRow = DOM.setupElement('tr');
            thead.appendChild(headRow);

            ['Issue', 'Summary', 'Parent', 'Date', 'Day','Time'].forEach((text) => {
                const th = DOM.setupElement('th', {
                    textContent: text,
                });
                headRow.appendChild(th);
            });

            table.appendChild(thead);
            const tbody = DOM.setupElement('tbody');
            tbody.innerHTML = '<tr><td colspan="6">&nbsp;</td></tr>';
            table.appendChild(tbody);

            return table;
        }

        static createFooter() {
            const footer = DOM.setupElement('div', {
                className: 'issue-worklog-popover-footer',
            });

            return footer;
        }

    }

    class WorklogSpinner {

        static createSpinner(parentElement) {
            const overlay = DOM.setupElement('div', {
                className: 'spinner-overlay',
            });
            const spinner = DOM.setupElement('div', {
                className: 'spinner',
            });
            overlay.appendChild(spinner);
            parentElement.appendChild(overlay);
        }

        static removeSpinner(parentElement) {
            const overlay = parentElement.querySelector(`.spinner-overlay`);
            overlay.remove();
        }

    }

    class WorklogStyles {

        static STYLE_ID = 'userjs-worklog';

        static POPOVER_ID = 'issue-worklog-popover';

        static create() {
            if (document.getElementById(WorklogStyles.STYLE_ID)) {
                return;
            }

            const style = DOM.setupElement('style');
            style.id = WorklogStyles.STYLE_ID;
            style.textContent = WorklogStyles.css;
            document.head.appendChild(style);
        }

        static get css() {
            return `#${WorklogStyles.POPOVER_ID} {
                ${WorklogStyles.cssMain}
                ${WorklogStyles.cssLayout}
                ${WorklogStyles.cssTable}
                ${WorklogStyles.cssButton}
                ${WorklogStyles.cssSpinner}
            }`;
        }

        static get cssParameters() {
            return `
                --wl-bg: light-dark(#ffffff, #1d2125);
                --wl-fg: light-dark(#111111, #f4f5f7);
                --wl-muted: light-dark(#737373, #9aa0a6);
                --wl-border: light-dark(#cccccc, #444851);
                --wl-overlay: color-mix(in srgb, var(--wl-bg) 70%, transparent);
                --wl-focus: #3b82f6;
                --wl-btn: light-dark(#64748b, #a8b3c2);
                --wl-btn-hover: light-dark(#0f172a, #ffffff);
                --wl-ok: light-dark(#008a2e, #3ddc84);
                --wl-warn: light-dark(#8a7f00, #e6c200);
                --wl-error: light-dark(#c62828, #ff8a80);
                --wl-spinner-track: light-dark(#e0e0e0, #3a3f46);
                --wl-spinner-accent: light-dark(#333333, #f4f5f7);
                --wl-day-mon: light-dark(#e6f3ff, #1a2a3a);
                --wl-day-tue: light-dark(#f7efe5, #2a241c);
                --wl-day-wed: light-dark(#e8f9eb, #1c2a1f);
                --wl-day-thu: light-dark(#f9f8e8, #2a2a1c);
                --wl-day-fri: light-dark(#e8ebf9, #1c1f2a);
                --wl-day-sat: light-dark(#ffc7c7, #3a1f1f);
                --wl-day-sun: light-dark(#ff9f9f, #4a1f1f);
                --wl-space-xs: 0.2rem;
                --wl-space-sm: 0.5rem;
                --wl-space-md: 0.6rem;
                --wl-space-lg: 1rem;
                --wl-radius: 1rem;
                --wl-radius-sm: 0.1875rem;
                --wl-transition: 150ms ease;
                --wl-cell-max: clamp(26ch, 46vw - 26ch, 84ch);
            `;
        }

        static get cssMain() {
            return `
                color-scheme: light dark;

                ${WorklogStyles.cssParameters}

                box-sizing: border-box;
                position: fixed;
                inset-block-start: 3rem;
                inset-inline-end: 1.5rem;
                z-index: 99999;
                min-inline-size: 800px;
                max-block-size: 90vh;
                overflow: auto;
                overscroll-behavior: contain;
                background: var(--wl-bg);
                color: var(--wl-fg);
                border: 4px solid var(--wl-border);
                border-radius: var(--wl-radius);
                padding: var(--wl-space-sm);
                isolation: isolate;

                &[data-theme='light'] {
                    color-scheme: light;
                }

                &[data-theme='dark'] {
                    color-scheme: dark;
                }

                & *,
                & *::before,
                & *::after {
                    box-sizing: border-box;
                }
            `;
        }

        static get cssLayout() {
            return `
                & :is(.issue-worklog-header, .issue-worklog-popover-footer) {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: var(--wl-space-lg);
                    font-size: 1.1rem;
                    font-weight: 600;
                }

                & .issue-worklog-popover-footer {
                    padding-inline: var(--wl-space-sm);
                }

                & .issue-worklog-header-btn-wrapper {
                    display: flex;
                    gap: var(--wl-space-lg);
                }

                & .issue-worklog-header-range {
                    font-size: 0.8rem;
                    color: var(--wl-muted);
                }
            `;
        }

        static get cssTable() {
            return `
                & table {
                    border-collapse: collapse;
                    margin: 0;
                    margin-block-end: var(--wl-space-lg);
                    inline-size: 100%;
                }

                & :where(tbody, thead) {
                    border-block-end: none;
                }

                & :is(th, td) {
                    white-space: nowrap;
                    padding-block: var(--wl-space-xs);
                    padding-inline: var(--wl-space-md);
                    border: 1px solid var(--wl-border);
                }

                & .worklog-popover-cell {
                    display: flex;
                    align-items: center;
                    gap: var(--wl-space-xs);

                    &.wide {
                        max-inline-size: var(--wl-cell-max);
                        overflow: hidden;
                    }

                    & span {
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        min-inline-size: 0;
                    }
                }

                & .issue-worklog-day {
                    font-weight: 600;
                }

                & .issue-worklog-time-normal {
                    color: var(--wl-ok);
                }

                & .issue-worklog-time-error {
                    color: var(--wl-error);
                }

                & .issue-worklog-time-warning {
                    color: var(--wl-warn);
                }

                & .issue-worklog-splitter {
                    color: var(--wl-muted);
                }

                & tr {
                    &.issue-worklog-monday { background-color: var(--wl-day-mon); }
                    &.issue-worklog-tuesday { background-color: var(--wl-day-tue); }
                    &.issue-worklog-wednesday { background-color: var(--wl-day-wed); }
                    &.issue-worklog-thursday { background-color: var(--wl-day-thu); }
                    &.issue-worklog-friday { background-color: var(--wl-day-fri); }
                    &.issue-worklog-saturday { background-color: var(--wl-day-sat); }
                    &.issue-worklog-sunday { background-color: var(--wl-day-sun); }
                }
            `;
        }

        static get cssButton() {
            return `
                & button {
                    appearance: none;
                    font: inherit;
                    line-height: 1;
                    padding: 0;
                    border: 0;
                    border-radius: var(--wl-radius-sm);
                    display: inline-grid;
                    place-items: center;
                    color: var(--wl-btn);
                    background: transparent;
                    cursor: pointer;
                    transition:
                        color var(--wl-transition),
                        background-color var(--wl-transition),
                        transform var(--wl-transition);

                    &:hover {
                        color: var(--wl-btn-hover);
                        transform: scale(1.1);
                    }

                    &:active {
                        transform: scale(0.9);
                    }

                    &:focus-visible {
                        outline: 2px solid var(--wl-focus);
                        outline-offset: 2px;
                    }

                    &:disabled {
                        opacity: 0.4;
                        cursor: not-allowed;
                        transform: none;
                    }

                    & svg {
                        inline-size: 1rem;
                        block-size: 1rem;
                    }

                    &.issue-worklog-popover-close-btn svg {
                        inline-size: 2rem;
                        block-size: 2rem;
                    }

                    &.issue-worklog-theme-btn svg {
                        inline-size: 1.25rem;
                        block-size: 1.25rem;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    & button {
                        transition: none;

                        &:is(:hover, :active) {
                            transform: none;
                        }
                    }
                }
            }`;
        }

        static get cssSpinner() {
            return `
                & .spinner-overlay {
                    position: absolute;
                    inset: 0;
                    display: grid;
                    place-items: center;
                    background: var(--wl-overlay);
                }

                & .spinner {
                    inline-size: 2.5rem;
                    block-size: 2.5rem;
                    border: 0.25rem solid var(--wl-spinner-track);
                    border-block-start-color: var(--wl-spinner-accent);
                    border-radius: 50%;
                    animation: issue-worklog-spin 0.8s linear infinite;
                }

                @media (prefers-reduced-motion: reduce) {
                    & .spinner {
                        animation: none;
                        border-color: var(--wl-spinner-accent);
                    }
                }

                @keyframes issue-worklog-spin {
                    to { transform: rotate(360deg); }
                }
            `;
        }
    }

    class WorklogTheme {

        static STORAGE_KEY = 'worklog-theme';

        static MODES = ['system', 'light', 'dark'];

        static read() {
            try {
                const mode = localStorage.getItem(WorklogTheme.STORAGE_KEY);
                return WorklogTheme.MODES.includes(mode) ? mode : 'system';
            } catch {
                return 'system';
            }
        }

        static nextMode(mode) {
            const index = WorklogTheme.MODES.indexOf(mode);
            return WorklogTheme.MODES[(index + 1) % WorklogTheme.MODES.length];
        }

        static apply(mode = WorklogTheme.read()) {
            State.element.dataset.theme = mode;
            const button = State.element.querySelector('.issue-worklog-theme-btn');
            button.innerHTML = Icons.getSvgIconHtml(mode);
            button.title = mode;
        }

        static createButton() {
            const button = DOM.setupElement('button', {
                className: 'issue-worklog-theme-btn',
            });
            button.addEventListener('click', () => {
                const mode = WorklogTheme.nextMode(State.element.dataset.theme);
                localStorage.setItem(WorklogTheme.STORAGE_KEY, mode);
                WorklogTheme.apply(mode);
            });
            return button;
        }
    }

    class JiraApi {

        static async getIssueWorklog(issueKey) {
            const response = await JiraApi.fetchIssueWorklog(issueKey);

            const issueWorklog = response.worklogs.map((worklogItem) => {
                const worklogItemDate = DateTime.parseJiraDate(worklogItem.started);
                return {
                    issueKey: issueKey,
                    worklogId: worklogItem.id,
                    user: worklogItem.author.name,
                    date: worklogItemDate,
                    comment: worklogItem.comment,
                    worklogDuration: worklogItem.timeSpent,
                    timeSpentSeconds: worklogItem.timeSpentSeconds,
                };
            });

            return issueWorklog;
        }

        static async fetchIssueWorklog(issueKey) {
            const apiUsername = document.querySelector('#header-details-user-fullname').dataset.username;
            const res = await fetch(`https://projects.qad.com/rest/api/2/issue/${issueKey}/worklog`, {
                headers: {
                    'x-ausername': apiUsername,
                    'x-pjax': 'true',
                },
                method: 'GET'
            });

            const response = await res.json();
            if (!res.ok) {
                throw new Error(`JiraApi.fetchIssueWorklog: ${res.status}`);
            }

            return response;
        }

        static async getIssueKeys(beginDate, endDate) {
            const beginDateString = DateTime.toYMD(beginDate);
            const endDateString = DateTime.toYMD(endDate);
            const response = await JiraApi.fetchIssueTables(beginDateString, endDateString);
            return response?.issueTable?.issueKeys || [];
        }

        static async fetchIssueTables(beginDateString, endDateString) {
            const res = await fetch('https://projects.qad.com/rest/issueNav/1/issueTable', {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'x-atlassian-token': 'no-check'
                },
                body: `startIndex=0&jql=worklogAuthor+%3D+${State.username}+and+worklogDate+%3E%3D+${beginDateString}+AND+worklogDate+%3C%3D+${endDateString}&layoutKey=list-view`,
                method: 'POST'
            });

            const response = await res.json();
            if (!res.ok) {
                throw new Error(`JiraApi.fetchIssueTables: ${res.status}`);
            }

            return response;
        }

        static async getIssueParentInfo(issueKey) {
            const response = await JiraApi.fetchIssueParentInfo(issueKey);
            const fields = response.fields;
            const parent = fields.parent;
            return {
                key: response.key,
                summary: fields.summary,
                type: fields.issuetype?.name ?? '',
                parentKey: parent?.key ?? '',
                parentType: parent?.fields?.issuetype?.name ?? '',
                parentSummary: parent?.fields?.summary ?? '',
            };
        }

        static async fetchIssueParentInfo(issueKey) {
            const res = await fetch(`https://projects.qad.com/rest/api/2/issue/${issueKey}?fields=issuetype,parent,summary`, {
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                },
            });

            const response = await res.json();
            if (!res.ok) {
                throw new Error(`JiraApi.fetchIssueParentInfo: ${res.status}`);
            }

            return response;
        }

    }

    class DateTime {

        static toYMD(date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        static getWeekRangeDates(date = new Date()) {
            const previousSunday = DateTime.getPreviousSunday(date);
            const nextSunday = DateTime.getNextSunday(date);
            return [ previousSunday, nextSunday ];
        }

        static getPreviousSunday(date = new Date()) {
            const sunday = new Date(date);
            sunday.setDate(date.getDate() - date.getDay()); // getDay(): Sun=0 .. Sat=6
            sunday.setHours(0, 0, 0, 0);
            return sunday;
        }

        static getNextSunday(date = new Date()) {
            const sunday = new Date(date);
            const day = date.getDay(); // getDay(): Sun=0 .. Sat=6
            const daysUntilSunday = day === 0 ? 7 : 7 - day; // if today is Sunday, jump a week ahead
            sunday.setDate(date.getDate() + daysUntilSunday);
            sunday.setHours(0, 0, 0, 0);
            return sunday;
        }

        static toHoursMinutesShortText(min) {
            const { hours, minutes } = DateTime.toHoursMinutes(min);
            return `${hours}h ${minutes}m`;
        }

        static toHoursMinutes(min) {
            const hours = Math.floor(min / 60);
            const minutes = min % 60;
            return { hours, minutes };
        }

        static toMinutes(str) {
            let total = 0;
            const days = str.match(/(\d+)\s*d(?:ays?)?/);
            const hours = str.match(/(\d+)\s*h(?:ours?)?/);
            const minutes = str.match(/(\d+)\s*m(?:inutes?)?/);
            if (days) {
                total += Number(days[1]) * 8 * 60;
            }
            if (hours) {
                total += Number(hours[1]) * 60;
            }
            if (minutes) {
                total += Number(minutes[1]);
            }
            return total;
        }

        static parseJiraDate(jiraDateString) {
            const normalized = jiraDateString.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
            const date = new Date(normalized);
            if (Number.isNaN(date.getTime())) {
                throw new Error(`Invalid JIRA date: ${jiraDate}`);
            }
            return date;
        }

    }

    class Icons {

        static get issueImages() {
            return {
                ['STORY TASK']: '<img src="https://projects.qad.com/images/icons/issuetypes/task_agile.png" height="16" width="16" border="0" align="absmiddle" title="Story task">',
                ['SUB-TASK']: '<img src="https://projects.qad.com/secure/viewavatar?size=xsmall&avatarId=18756&avatarType=issuetype" height="16" width="16" border="0" align="absmiddle" title="Sub-Task">',
                ['STORY DEFECT']: '<img src="https://projects.qad.com/secure/viewavatar?size=xsmall&amp;avatarId=18743&amp;avatarType=issuetype" height="16" width="16" border="0" align="absmiddle" title="Story Defect">',
                ['DEFECT']: '<img src="https://projects.qad.com/secure/viewavatar?size=xsmall&amp;avatarId=18743&amp;avatarType=issuetype" height="16" width="16" border="0" align="absmiddle" title="Defect">',
                ['TASK']: '<img src="https://projects.qad.com/secure/viewavatar?size=xsmall&amp;avatarId=18758&amp;avatarType=issuetype" height="16" width="16" border="0" align="absmiddle" title="Task">',
                ['STORY']: '<img src="https://projects.qad.com/secure/viewavatar?size=xsmall&amp;avatarId=18755&amp;avatarType=issuetype" height="16" width="16" border="0" align="absmiddle" title="Story">',
                ['INCIDENT']: '<img src="https://projects.qad.com/images/icons/issuetypes/health.png" height="16" width="16" border="0" align="absmiddle" title="Incident">',
                ['ASSISTANCE']: '<img src="https://projects.qad.com/secure/viewavatar?size=xsmall&amp;avatarId=20341&amp;avatarType=issuetype" height="16" width="16" border="0" align="absmiddle" title="Assistance">',
            };
        }

        static get svgIcons() {
            return {
                system: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
                light: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
                dark: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
                copy: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
                close: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
            };
        }

        static getIssueIcon(type) {
            const div = DOM.setupElement('div');
            div.innerHTML = Icons.issueImages[type.toUpperCase()] || `<img src="" height="16" width="16" border="0" align="absmiddle" alt="" title=${type}>`;
            return div.firstChild;
        }

        static getSvgIconHtml(name) {
            return Icons.svgIcons[name] || '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0 0"></svg>';
        }

    }

    class DOM {

        static setupElement(tag, properties, styles) {
            const element = typeof tag === 'string'
                ? Object.assign(document.createElement(tag), properties)
                : tag;
            Object.assign(element.style, styles);
            return element;
        }

    }

    class JiraWorklogMainButton {

        static init() {
            WorklogStyles.create();
            JiraWorklogMainButton.placeWorklogButton();
        }

        static placeWorklogButton() {
            const header = document.querySelector('#jira-header-feedback-link').closest('li');
            const wrapper = DOM.setupElement('li');
            const openButton = JiraWorklogMainButton.createWorklogButton();
            wrapper.appendChild(openButton);
            header.insertAdjacentElement('beforeBegin', wrapper);
        }

        static createWorklogButton() {
            const openButton = DOM.setupElement('button', {
                id: 'worklog-button',
                className: 'aui-button aui-button-primary aui-style',
                style: '--aui-button-primary-bg-color: #1d2125; --aui-button-primary-hover-bg-color: #1a551a;',
                innerText: 'L',
            });
            openButton.addEventListener('click', (event) => {
                event.currentTarget.disabled = true;
                WorklogPopover.main();
            });
            return openButton;
        }

    }

    JiraWorklogMainButton.init();

})();
