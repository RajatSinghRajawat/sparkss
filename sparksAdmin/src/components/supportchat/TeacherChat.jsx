import { useState, useEffect, useRef } from 'react';
import { MessagesSquare, Send, RefreshCw } from 'lucide-react';
import { endpoints, safeList } from '../../services/api';

const TeacherChat = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await endpoints.support.getTeachers();
      const list = safeList(res);
      setConversations(list);
      if (list.length > 0 && !activeConv) {
        setActiveConv(list[0]);
      }
    } catch (err) {
      console.error('Failed to load teacher conversations:', err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    setMessagesLoading(true);
    try {
      const res = await endpoints.support.getTeacherMessages(convId);
      const msgs = res.data?.data?.messages;
      setMessages(Array.isArray(msgs) ? msgs : safeList(res));
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConv?._id) {
      fetchMessages(activeConv._id);
    }
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv?._id) return;
    setSending(true);
    try {
      const res = await endpoints.support.replyTeacher(activeConv._id, newMessage.trim());
      if (res.data?.success) {
        setNewMessage('');
        fetchMessages(activeConv._id);
      }
    } catch (err) {
      alert(err.message || 'Failed to send reply to teacher');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="card animate-fade"
      style={{
        display: 'flex',
        height: 'calc(100vh - var(--navbar-height) - 56px)',
        overflow: 'hidden',
      }}
    >
      {/* Left Sidebar: Conversations Thread List */}
      <div
        style={{
          width: '340px',
          borderRight: '1px solid var(--card-border)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(10, 15, 26, 0.7)',
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Faculty Communications
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {conversations.length} faculty threads
            </span>
          </div>
          <button className="btn-icon" onClick={fetchConversations} title="Refresh threads">
            <RefreshCw size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
              Loading communications...
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
              No faculty support conversations found.
            </div>
          ) : (
            conversations.map((c) => {
              const isSelected = activeConv?._id === c._id;
              const teacherName = c.teacher?.name || 'Faculty Member';
              return (
                <div
                  key={c._id}
                  onClick={() => setActiveConv(c)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--card-border)',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.08)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #0ea5e9' : '3px solid transparent',
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        flexShrink: 0,
                      }}
                    >
                      {teacherName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {teacherName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', marginTop: '2px' }}>
                        {c.lastMessage || c.subject || 'Faculty Inquiry'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(8, 12, 20, 0.5)' }}>
        {activeConv ? (
          <>
            {/* Conversation Header */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {activeConv.teacher?.name ? activeConv.teacher.name.charAt(0).toUpperCase() : 'T'}
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {activeConv.teacher?.name || 'Faculty Member'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {activeConv.teacher?.email || 'Teacher Direct Line'}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Scroll View */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {messagesLoading ? (
                <div style={{ margin: 'auto', color: 'var(--text-dim)' }}>Loading conversation messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-dim)' }}>
                  <MessagesSquare size={32} style={{ marginBottom: '8px' }} />
                  <p>No messages yet in this faculty conversation.</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isAdmin = m.senderRole === 'admin' || m.isAdmin;
                  return (
                    <div
                      key={idx}
                      style={{
                        alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAdmin ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          padding: '12px 18px',
                          borderRadius: '16px',
                          borderBottomRightRadius: isAdmin ? '4px' : '16px',
                          borderBottomLeftRadius: !isAdmin ? '4px' : '16px',
                          backgroundColor: isAdmin ? '#0ea5e9' : 'rgba(255, 255, 255, 0.08)',
                          color: isAdmin ? '#ffffff' : 'var(--text-main)',
                          fontSize: '0.9rem',
                          fontWeight: isAdmin ? 500 : 400,
                          lineHeight: 1.45,
                        }}
                      >
                        {m.message || m.text}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px', padding: '0 4px' }}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sent'}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input Bar */}
            <form
              onSubmit={handleSend}
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--card-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
              }}
            >
              <input
                type="text"
                className="input-control"
                placeholder="Type official communication to faculty..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{ height: '44px' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sending || !newMessage.trim()}
                style={{ height: '44px', padding: '0 20px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: '#fff' }}
              >
                <Send size={16} /> Send Response
              </button>
            </form>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-dim)' }}>
            Select a faculty discussion thread on the left to review messages.
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherChat;
