import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Bounded completed-task history with explicit reuse validation. */
import { useEffect, useRef, useState } from 'react';
import { TaskWorkDetails, taskWorkStateKey } from "./TaskWork.js";
import css from './TeamView.module.css';
const PAGE_SIZE = 20;
/**
 * Read completed tasks only when the archive is opened, then recheck before reuse.
 * @param props - Selected Team, bounded Remote archive, and locale.
 * @returns one archive page and explicit validation results.
 */
export function TeamTaskArchive({ sessionId, operations, t }) {
    const [page, setPage] = useState(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [cursors, setCursors] = useState([undefined]);
    const [opened, setOpened] = useState(false);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(null);
    const [checks, setChecks] = useState({});
    const [error, setError] = useState(null);
    const [failedPage, setFailedPage] = useState(null);
    const lifetime = useRef(new AbortController());
    const inFlight = useRef(false);
    const validating = useRef(false);
    useEffect(() => {
        const controller = new AbortController();
        lifetime.current = controller;
        setPage(null);
        setPageIndex(0);
        setCursors([undefined]);
        setOpened(false);
        setLoading(false);
        setBusy(null);
        setChecks({});
        setError(null);
        setFailedPage(null);
        inFlight.current = false;
        validating.current = false;
        return () => { controller.abort(); };
    }, [sessionId]);
    const load = async (after, index) => {
        if (inFlight.current)
            return;
        inFlight.current = true;
        setLoading(true);
        setError(null);
        setFailedPage(null);
        const signal = lifetime.current.signal;
        try {
            const loaded = await operations.archive(sessionId, after, PAGE_SIZE);
            if (!signal.aborted) {
                setPage(loaded);
                setPageIndex(index);
                setCursors(current => [...current.slice(0, index), after]);
                setChecks({});
            }
        }
        catch {
            if (!signal.aborted) {
                setError(t('archive.loadFailed'));
                setFailedPage({ after, index });
            }
        }
        finally {
            if (!signal.aborted) {
                inFlight.current = false;
                setLoading(false);
            }
        }
    };
    const validate = async (task) => {
        if (validating.current)
            return;
        validating.current = true;
        setBusy(task.id);
        setError(null);
        const signal = lifetime.current.signal;
        try {
            const check = await operations.validateReuse(sessionId, task.id, signal);
            if (!signal.aborted)
                setChecks(current => ({ ...current, [task.id]: check }));
        }
        catch {
            if (!signal.aborted)
                setError(t('archive.validateFailed'));
        }
        finally {
            if (!signal.aborted) {
                validating.current = false;
                setBusy(null);
            }
        }
    };
    const tasks = page?.tasks ?? [];
    const next = page?.nextCursor;
    return _jsxs("section", { className: css.archive, children: [_jsx("button", { type: "button", className: css.button, "aria-expanded": opened, onClick: () => {
                    setOpened(value => !value);
                    if (!opened && page === null)
                        void load(undefined, 0);
                }, children: t('archive.title') }), opened && _jsxs(_Fragment, { children: [_jsx("p", { className: css.hint, children: t('archive.hint') }), page !== null && _jsx("button", { type: "button", className: css.button, disabled: loading, onClick: () => { void load(undefined, 0); }, children: t('archive.refresh') }), error !== null && _jsx("p", { role: "alert", className: css.error, children: error }), loading && _jsx("p", { role: "status", children: t('archive.loading') }), !loading && page !== null && tasks.length === 0 && _jsx("p", { children: t('archive.empty') }), tasks.map((task) => {
                        const check = checks[task.id];
                        const changed = check !== undefined && check.revision !== task.revision;
                        return _jsxs("details", { className: css.task, children: [_jsxs("summary", { children: [_jsx("strong", { children: task.subject }), _jsx("span", { children: task.ownerName ?? t('unowned') }), _jsx("span", { children: t(taskWorkStateKey(task) ?? 'status.completed') })] }), _jsxs("div", { className: css.taskBody, children: [_jsx("p", { children: task.description }), task.result !== undefined && _jsxs("section", { children: [_jsx("h4", { children: t('task.recordedResult') }), _jsx("p", { children: task.result })] }), task.evidence !== undefined && task.evidence.length > 0 && _jsxs("section", { children: [_jsx("h4", { children: t('task.evidence') }), _jsx("ul", { children: task.evidence.map((entry, index) => _jsx("li", { children: entry }, index)) })] }), _jsx(TaskWorkDetails, { task: task, t: t }), _jsx("button", { type: "button", className: css.button, disabled: busy !== null, onClick: () => { void validate(task); }, children: t('archive.validate') }), check === undefined ? _jsx("p", { className: css.hint, children: t('archive.unchecked') })
                                            : _jsxs("div", { role: "status", children: [_jsx("strong", { children: t(!changed && check.validity.reusable ? 'archive.reusable' : 'archive.stale') }), changed && _jsx("p", { children: t('archive.changed') }), check.validity.reasons.length > 0 && _jsx("ul", { children: check.validity.reasons.map(reason => _jsx("li", { children: reason }, reason)) })] })] })] }, task.id);
                    }), pageIndex > 0 && _jsx("button", { type: "button", className: css.button, disabled: loading, onClick: () => { void load(cursors[pageIndex - 1], pageIndex - 1); }, children: t('archive.previous') }), next !== undefined && _jsx("button", { type: "button", className: css.button, disabled: loading, onClick: () => { void load(next, pageIndex + 1); }, children: t('archive.more') }), failedPage !== null && _jsx("button", { type: "button", className: css.button, onClick: () => { void load(failedPage.after, failedPage.index); }, children: t('archive.retry') })] })] });
}
