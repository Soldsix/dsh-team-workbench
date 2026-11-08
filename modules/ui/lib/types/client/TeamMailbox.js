import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Bounded mailbox history and explicit human recovery controls. */
import { useEffect, useRef, useState } from 'react';
import css from './TeamMailbox.module.css';
const PAGE_SIZE = 20;
/** Mailbox pagination is remote and sends message content only after selection. */
export function TeamMailbox({ sessionId, leadId, members, operations, t }) {
    const [offset, setOffset] = useState(0);
    const [refresh, setRefresh] = useState(0);
    const [page, setPage] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const lifetime = useRef(new AbortController());
    const isLead = sessionId === leadId;
    useEffect(() => {
        const controller = new AbortController();
        lifetime.current = controller;
        return () => { controller.abort(); };
    }, []);
    useEffect(() => {
        let current = true;
        setPage(null);
        void operations.list(sessionId, offset, PAGE_SIZE).then((value) => {
            if (current) {
                setPage(value);
                setError(null);
            }
        }, () => { if (current)
            setError(t('mailbox.loadFailed')); });
        return () => { current = false; };
    }, [sessionId, offset, refresh, operations, t]);
    useEffect(() => {
        let current = true;
        setDetail(null);
        if (selectedId !== null)
            void operations.get(sessionId, selectedId).then((value) => {
                if (current) {
                    setDetail(value);
                    setError(null);
                }
            }, () => { if (current)
                setError(t('mailbox.detailFailed')); });
        return () => { current = false; };
    }, [sessionId, selectedId, operations, t]);
    const run = async (kind, message) => {
        setBusy(message.id);
        setError(null);
        setNotice(null);
        try {
            const result = await operations[kind](sessionId, message.id, lifetime.current.signal);
            if (lifetime.current.signal.aborted)
                return;
            setNotice(t(result.status === 'accepted' ? 'mailbox.accepted' : 'mailbox.queued'));
            setOffset(0);
            setRefresh(value => value + 1);
        }
        catch {
            if (!lifetime.current.signal.aborted)
                setError(t('mailbox.actionFailed'));
        }
        finally {
            if (!lifetime.current.signal.aborted)
                setBusy(null);
        }
    };
    const targetName = (id) => members.find(member => member.id === id)?.name ?? String(id);
    return _jsxs("div", { className: css.page, children: [_jsxs("div", { className: css.heading, children: [_jsx("p", { children: t('mailbox.hint') }), _jsx("button", { type: "button", onClick: () => { setRefresh(value => value + 1); }, children: t('mailbox.refresh') })] }), error !== null && _jsx("p", { role: "alert", className: css.error, children: error }), notice !== null && _jsx("p", { role: "status", children: notice }), page === null ? _jsx("p", { role: "status", children: t('mailbox.loading') }) : _jsxs(_Fragment, { children: [page.total === 0 ? _jsx("p", { children: t('mailbox.empty') }) : _jsx("ul", { className: css.list, children: page.items.map(message => _jsxs("li", { className: css.item, children: [_jsxs("div", { className: css.row, children: [_jsxs("button", { type: "button", className: css.message, onClick: () => { setSelectedId(selectedId === message.id ? null : message.id); }, "aria-expanded": selectedId === message.id, children: [_jsxs("strong", { children: [message.senderName, " \u2192 ", targetName(message.targetId)] }), _jsxs("span", { children: [t(`mailbox.status.${message.status}`), " \u00B7 ", message.goalRevision === undefined
                                                            ? t('mailbox.unversioned') : t('mailbox.goalRevision', { revision: message.goalRevision })] })] }), (message.status === 'pending' || message.status === 'retry-exhausted') && _jsx("button", { type: "button", disabled: busy !== null, onClick: () => { void run('retry', message); }, children: t('mailbox.retry') }), message.status === 'quarantined' && isLead && _jsx("button", { type: "button", disabled: busy !== null, onClick: () => { void run('adopt', message); }, children: t('mailbox.adopt') })] }), message.error !== undefined && _jsx("p", { className: css.error, children: message.error }), message.status === 'retry-exhausted' && _jsx("p", { children: t('mailbox.exhausted', { attempts: message.attempts }) }), selectedId === message.id && _jsx("div", { className: css.detail, children: detail?.id !== message.id ? _jsx("p", { role: "status", children: t('mailbox.loadingDetail') }) : _jsxs(_Fragment, { children: [_jsxs("p", { children: [t('mailbox.id'), ": ", detail.id] }), detail.adoptedFrom !== undefined && _jsxs("p", { children: [t('mailbox.adoptedFrom'), ": ", detail.adoptedFrom] }), detail.content.map((block, index) => block.type === 'text'
                                                ? _jsx("p", { className: css.body, children: block.text }, index)
                                                : _jsx("p", { children: t('mailbox.nonText') }, index))] }) })] }, message.id)) }), _jsxs("nav", { className: css.pagination, "aria-label": t('mailbox.pagination'), children: [_jsx("button", { type: "button", disabled: offset === 0, onClick: () => { setOffset(Math.max(0, offset - PAGE_SIZE)); setSelectedId(null); }, children: t('mailbox.previous') }), _jsx("span", { children: t('mailbox.range', { start: page.total === 0 ? 0 : offset + 1, end: offset + page.items.length, total: page.total }) }), _jsx("button", { type: "button", disabled: offset + page.items.length >= page.total, onClick: () => { setOffset(offset + PAGE_SIZE); setSelectedId(null); }, children: t('mailbox.next') })] })] })] });
}
