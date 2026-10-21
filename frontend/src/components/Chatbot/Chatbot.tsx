// Bring in the tools for the chatbot view so this file can work with the rest of the application.
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Link } from "react-router";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { api } from "../../lib/api";
import { chatbotHistory } from "./chatbot-history";
import { readChatSession, saveChatSession, type ChatReply } from "./chatbot-session";

import "./Chatbot.css";

// Format the service price so the customer can understand the displayed cost.
const price = (value: string) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value));
const topics = [
  { icon: "✧", title: "Find my service", detail: "A little guidance for your next visit", question: "Help me choose a service" },
  { icon: "☷", title: "Services & prices", detail: "Explore treatments and pricing", question: "Services and prices" },
  { icon: "◷", title: "Plan my visit", detail: "Opening hours and booking help", question: "Opening hours" },
];

// Show the salon conversation and reply choices so customers can ask for help while browsing.
export function Chatbot({ embedded = false, compact = false, active = true }: { embedded?: boolean; compact?: boolean; active?: boolean } = {}) {
  // Remember the current choices and screen status so the page can respond as the user works.
  const [savedSession] = useState(readChatSession);
  const [history, setHistory] = useState(savedSession.history);
  const [message, setMessage] = useState(savedSession.draft);
  const [pending, setPending] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answerAnimation, setAnswerAnimation] = useState<{ reply: ChatReply; sequence: number } | null>(null);
  const submitting = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);

  // Keep this view in step with its current inputs so changes are reflected on screen.
  useEffect(() => {
    saveChatSession({ history, draft: message || pending });
  }, [history, message, pending]);

  // Keep this view in step with its current inputs so changes are reflected on screen.
  useEffect(() => {
    const region = transcript.current;
    if (active && region) region.scrollTo({ top: region.scrollHeight, behavior: "instant" });
  }, [active, history, pending, error]);
  // Move keyboard focus to the active control so the user can continue without searching through the page.
  useEffect(() => {
    if (active && !busy && (history.length > 0 || error)) input.current?.focus({ preventScroll: true });
  }, [active, busy, history.length, error]);
  // Keep this view in step with its current inputs so changes are reflected on screen.
  useEffect(() => {
    if (input.current) {
      input.current.style.height = "auto";
      input.current.style.height = `${Math.min(input.current.scrollHeight, 120)}px`;
    }
  }, [message, active]);

  // Send the customer question and add the reply so the chat conversation can continue.
  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || submitting.current) return;
    submitting.current = true;
    setBusy(true); setError(""); setPending(trimmed); setMessage("");
    try {
      const reply = await api<ChatReply>("/chatbot", { method: "POST", body: JSON.stringify({ message: trimmed, history: chatbotHistory(history) }) });
      setAnswerAnimation(previous => ({ reply, sequence: (previous?.sequence ?? 0) + 1 }));
      setHistory(h => [...h.slice(-19), { question: trimmed, reply }]);
      setPending("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally { submitting.current = false; setBusy(false); }
  }
  // Handle the submitted form so the selected action can use the entered details.
  function submit(e: FormEvent) { e.preventDefault(); void ask(message); }
  // Clear the conversation so the visitor can start a fresh salon question.
  function reset() {
    setAnswerAnimation(null);
    setHistory([]); setPending(""); setMessage(""); setError(""); input.current?.focus();
  }
  // Show the prepared content and actions so the user can review the information and continue.
  return <section className={`salon-guide tw:customer:max-w-[1000px]  chat-page tw:[&_.wordmark]:mb-7.5 tw:[&_button:disabled]:cursor-default tw:[&_button:disabled]:opacity-[.45] tw:[&_a:hover]:underline tw:[&_a:hover]:underline-offset-[3px] tw:[&_:focus-visible]:[outline:3px_solid_#a58a36] tw:[&_:focus-visible]:outline-offset-[3px] ${compact ? " chat-page--compact tw:[.chat-widget_&]:flex tw:[.chat-widget_&]:flex-col tw:[.chat-widget_&]:flex-1 tw:[.chat-widget_&]:min-h-0 tw:[.chat-widget_&]:w-full tw:[.chat-widget_&]:max-w-none tw:[.chat-widget_&]:m-0 tw:[.chat-widget_&]:p-0 " : embedded ? " container public:w-[min(1280px,calc(100%_-_96px))] public:mx-auto public:down-1023:w-[calc(100%_-_48px)] public:down-639:w-[calc(100%_-_36px)] " : " workspace-main tw:max-w-[1200px] tw:m-auto tw:[padding:60px_32px_80px] tw:[&>h1]:text-[46px] tw:[&>h1]:mb-2 tw:down-760:py-9.5 tw:down-760:px-5 tw:down-760:[&>h1]:text-[38px] "}`} aria-label={compact ? "Salon recommendations" : undefined} aria-labelledby={compact ? undefined : "chat-title"}>
    {!embedded && !compact && <Link className="wordmark tw:text-[27px] tw:tracking-[.16em] tw:no-underline tw:font-semibold tw:inline-flex tw:flex-col
          tw:[&_span]:text-[10px] tw:[&_span]:tracking-[.5em] tw:[&_span]:mt-1.5 tw:[.intro_&]:self-start
          tw:leading-[1.2]" to="/">CLIQUE<span>SALON</span></Link>}
    {!compact && <div className="chat-page-heading tw:flex tw:items-center tw:justify-between tw:gap-6 tw:mb-7.5 tw:[&_.eyebrow]:text-[#856d25]
          tw:[&_.eyebrow]:mb-3 tw:[&_.eyebrow]:text-[10px] tw:down-639:mb-5.5 tw:down-639:items-start"><div><p className="eyebrow public:text-[12px] public:tracking-[0.17em] public:font-bold public:text-[#987b1f]
          public:down-639:text-[11px] tw:text-[11px] tw:tracking-[.18em] tw:font-bold tw:mb-5 tw:[.cashier-main>&]:mb-2.5">A LITTLE GUIDANCE, JUST FOR YOU</p><h1 id="chat-title">Your next good hair day<br />starts here.</h1><p>Explore services, plan your visit, or find a little beauty inspiration.</p></div><Link className="chat-book-link tw:flex tw:gap-7 tw:py-[13px] tw:px-5 tw:[border:1px_solid_#d4d3c9] tw:rounded-[30px]
          tw:no-underline tw:whitespace-nowrap tw:text-[13px] tw:font-semibold tw:hover:[background:#ebe7d9]
          tw:down-639:hidden" to="/availability">Book a visit </Link></div>}
    <div className="chat-layout tw:grid tw:grid-cols-[290px_minmax(0,1fr)] tw:[border:1px_solid_#deded5] tw:rounded-[24px]
          tw:overflow-hidden tw:[background:white] tw:[.chat-page--compact_&]:flex tw:[.chat-page--compact_&]:flex-1
          tw:[.chat-page--compact_&]:min-h-0 tw:[.chat-page--compact_&]:[border:0]
          tw:[.chat-page--compact_&]:rounded-none tw:down-900:grid-cols-[230px_minmax(0,1fr)] tw:down-639:flex
          tw:down-639:flex-col tw:down-639:rounded-[18px]">
      {!compact && <aside className="chat-sidebar tw:[background:#eeeee7] tw:py-7.5 tw:px-6 tw:flex tw:flex-col tw:down-900:py-6 tw:down-900:px-4.5
          tw:down-639:p-3" aria-label="Salon guide shortcuts">
        <div className="chat-sidebar-intro tw:[&_>_p]:text-[13px] tw:[&_>_p]:text-[#6b6e62] tw:[&_>_p]:mb-7.5 tw:down-639:hidden
          tw:[&_>_p]:leading-[1.7]"><span className="chat-emblem tw:grid tw:place-items-center tw:w-[45px] tw:h-[45px] tw:[border:1px_solid_#c9c9b9]
          tw:rounded-[50%] tw:text-[28px] tw:mb-[23px]" aria-hidden="true">✧</span><h2>Let’s find your<br />kind of care.</h2><p>From a fresh look to a moment of calm. We’ll help you get started.</p></div>
        <p className="chat-label tw:[.chat-page_&]:text-[9px] tw:[.chat-page_&]:font-bold tw:[.chat-page_&]:tracking-[.13em]
          tw:[.chat-page_&]:text-[#77786c] tw:[.chat-page_&]:[margin:0_0_12px] tw:[.chat-visit_&]:mt-7
          tw:[.chat-visit_&]:text-[8px] tw:down-639:[.chat-sidebar_>_&]:hidden tw:down-639:[.chat-welcome_&]:text-[8px]">EXPLORE WITH US</p>
        <div className="chat-topics tw:grid tw:gap-[9px] tw:[&_button]:flex tw:[&_button]:items-center tw:[&_button]:gap-2.5
          tw:[&_button]:text-left tw:[&_button]:py-[13px] tw:[&_button]:px-2.5 tw:[&_button]:[background:#ffffff70]
          tw:[&_button]:[border:1px_solid_#ddded2] tw:[&_button]:rounded-[12px] tw:[&_button]:font-normal
          tw:[&_button:hover]:[background:white] tw:[&_button:hover]:[border-color:#b49a43] tw:[&_strong]:block
          tw:[&_strong]:text-[12px] tw:[&_strong]:mb-[3px] tw:[&_small]:block tw:[&_small]:text-[10px]
          tw:[&_small]:text-[#717366] tw:down-900:[&_small]:hidden tw:down-639:grid-cols-3 tw:down-639:gap-1.5
          tw:down-639:[&_button]:py-[9px] tw:down-639:[&_button]:px-[5px] tw:down-639:[&_button]:justify-center
          tw:down-639:[&_button]:gap-1 tw:down-639:[&_strong]:text-[10px] tw:down-639:[&_strong]:m-0
          tw:[&_small]:leading-[1.5]">{topics.map(topic => <Button variant="outline" key={topic.title} disabled={busy} onClick={() => void ask(topic.question)}><span className="chat-topic-icon tw:text-[22px] tw:w-5.5 tw:text-center tw:text-[#8b752d] tw:down-639:text-[17px]
          tw:down-639:w-[17px]" aria-hidden="true">{topic.icon}</span><span><strong>{topic.title}</strong><small>{topic.detail}</small></span></Button>)}</div>
        <div className="chat-visit tw:[border-top:1px_solid_#d9dacd] tw:mt-auto tw:pt-5.5 tw:[&_a]:flex tw:[&_a]:justify-between
          tw:[&_a]:no-underline tw:[&_a]:text-[12px] tw:[&_a]:font-semibold tw:down-639:hidden"><p className="chat-label tw:[.chat-page_&]:text-[9px] tw:[.chat-page_&]:font-bold tw:[.chat-page_&]:tracking-[.13em]
          tw:[.chat-page_&]:text-[#77786c] tw:[.chat-page_&]:[margin:0_0_12px] tw:[.chat-visit_&]:mt-7
          tw:[.chat-visit_&]:text-[8px] tw:down-639:[.chat-sidebar_>_&]:hidden tw:down-639:[.chat-welcome_&]:text-[8px]">ALREADY HAVE AN APPOINTMENT?</p><Link to="/appointment">Manage your booking </Link><p>View, reschedule, or cancel your visit.</p></div>
      </aside>}
      <div className="chat-panel tw:min-w-0 tw:flex tw:flex-col tw:h-[640px] tw:[.chat-page--compact_&]:flex-1
          tw:[.chat-page--compact_&]:h-auto tw:[.chat-page--compact_&]:min-h-0 tw:down-639:h-[clamp(460px,72dvh,640px)]">
        <div className="chat-panel-heading tw:flex tw:items-center tw:justify-between tw:gap-3 tw:py-[19px] tw:px-6.5
          tw:[border-bottom:1px_solid_#edede6] tw:[.chat-page--compact_&]:py-3 tw:[.chat-page--compact_&]:px-3.5
          tw:down-900:p-4.5 tw:down-639:p-3.5"><div className="chat-assistant-identity tw:flex tw:items-center tw:gap-[11px] tw:[&_strong]:text-[13px] tw:[&_strong]:block
          tw:[&_small]:text-[10px] tw:[&_small]:text-[#77796f] tw:[&_small]:block tw:[&_small]:mt-0.5"><span className="chat-avatar tw:w-9 tw:h-9 tw:rounded-[50%] tw:[background:#f6f0db] tw:grid tw:place-items-center tw:text-[24px]
          tw:text-[#8b7227]" aria-hidden="true">✧</span><div><strong>Clique salon guide</strong><small>AI-assisted service guidance</small></div></div><Button variant="outline" className="chat-reset tw:[.chat-page_&]:[background:transparent] tw:[.chat-page_&]:[border-color:#e5e5de]
          tw:[.chat-page_&]:py-[7px] tw:[.chat-page_&]:px-[11px] tw:[.chat-page_&]:text-[11px]
          tw:[.chat-page_&]:rounded-[8px] tw:[.chat-page_&]:whitespace-nowrap tw:down-639:text-[10px]" onClick={reset} disabled={busy || (!history.length && !pending)} aria-label="Start a new conversation"><span aria-hidden="true">＋</span> New chat</Button></div>
        <div className="chat-transcript tw:flex-1 tw:min-h-0 tw:overflow-y-auto tw:py-6 tw:px-7 tw:[.chat-page--compact_&]:p-4
          tw:down-900:p-5 tw:down-639:p-4" ref={transcript} role="log" aria-label="Conversation" aria-live="polite" tabIndex={0}>
          <div className="chat-welcome tw:text-center tw:max-w-[390px] tw:[margin:17px_auto_22px] tw:[&_h2]:text-[23px]
          tw:[&_h2]:[margin:0_0_12px] tw:[.chat-page--compact_&]:mt-1 tw:[.chat-page--compact_&_h2]:text-[21px]
          tw:down-639:mt-3 tw:down-639:[&_h2]:text-[21px]"><span className="chat-welcome-icon tw:grid tw:place-items-center tw:w-14.5 tw:h-14.5 tw:[margin:0_auto_20px] tw:rounded-[19px]
          tw:[background:#f7f3e6] tw:text-[38px] tw:text-[#a58a36] tw:[.chat-page--compact_&]:w-10.5
          tw:[.chat-page--compact_&]:h-10.5 tw:[.chat-page--compact_&]:mb-3 tw:[.chat-page--compact_&]:text-[28px]
          tw:down-639:mb-3.5" aria-hidden="true">✧</span><p className="chat-label tw:[.chat-page_&]:text-[9px] tw:[.chat-page_&]:font-bold tw:[.chat-page_&]:tracking-[.13em]
          tw:[.chat-page_&]:text-[#77786c] tw:[.chat-page_&]:[margin:0_0_12px] tw:[.chat-visit_&]:mt-7
          tw:[.chat-visit_&]:text-[8px] tw:down-639:[.chat-sidebar_>_&]:hidden tw:down-639:[.chat-welcome_&]:text-[8px]">WELCOME TO YOUR SALON GUIDE</p><h2>What can we help you with?</h2><p>Tell us what you have in mind. A new look, a specific concern, or simply some time for yourself.</p></div>
          {history.length === 0 && !pending && <div className="chat-starters tw:flex tw:justify-center tw:flex-wrap tw:gap-2 tw:[&_button]:py-[9px] tw:[&_button]:px-3
          tw:[&_button]:rounded-[20px] tw:[&_button]:[border-color:#e5e2d6] tw:[&_button]:text-[11px]
          tw:[&_button]:font-normal tw:[&_button]:[background:#fffefa] tw:[&_button:hover]:[background:#f5eed7]
          tw:[&_span]:ml-2 tw:[&_span]:text-[#8a722a]">{["Help me choose a service", "How to book", "Booking policies"].map(q => <Button variant="outline" key={q} onClick={() => void ask(q)} disabled={busy}>{q} </Button>)}</div>}
          {history.map((h, i) => <div className="chat-turn tw:mt-6" key={i}>
            <div className="chat-user-message tw:[margin:20px_0_20px_auto] tw:max-w-[85%] tw:text-right tw:[&_p]:inline-block
          tw:[&_p]:text-left tw:[&_p]:[background:#efeddf] tw:[&_p]:py-3 tw:[&_p]:px-4
          tw:[&_p]:rounded-[16px_16px_3px_16px] tw:[&_p]:m-0 tw:[&_p]:text-[13px] tw:[&_p]:whitespace-pre-wrap
          tw:[&_p]:[overflow-wrap:anywhere]"><span className="chat-message-label tw:block tw:text-[9px] tw:tracking-[.1em] tw:font-bold tw:text-[#74766b] tw:mb-2">YOU</span><p>{h.question}</p></div>
            <div key={h.reply === answerAnimation?.reply ? answerAnimation.sequence : "saved"} className={`chat-assistant-message tw:max-w-[95%] tw:text-[13px] tw:[overflow-wrap:anywhere] tw:down-639:max-w-full ${h.reply === answerAnimation?.reply ? " chat-assistant-message--entering" : ""}`}><span className="chat-message-label tw:block tw:text-[9px] tw:tracking-[.1em] tw:font-bold tw:text-[#74766b] tw:mb-2">{h.reply.mode === "gemini" ? "CLIQUE · AI-ASSISTED" : "CLIQUE · SALON GUIDE"}</span>
              <p className="chat-answer tw:mb-3.5 tw:whitespace-pre-line tw:leading-[1.7]">{h.reply === answerAnimation?.reply ? <>
                <span className="sr-only tw:absolute tw:w-[1px] tw:h-[1px] tw:overflow-hidden">{h.reply.answer}</span>
                <span aria-hidden="true">{h.reply.answer.split(/(\s+)/).map((word, index, words) => <span
                  key={index} className="chat-answer-word"
                  style={{ "--word-delay": `${index * Math.min(28, 1600 / Math.max(1, words.length - 1))}ms` } as CSSProperties}
                >{word}</span>)}</span>
              </> : h.reply.answer}</p>
              {h.reply.recommendations?.map(service => <article className="chat-recommendation tw:[border:1px_solid_#e1d8b5] tw:[background:#fffdf6] tw:rounded-[14px] tw:p-4.5
          tw:my-[15px] tw:mx-0 tw:[&_h3]:text-[18px] tw:[&_h3]:[margin:0_0_8px] tw:[&_p]:mb-2.5 tw:[&_a]:flex
          tw:[&_a]:justify-between tw:[&_a]:[border-top:1px_solid_#e9e2cb] tw:[&_a]:pt-3 tw:[&_a]:text-[12px]
          tw:[&_a]:font-semibold tw:[&_a]:no-underline" key={service.id}><p className="chat-label tw:[.chat-page_&]:text-[9px] tw:[.chat-page_&]:font-bold tw:[.chat-page_&]:tracking-[.13em]
          tw:[.chat-page_&]:text-[#77786c] tw:[.chat-page_&]:[margin:0_0_12px] tw:[.chat-visit_&]:mt-7
          tw:[.chat-visit_&]:text-[8px] tw:down-639:[.chat-sidebar_>_&]:hidden tw:down-639:[.chat-welcome_&]:text-[8px]">A LITTLE SOMETHING FOR YOU</p><h3>{service.name}</h3><p>{service.reason}</p>{service.description && <p className="chat-service-description tw:text-[#76786e] tw:text-[12px]">{service.description}</p>}<div className="chat-service-meta tw:flex tw:items-center tw:gap-3.5 tw:my-4 tw:mx-0 tw:[&_strong]:text-[18px]
          tw:[&_span]:text-[#727468] tw:[&_span]:text-[11px]"><strong>{price(service.price)}</strong><span>~ {service.durationMinutes} min</span></div><Link to={service.href}>Book this service </Link></article>)}
              {h.reply.links.length > 0 && <div className="chat-reply-links tw:flex tw:flex-wrap tw:gap-2 tw:[&_a]:py-2 tw:[&_a]:px-3 tw:[&_a]:[border:1px_solid_#e2e2d9]
          tw:[&_a]:rounded-[8px] tw:[&_a]:text-[12px] tw:[&_a]:no-underline">{h.reply.links.map(l => <Link key={l.href} to={l.href}>{l.label} </Link>)}</div>}
            </div>
          </div>)}
          {pending && <div className="chat-user-message tw:[margin:20px_0_20px_auto] tw:max-w-[85%] tw:text-right tw:[&_p]:inline-block
          tw:[&_p]:text-left tw:[&_p]:[background:#efeddf] tw:[&_p]:py-3 tw:[&_p]:px-4
          tw:[&_p]:rounded-[16px_16px_3px_16px] tw:[&_p]:m-0 tw:[&_p]:text-[13px] tw:[&_p]:whitespace-pre-wrap
          tw:[&_p]:[overflow-wrap:anywhere]"><span className="chat-message-label tw:block tw:text-[9px] tw:tracking-[.1em] tw:font-bold tw:text-[#74766b] tw:mb-2">YOU</span><p>{pending}</p></div>}
          {busy && <div className="chat-thinking tw:flex tw:items-center tw:gap-2.5 tw:text-[12px] tw:text-[#74766b] tw:py-3 tw:px-0
          tw:[&_>_span]:flex tw:[&_>_span]:gap-1 tw:[&_i]:w-[5px] tw:[&_i]:h-[5px] tw:[&_i]:[background:#b99b37]
          tw:[&_i]:rounded-[50%]" role="status"><span aria-hidden="true"><i /><i /><i /></span> Finding a little guidance…</div>}
          {error && <div className="chat-error tw:[background:#fff3ed] tw:[border:1px_solid_#e5c9bd] tw:p-3.5 tw:rounded-[12px] tw:text-[12px]
          tw:text-[#863d29] tw:[&_p]:[margin:6px_0_10px] tw:[&_button]:text-[12px] tw:[&_button]:py-[7px]
          tw:[&_button]:px-3" role="alert"><strong>We couldn’t get a reply.</strong><p>{error}</p><Button variant="outline" onClick={() => void ask(pending)} disabled={busy}>Try again</Button></div>}
        </div>
        <div className="chat-composer-area tw:[padding:16px_24px_18px] tw:[border-top:1px_solid_#edede6] tw:[background:white]
          tw:[.chat-page--compact_&]:py-3 tw:[.chat-page--compact_&]:px-3.5 tw:down-900:py-3.5 tw:down-900:px-4"><form onSubmit={submit} className="chat-composer tw:flex tw:items-end tw:gap-3 tw:[padding:10px_12px_10px_16px] tw:[border:1px_solid_#dcdcd0]
          tw:rounded-[14px] tw:[background:#fafaf7] tw:focus-within:[border-color:#a58a36]
          tw:[.chat-page_&_textarea]:flex-1 tw:[.chat-page_&_textarea]:min-w-0 tw:[.chat-page_&_textarea]:min-h-9
          tw:[.chat-page_&_textarea]:max-h-[120px] tw:[.chat-page_&_textarea]:resize-none
          tw:[.chat-page_&_textarea]:text-[13px] tw:[.chat-page_&_textarea]:[border:0]
          tw:[.chat-page_&_textarea]:rounded-none tw:[.chat-page_&_textarea]:[background:transparent]
          tw:[.chat-page_&_textarea]:text-[#292a28] tw:[.chat-page_&_textarea]:py-2 tw:[.chat-page_&_textarea]:px-0
          tw:[.chat-page_&_textarea]:[outline:none] tw:[.chat-page_&_button]:grid
          tw:[.chat-page_&_button]:place-items-center tw:[.chat-page_&_button]:[flex:0_0_36px]
          tw:[.chat-page_&_button]:w-9 tw:[.chat-page_&_button]:h-9 tw:[.chat-page_&_button]:p-0
          tw:[.chat-page_&_button]:rounded-[10px] tw:[.chat-page_&_button]:[background:#d3ae30]
          tw:[.chat-page_&_button]:text-[#282a23] tw:[.chat-page_&_button]:[border:0]
          tw:down-639:[.chat-page_&_textarea]:text-[16px] tw:[.chat-page_&_textarea]:leading-[20px]"><label className="sr-only tw:absolute tw:w-[1px] tw:h-[1px] tw:overflow-hidden" htmlFor="chat-question">Your question</label><Textarea ref={input} id="chat-question" rows={1} value={message} onChange={e => setMessage(e.target.value)} placeholder="How can we help?" required maxLength={1000} disabled={busy} aria-describedby="chat-input-hint" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!busy) void ask(message); } }} /><Button variant="outline" type="submit" aria-label="Send message" disabled={busy || !message.trim()}>Send</Button></form><div className="chat-composer-hint tw:flex tw:justify-between tw:gap-3 tw:text-[9px] tw:text-[#7d7f72] tw:[padding:8px_2px_0]
          tw:down-639:text-[8px]" id="chat-input-hint"><span>Enter to send · Shift + Enter for a new line</span><span>{message.length} / 1,000</span></div></div>
      </div>
    </div>
    <details className="chat-privacy tw:text-[11px] tw:text-[#727568] tw:mt-4.5 tw:[&_summary]:cursor-pointer
          tw:[&_summary]:w-[fit-content] tw:[&_summary]:py-[5px] tw:[&_summary]:px-0 tw:[&_p]:max-w-[850px]
          tw:[&_p]:[margin:10px_0_0] tw:[.chat-page--compact_&]:shrink-0 tw:[.chat-page--compact_&]:max-h-[25%]
          tw:[.chat-page--compact_&]:overflow-y-auto tw:[.chat-page--compact_&]:m-0 tw:[.chat-page--compact_&]:py-1.5
          tw:[.chat-page--compact_&]:px-3.5 tw:[.chat-page--compact_&]:[border-top:1px_solid_#edede6]
          tw:[.chat-page--compact_&]:text-[10px] tw:[&_p]:leading-[1.7]"><summary>About this guide & your privacy</summary><p>AI-assisted answers may ask follow-up questions before recommending a service. When AI consultation is enabled, your messages and recent conversation are sent to Google Gemini. Your conversation and unsent message are saved in this browser tab as you move between pages or refresh. Use New chat to clear them, or close this tab to end the session. Keep appointment references, guest tokens, verification codes and payment details private.</p></details>
  </section>;
}
