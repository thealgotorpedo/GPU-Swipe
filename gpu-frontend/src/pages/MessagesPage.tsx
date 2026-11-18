import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { getSession } from "../utils/session";

type ConversationSummary = {
  id: string;
  isClosed: boolean;
  locationSet: boolean;
  agreedMeetupSuggestionId: string | null;
  listing: { id: string; title: string; priceCents: number; currency: string } | null;
  otherParticipant: { id: string; displayName: string } | null;
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
};

type MessageData = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
};

type MeetupSuggestion = {
  id: string;
  suggestedBy: string;
  acceptedBy: string | null;
  placeName: string;
  address: string;
  notes: string;
  status: "proposed" | "accepted" | "declined" | "withdrawn" | "superseded";
  createdAt: string;
};

export default function MessagesPage() {
  const { conversationId } = useParams();
  const currentUserId = getSession()?.id;
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [suggestions, setSuggestions] = useState<MeetupSuggestion[]>([]);
  const [body, setBody] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let active = true;
    if (!conversationId) {
      apiFetch<ConversationSummary[]>("api/conversations")
        .then((result) => {
          if (!active) return;
          if (result.ok) setConversations(result.data);
          else setError(result.error || "Could not load your inbox.");
        })
        .catch(() => {
          if (active) setError("Could not connect. Please try again.");
        });
      return () => { active = false; };
    }

    Promise.all([
      apiFetch<ConversationSummary>(`api/conversations/${conversationId}`),
      apiFetch<MessageData[]>(`api/conversations/${conversationId}/messages`),
      apiFetch<MeetupSuggestion[]>(`api/conversations/${conversationId}/meetups`),
    ])
      .then(([conversationResult, messageResult, meetupResult]) => {
        if (!active) return;
        if (!conversationResult.ok) {
          setError(conversationResult.error || "Could not load this conversation.");
          return;
        }
        if (!messageResult.ok || !meetupResult.ok) {
          setError(messageResult.error || meetupResult.error || "Could not load conversation details.");
          return;
        }
        setConversation(conversationResult.data);
        setMessages(messageResult.data);
        setSuggestions(meetupResult.data);
      })
      .catch(() => {
        if (active) setError("Could not connect. Please try again.");
      });
    return () => { active = false; };
  }, [conversationId, refreshVersion]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!conversationId || !body.trim() || busy || conversation?.isClosed) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<MessageData>(`api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: { body },
      });
      if (result.ok) {
        setMessages((current) => [...current, result.data]);
        setBody("");
        setNotice("");
      } else {
        setError(result.error || "Could not send message.");
      }
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function proposeMeetup(event: FormEvent) {
    event.preventDefault();
    if (!conversationId || busy || conversation?.isClosed) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<MeetupSuggestion>(`api/conversations/${conversationId}/meetups`, {
        method: "POST",
        body: { placeName, address, notes },
      });
      if (result.ok) {
        setPlaceName("");
        setAddress("");
        setNotes("");
        setNotice("Location suggested. The other participant must accept it to confirm.");
        setRefreshVersion((version) => version + 1);
      } else {
        setError(result.error || "Could not suggest this location.");
      }
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function meetupAction(suggestion: MeetupSuggestion, action: "accept" | "decline" | "withdraw") {
    if (!conversationId || busy) return;
    setBusy(true);
    setError("");
    try {
      const route = `api/conversations/${conversationId}/meetups/${suggestion.id}`;
      const result = action === "withdraw"
        ? await apiFetch<MeetupSuggestion>(route, { method: "DELETE" })
        : await apiFetch<{ suggestion: MeetupSuggestion; locationSet: boolean }>(`${route}/${action}`, { method: "POST" });
      if (result.ok) {
        setNotice(action === "accept" ? "Meetup location agreed by both participants." : "Location suggestion updated.");
        setRefreshVersion((version) => version + 1);
      } else {
        setError(result.error || "Could not update this suggestion.");
      }
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function closeConversation() {
    if (!conversationId || busy || conversation?.isClosed) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<{ isClosed: boolean }>(`api/conversations/${conversationId}/close`, { method: "PATCH" });
      if (result.ok) {
        setNotice("Conversation closed. No more messages or meetup changes can be made.");
        setRefreshVersion((version) => version + 1);
      } else {
        setError(result.error || "Could not close this conversation.");
      }
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!conversationId) {
    return (
      <section>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h2 className="h4 fw-bold text-slate-100 mb-1"><i className="bi bi-chat-dots text-emerald me-2"></i>Private Messages</h2>
            <p className="small text-muted-custom mb-0">Your conversations about marketplace listings.</p>
          </div>
        </div>
        {error && <div className="alert-custom-error mb-3" role="alert">{error}</div>}
        {!error && conversations.length === 0 ? (
          <div className="card-dark-static p-4 text-center text-muted-custom">No conversations yet. Open a listing and select Message Seller to start one.</div>
        ) : (
          <div className="d-grid gap-2">
            {conversations.map((item) => (
              <Link key={item.id} to={`/listings/messages/${item.id}`} className="card-dark-static p-3 text-decoration-none">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div className="min-w-0">
                    <strong className="text-slate-100 d-block">{item.listing?.title || "Marketplace listing"}</strong>
                    <span className="small text-muted-custom">Conversation with {item.otherParticipant?.displayName || "Marketplace user"}</span>
                    <p className="small text-slate-300 mb-0 mt-1 text-truncate">{item.lastMessage?.body || "No messages yet"}</p>
                  </div>
                  <span className={`badge ${item.isClosed ? "bg-secondary" : "bg-success"}`}>{item.isClosed ? "Closed" : "Open"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (error && (!conversation || conversation.id !== conversationId)) {
    return <div className="alert-custom-error" role="alert">{error}<div className="mt-3"><Link to="/listings/messages" className="btn btn-outline-brand btn-sm">Back to inbox</Link></div></div>;
  }
  if (!conversation || conversation.id !== conversationId) {
    return <div className="card-dark-static p-4 text-center text-muted-custom">Loading conversation…</div>;
  }

  return (
    <section>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <Link to="/listings/messages" className="small text-emerald text-decoration-none"><i className="bi bi-arrow-left me-1"></i>Inbox</Link>
          <h2 className="h4 fw-bold text-slate-100 mb-1 mt-2">{conversation.listing?.title || "Marketplace conversation"}</h2>
          <p className="small text-muted-custom mb-0">With {conversation.otherParticipant?.displayName || "Marketplace user"}</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className={`badge ${conversation.isClosed ? "bg-secondary" : "bg-success"}`}>{conversation.isClosed ? "Closed" : "Open"}</span>
          {!conversation.isClosed && <button className="btn btn-outline-danger btn-sm" type="button" disabled={busy} onClick={closeConversation}>Close discussion</button>}
        </div>
      </div>

      {error && <div className="alert-custom-error mb-3" role="alert">{error}</div>}
      {notice && <div className="alert-custom-info mb-3" role="status">{notice}</div>}

      <div className="card-dark-static p-3 p-md-4 mb-4">
        <h3 className="h6 text-uppercase text-muted-custom font-monospace mb-3">Message history</h3>
        <div className="d-grid gap-2 mb-3" aria-live="polite">
          {messages.length === 0 ? (
            <p className="small text-muted-custom mb-0">No messages yet. Send a message to begin the discussion.</p>
          ) : messages.map((message) => {
            const mine = message.senderId === currentUserId;
            return (
              <div key={message.id} className={`p-3 rounded-3 ${mine ? "ms-auto" : "me-auto"}`} style={{ maxWidth: "90%", background: mine ? "rgba(16, 185, 129, .12)" : "var(--bg-slate-950)", border: "1px solid var(--border-slate-800)" }}>
                <p className="text-slate-100 mb-1" style={{ whiteSpace: "pre-wrap" }}>{message.body}</p>
                <span className="small text-muted-custom">{mine ? "You" : conversation.otherParticipant?.displayName || "Other participant"} · {new Date(message.createdAt).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
        <form className="d-flex flex-column flex-sm-row gap-2" onSubmit={sendMessage}>
          <textarea className="form-control" rows={2} maxLength={4000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a private message…" disabled={busy || conversation.isClosed} required />
          <button className="btn btn-primary align-self-sm-end" disabled={busy || conversation.isClosed || !body.trim()} type="submit"><i className="bi bi-send me-1"></i>Send</button>
        </form>
        {conversation.isClosed && <p className="small text-muted-custom mt-2 mb-0">This discussion is closed.</p>}
      </div>

      <div className="card-dark-static p-3 p-md-4">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
          <div>
            <h3 className="h6 fw-bold text-slate-100 mb-1"><i className="bi bi-geo-alt text-emerald me-2"></i>Meetup location</h3>
            <p className="small text-muted-custom mb-0">A suggestion is confirmed only after the other participant accepts it.</p>
          </div>
          {conversation.locationSet && <span className="badge bg-success">Agreed</span>}
        </div>

        {conversation.locationSet && (
          <div className="alert alert-info py-2" role="status">
            <strong>Meetup agreed.</strong> PayPal is a payment option to discuss with the other participant. Review PayPal’s current policies before paying; this app does not process payments.
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="d-grid gap-2 mb-3">
            {suggestions.map((suggestion) => {
              const isProposer = suggestion.suggestedBy === currentUserId;
              return (
                <article key={suggestion.id} className="p-3 rounded-3" style={{ background: "var(--bg-slate-950)", border: "1px solid var(--border-slate-800)" }}>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <strong className="text-slate-100">{suggestion.placeName}</strong>
                      <p className="small text-slate-300 mb-1">{suggestion.address}</p>
                      {suggestion.notes && <p className="small text-muted-custom mb-1">{suggestion.notes}</p>}
                      <span className="small text-muted-custom">Suggested by {isProposer ? "you" : conversation.otherParticipant?.displayName || "the other participant"}</span>
                    </div>
                    <span className={`badge ${suggestion.status === "accepted" ? "bg-success" : suggestion.status === "proposed" ? "bg-warning text-dark" : "bg-secondary"}`}>{suggestion.status}</span>
                  </div>
                  {!conversation.isClosed && suggestion.status === "proposed" && (
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      {!isProposer ? (
                        <>
                          <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={() => meetupAction(suggestion, "accept")}>Accept location</button>
                          <button className="btn btn-outline-brand btn-sm" type="button" disabled={busy} onClick={() => meetupAction(suggestion, "decline")}>Decline</button>
                        </>
                      ) : (
                        <button className="btn btn-outline-brand btn-sm" type="button" disabled={busy} onClick={() => meetupAction(suggestion, "withdraw")}>Withdraw suggestion</button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!conversation.isClosed ? (
          <form onSubmit={proposeMeetup} className="row g-2">
            <div className="col-12 col-md-6">
              <label className="form-label small" htmlFor="meetupPlace">Place name</label>
              <input id="meetupPlace" className="form-control" maxLength={150} value={placeName} onChange={(event) => setPlaceName(event.target.value)} placeholder="e.g. Central Library" required />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small" htmlFor="meetupAddress">Address</label>
              <input id="meetupAddress" className="form-control" maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street address or public meeting point" required />
            </div>
            <div className="col-12">
              <label className="form-label small" htmlFor="meetupNotes">Notes (optional)</label>
              <input id="meetupNotes" className="form-control" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional meetup details" />
            </div>
            <div className="col-12 d-flex gap-2 flex-wrap">
              <button className="btn btn-outline-brand" type="submit" disabled={busy || !placeName.trim() || !address.trim()}><i className="bi bi-geo-alt me-1"></i>Suggest location</button>
              <button className="btn btn-outline-brand" type="button" onClick={() => setRefreshVersion((version) => version + 1)} disabled={busy}>Refresh thread</button>
            </div>
          </form>
        ) : <p className="small text-muted-custom mb-0">This discussion is closed; location suggestions are disabled.</p>}
      </div>
    </section>
  );
}
