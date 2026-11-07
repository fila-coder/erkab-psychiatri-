import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { supportRepo } from '../repositories';
import { Button } from '../components/Button';

export function ContactPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSent(false);
    setSending(true);
    try {
      await supportRepo.create({
        userId: user?.uid || 'anonymous',
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        createdAt: new Date().toISOString(),
      });
      setSent(true);
      setMessage('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not send your message. Please email us directly.'
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="page container narrow prose-page">
      <p className="eyebrow">Contact</p>
      <h1>Contact us</h1>
      <p>
        Email: filimongselassie@gmail.com
        <br />
        Phone: +251 936 573 692
      </p>

      <div className="card">
        <h2>Send us a message</h2>
        <form onSubmit={(e) => void onSubmit(e)} className="form">
          <label>
            Your name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Your email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {sent && (
            <p className="success">
              Thank you — your message has been sent.
            </p>
          )}
          <Button type="submit" disabled={sending}>
            {sending ? 'Sending…' : 'Send message'}
          </Button>
        </form>
      </div>
    </main>
  );
}
