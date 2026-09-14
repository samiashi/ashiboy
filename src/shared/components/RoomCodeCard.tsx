import { Suspense, lazy, useState } from 'react';
import { m } from 'motion/react';
import { popIn } from '@/anim';
import { INK, PAPER } from '@/shared/theme';

// Split the QR renderer out of the game chunks — it is only needed in the
// lobby, never on the join screen that loads first.
const QRCode = lazy(() => import('react-qr-code'));

interface Props {
  roomCode: string;
  inviteLink: string;
}

/** Room code display with QR invite and copy-to-clipboard. Self-contained. */
export function RoomCodeCard({ roomCode, inviteLink }: Props) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const copyLink = async () => {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      return;
    } catch {
      // Fall through to the legacy path (plain-LAN HTTP has no clipboard).
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = inviteLink;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (!ok) throw new Error('copy failed');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Non-secure context with no fallback — the code stays visible for typing.
      setCopyFailed(true);
      window.setTimeout(() => setCopyFailed(false), 3000);
    }
  };

  return (
    <m.div className="card card-luxe center" variants={popIn} initial="hidden" animate="show">
      <p className="eyebrow">Room code — share it with everyone</p>
      <p className="big-code" aria-label={`Room code ${roomCode}`}>
        {roomCode}
      </p>
      <div className="qr-box">
        <Suspense fallback={<div className="qr-placeholder" aria-hidden="true" />}>
          <QRCode
            value={inviteLink || 'pending'}
            size={148}
            bgColor={PAPER}
            fgColor={INK}
            aria-label={`Invite QR code for room ${roomCode}`}
          />
        </Suspense>
      </div>
      <button className="btn btn-ghost" onClick={copyLink}>
        {copied ? 'Copied to clipboard!' : 'Copy invite link'}
      </button>
      {copyFailed && (
        <p className="muted center" role="alert">
          Copy isn&apos;t available on this connection — type the 6-letter code instead.
        </p>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? 'Invite link copied to clipboard' : ''}
      </span>
    </m.div>
  );
}
